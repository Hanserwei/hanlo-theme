import { ThemeConfigStore, type ThemeConfig } from "./config";
import { PageControllerRegistry } from "./registry";
import type {
  NavigationContext,
  NavigationDirection,
  NavigationSource,
  PageControllerDefinition,
  PageLifecycleEventDetail,
} from "./types";

export const PAGE_LIFECYCLE_EVENTS = Object.freeze({
  initial: "hanlo:page:initial",
  leave: "hanlo:page:leave",
  destroy: "hanlo:page:destroy",
  enter: "hanlo:page:enter",
  error: "hanlo:page:error",
} as const);

interface PjaxEvent extends Event {
  readonly backward?: boolean;
  readonly forward?: boolean;
  readonly history?: boolean;
  readonly request?: XMLHttpRequest;
  readonly url?: string;
}

interface PjaxOptions {
  readonly backward?: boolean;
  readonly forward?: boolean;
  readonly history?: boolean;
}

export interface HanloLifecycleApi {
  readonly events: typeof PAGE_LIFECYCLE_EVENTS;
  readonly config: Readonly<ThemeConfig>;
  readonly activeControllers: readonly string[];
  register(definition: PageControllerDefinition): () => Promise<void>;
  whenIdle(): Promise<void>;
}

class PageLifecycleCoordinator {
  readonly #abortController = new AbortController();
  readonly #configStore: ThemeConfigStore;
  readonly #document: Document;
  readonly #registry: PageControllerRegistry;
  readonly #window: Window;
  #fallbackStarted = false;
  #lastIntentUrl: string | undefined;
  #mountedNavigation: Readonly<NavigationContext> | undefined;
  #navigationId = 0;
  #pendingNavigation: Readonly<NavigationContext> | undefined;
  #preparedPjaxSends = 0;
  #started = false;
  #transition: Promise<void> = Promise.resolve();

  constructor(
    registry: PageControllerRegistry,
    configStore: ThemeConfigStore,
    documentObject = document,
    windowObject = window,
  ) {
    this.#registry = registry;
    this.#configStore = configStore;
    this.#document = documentObject;
    this.#window = windowObject;
  }

  start(): void {
    if (this.#started) return;
    this.#started = true;
    const options = { signal: this.#abortController.signal };

    this.#document.addEventListener("click", this.#rememberLinkIntent, {
      ...options,
      capture: true,
    });
    this.#document.addEventListener("submit", this.#rememberFormIntent, {
      ...options,
      capture: true,
    });
    this.#document.addEventListener("pjax:send", this.#handlePjaxSend, options);
    this.#document.addEventListener("pjax:complete", this.#handlePjaxComplete, options);
    this.#document.addEventListener("pjax:error", this.#handlePjaxError, options);
    this.#window.addEventListener("pagehide", this.#handlePageHide, options);
    this.#patchPjaxLoadUrl();

    if (this.#document.readyState === "loading") {
      this.#document.addEventListener("DOMContentLoaded", this.#handleInitialLoad, {
        ...options,
        once: true,
      });
    } else {
      this.#handleInitialLoad();
    }
  }

  whenIdle(): Promise<void> {
    return this.#transition;
  }

  register(definition: PageControllerDefinition): () => Promise<void> {
    const unregister = this.#registry.register(definition);
    const enqueueContext =
      this.#mountedNavigation ??
      this.#pendingNavigation ??
      this.#createNavigation("initial", "unknown", this.#window.location.href);
    void this.#enqueue(async () => {
      const navigation = this.#mountedNavigation;
      const config = this.#currentConfig();
      if (!navigation || !config) return;
      await this.#registry.mountDefinition(
        definition.name.trim(),
        this.#pageRoot(),
        config,
        navigation,
      );
    }, enqueueContext);

    return () => this.#enqueue(unregister, this.#mountedNavigation ?? enqueueContext);
  }

  #handleInitialLoad = (): void => {
    const navigation = this.#createNavigation("initial", "unknown", this.#window.location.href);
    void this.#enqueue(async () => {
      const config = this.#configStore.refresh();
      await this.#registry.mount(this.#pageRoot(), config, navigation);
      this.#mountedNavigation = navigation;
      this.#emit(PAGE_LIFECYCLE_EVENTS.initial, { navigation, config });
    }, navigation);
  };

  #handlePjaxSend = (event: Event): void => {
    if (this.#preparedPjaxSends > 0) {
      this.#preparedPjaxSends -= 1;
      return;
    }
    const pjaxEvent = event as PjaxEvent;
    const navigation = this.#createNavigation(
      this.#sourceFromPjax(pjaxEvent),
      this.#directionFromPjax(pjaxEvent),
      pjaxEvent.url ?? this.#lastIntentUrl ?? this.#window.location.href,
    );
    this.#pendingNavigation = navigation;
    this.#mountedNavigation = undefined;
    void this.#enqueue(() => this.#leave(navigation), navigation);
  };

  #handlePjaxComplete = (event: Event): void => {
    const pjaxEvent = event as PjaxEvent;
    if (pjaxEvent.request && pjaxEvent.request.status !== 200) return;
    const navigation =
      this.#pendingNavigation ??
      this.#createNavigation(
        this.#sourceFromPjax(pjaxEvent),
        this.#directionFromPjax(pjaxEvent),
        this.#window.location.href,
      );

    void this.#enqueue(async () => {
      const config = this.#configStore.refresh();
      let mountError: unknown;
      try {
        await this.#registry.mount(this.#pageRoot(), config, navigation);
      } catch (error) {
        mountError = error;
      }
      this.#mountedNavigation = navigation;
      this.#emit(PAGE_LIFECYCLE_EVENTS.enter, { navigation, config, error: mountError });
      if (this.#pendingNavigation?.id === navigation.id) this.#pendingNavigation = undefined;
      this.#lastIntentUrl = undefined;
      if (mountError) throw mountError;
    }, navigation);
  };

  #handlePjaxError = (event: Event): void => {
    if (this.#fallbackStarted) return;
    this.#fallbackStarted = true;
    const pjaxEvent = event as PjaxEvent;
    const navigation =
      this.#pendingNavigation ??
      this.#createNavigation("pjax", "unknown", this.#window.location.href);
    const fallbackUrl =
      pjaxEvent.request?.responseURL || pjaxEvent.url || this.#lastIntentUrl || navigation.url;
    this.#emit(PAGE_LIFECYCLE_EVENTS.error, {
      navigation,
      config: this.#currentConfig(),
      error: new Error("PJAX navigation failed; falling back to a document navigation."),
    });

    const resolvedUrl = new URL(fallbackUrl, this.#window.location.href).href;
    if (resolvedUrl === this.#window.location.href) this.#window.location.reload();
    else this.#window.location.assign(resolvedUrl);
  };

  #handlePageHide = (event: PageTransitionEvent): void => {
    if (event.persisted) return;
    const navigation = this.#createNavigation("document", "unknown", this.#window.location.href);
    const detail = { navigation, config: this.#currentConfig() };
    this.#emit(PAGE_LIFECYCLE_EVENTS.leave, detail);
    void this.#registry.unmount().finally(() => {
      this.#emit(PAGE_LIFECYCLE_EVENTS.destroy, detail);
      this.#abortController.abort();
    });
  };

  #rememberLinkIntent = (event: Event): void => {
    if (!(event.target instanceof Element)) return;
    const link = event.target.closest<HTMLAnchorElement>("a[href]");
    if (link) this.#lastIntentUrl = link.href;
  };

  #rememberFormIntent = (event: Event): void => {
    if (!(event.target instanceof HTMLFormElement)) return;
    this.#lastIntentUrl = event.target.action || this.#window.location.href;
  };

  #patchPjaxLoadUrl(): void {
    const pjax = this.#window.pjax;
    if (!pjax) return;
    const loadUrl = pjax.loadUrl.bind(pjax);
    pjax.loadUrl = (url, options) => {
      const targetUrl = new URL(url, this.#window.location.href).href;
      const pjaxOptions = (options ?? {}) as PjaxOptions;
      const navigation = this.#createNavigation(
        this.#sourceFromPjax(pjaxOptions),
        this.#directionFromPjax(pjaxOptions),
        targetUrl,
      );
      this.#lastIntentUrl = targetUrl;
      this.#pendingNavigation = navigation;
      this.#mountedNavigation = undefined;

      return this.#enqueue(() => this.#leave(navigation), navigation).then(() => {
        this.#preparedPjaxSends += 1;
        return loadUrl(url, options);
      });
    };
  }

  async #leave(navigation: Readonly<NavigationContext>): Promise<void> {
    const detail = { navigation, config: this.#currentConfig() };
    this.#emit(PAGE_LIFECYCLE_EVENTS.leave, detail);
    try {
      await this.#registry.unmount();
    } finally {
      this.#emit(PAGE_LIFECYCLE_EVENTS.destroy, detail);
    }
  }

  #sourceFromPjax(event: PjaxOptions): NavigationSource {
    return event.backward || event.forward || event.history === false ? "history" : "pjax";
  }

  #directionFromPjax(event: PjaxOptions): NavigationDirection {
    if (event.backward) return "backward";
    if (event.forward) return "forward";
    return "unknown";
  }

  #createNavigation(
    source: NavigationSource,
    direction: NavigationDirection,
    url: string,
  ): Readonly<NavigationContext> {
    this.#navigationId += 1;
    return Object.freeze({ id: this.#navigationId, source, direction, url });
  }

  #pageRoot(): ParentNode {
    return this.#document.querySelector("#body-wrap") ?? this.#document;
  }

  #currentConfig(): Readonly<ThemeConfig> | undefined {
    try {
      return this.#configStore.current;
    } catch {
      return undefined;
    }
  }

  #emit(type: string, detail: PageLifecycleEventDetail): void {
    this.#document.dispatchEvent(new CustomEvent<PageLifecycleEventDetail>(type, { detail }));
  }

  #enqueue(
    operation: () => void | Promise<void>,
    navigation: Readonly<NavigationContext>,
  ): Promise<void> {
    this.#transition = this.#transition.then(operation).catch((error: unknown) => {
      console.error("[Hanlo lifecycle] Page transition failed.", error);
      this.#emit(PAGE_LIFECYCLE_EVENTS.error, {
        navigation,
        config: this.#currentConfig(),
        error,
      });
    });
    return this.#transition;
  }
}

export function installPageLifecycle(): HanloLifecycleApi {
  if (window.HanloLifecycle) return window.HanloLifecycle;

  const registry = new PageControllerRegistry();
  const configStore = new ThemeConfigStore();
  const coordinator = new PageLifecycleCoordinator(registry, configStore);
  for (const definition of window.HanloPageControllers ?? []) registry.register(definition);
  window.HanloPageControllers = [];

  const api: HanloLifecycleApi = {
    events: PAGE_LIFECYCLE_EVENTS,
    get config() {
      return configStore.current;
    },
    get activeControllers() {
      return registry.activeNames;
    },
    register(definition) {
      return coordinator.register(definition);
    },
    whenIdle() {
      return coordinator.whenIdle();
    },
  };

  window.HanloLifecycle = Object.freeze(api);
  coordinator.start();
  return window.HanloLifecycle;
}
