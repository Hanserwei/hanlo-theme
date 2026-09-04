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
  restore: "hanlo:page:restore",
  error: "hanlo:page:error",
} as const);

export type DocumentLifecycleEvent = "pagehide" | "pageshow";
export type DocumentLifecycleAction = "destroy" | "preserve" | "restore" | "ignore";

export function documentLifecycleAction(
  event: DocumentLifecycleEvent,
  persisted: boolean,
): DocumentLifecycleAction {
  if (event === "pagehide") return persisted ? "preserve" : "destroy";
  return persisted ? "restore" : "ignore";
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
  #destroying = false;
  #mountedNavigation: Readonly<NavigationContext> | undefined;
  #navigationId = 0;
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

    this.#window.addEventListener("pagehide", this.#handlePageHide, options);
    this.#window.addEventListener("pageshow", this.#handlePageShow, options);

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
      let mountError: unknown;
      try {
        await this.#registry.mount(this.#pageRoot(), config, navigation);
      } catch (error) {
        mountError = error;
      }
      this.#mountedNavigation = navigation;
      this.#emit(PAGE_LIFECYCLE_EVENTS.initial, { navigation, config, error: mountError });
      if (mountError) throw mountError;
    }, navigation);
  };

  #handlePageHide = (event: PageTransitionEvent): void => {
    if (documentLifecycleAction("pagehide", event.persisted) === "preserve" || this.#destroying) {
      return;
    }
    this.#destroying = true;
    const navigation = this.#createNavigation("document", "unknown", this.#window.location.href);
    const detail = { navigation, config: this.#currentConfig() };
    this.#mountedNavigation = undefined;
    this.#emit(PAGE_LIFECYCLE_EVENTS.leave, detail);
    void this.#enqueue(async () => {
      try {
        await this.#registry.unmount();
      } finally {
        this.#emit(PAGE_LIFECYCLE_EVENTS.destroy, detail);
        this.#abortController.abort();
      }
    }, navigation);
  };

  #handlePageShow = (event: PageTransitionEvent): void => {
    if (documentLifecycleAction("pageshow", event.persisted) !== "restore") return;
    const navigation = this.#createNavigation("history", "unknown", this.#window.location.href);
    this.#mountedNavigation = navigation;
    this.#emit(PAGE_LIFECYCLE_EVENTS.restore, {
      navigation,
      config: this.#currentConfig(),
    });
  };

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
      console.error("[Hanlo lifecycle] Document lifecycle operation failed.", error);
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
