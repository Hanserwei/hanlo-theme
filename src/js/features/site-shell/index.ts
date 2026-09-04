import { copyTextToClipboard } from "../../core/clipboard";
import type { ThemeConfig } from "../../core/config";
import { differenceInDays, formatExactRelativeDate, formatRelativeDate } from "../../core/date";
import {
  changeContent,
  isHidden,
  scrollToDestination,
  throttle,
  wrapElement,
} from "../../core/dom";
import { navigateTo, openExternalUrl, resolveHttpUrl } from "../../core/navigation";
import type { PageResourceScope } from "../../core/resource-scope";
import type { ExpiringStorage } from "../../core/storage";
import type { PageControllerDefinition } from "../../core/types";
import { fadeIn, fadeOut, sidebarPaddingRight, snackbarShow, syncThemeColor } from "../../core/ui";

const LINKS_ENDPOINT = "/apis/api.plugin.halo.run/v1alpha1/plugins/PluginLinks/links?keyword=";
const SCROLL_POSTS_KEY = "hanlo-scroll-posts";

interface LinkItem {
  readonly spec: Readonly<{ readonly displayName: string; readonly url: string }>;
}

function showConsole(reward = false): void {
  const rewardGroup = document.querySelector<HTMLElement>(".console-card-group-reward");
  const mainGroup = document.querySelector<HTMLElement>(".console-card-group");
  if (rewardGroup) rewardGroup.style.display = reward ? "flex" : "none";
  if (mainGroup) mainGroup.style.display = reward ? "none" : "flex";
  document.querySelector("#console")?.classList.add("show");
}

function hideConsole(): void {
  document.querySelector("#console")?.classList.remove("show");
}

function hideLoading(): void {
  document.querySelector("#loading-box")?.classList.add("loaded");
}

function updateAsideState(storage: ExpiringStorage): void {
  const hidden = document.documentElement.classList.toggle("hide-aside");
  storage.set("aside-status", hidden ? "hide" : "show", 2);
  document.querySelector("#consoleHideAside")?.classList.toggle("on", hidden);
}

function changeGreeting(config: Readonly<ThemeConfig>): void {
  const element = document.querySelector<HTMLElement>(".author-info__sayhi");
  if (!element) return;
  const greetings =
    config.helloText && config.helloText.length > 0
      ? config.helloText
      : [
          "🤖️ 数码科技爱好者",
          "🔍 分享与热心帮助",
          "🏠 智能家居小能手",
          "🔨 设计开发一条龙",
          "🤝 专修交互与设计",
          "🏃 脚踏实地行动派",
          "🧱 团队小组发动机",
          "💢 壮汉人狠话不多",
        ];
  const previous = element.dataset["lastGreeting"];
  const candidates = greetings.filter((greeting) => greeting !== previous);
  const next = candidates[Math.floor(Math.random() * candidates.length)] ?? greetings[0];
  if (!next) return;
  element.textContent = next;
  element.dataset["lastGreeting"] = next;
}

function timeGreeting(profileStyle: string | undefined, date = new Date()): string {
  const hour = date.getHours();
  if (profileStyle === "one") {
    if (hour <= 5) return "睡个好觉，保证精力充沛";
    if (hour <= 10) return "一日之计在于晨";
    if (hour <= 14) return "吃饱了才有力气干活";
    if (hour <= 18) return "集中精力，攻克难关";
    return "不要太劳累了，早睡更健康";
  }
  if (hour <= 5) return "晚安";
  if (hour <= 10) return "早上好";
  if (hour <= 14) return "中午好";
  if (hour <= 18) return "下午好";
  return "晚上好";
}

function initializeGreeting(config: Readonly<ThemeConfig>): void {
  const element = document.querySelector<HTMLElement>(".author-info__sayhi");
  if (!element) return;
  const greeting = timeGreeting(config.profileStyle);
  element.textContent = config.profileStyle === "default" ? `${greeting}！我是` : greeting;
}

function randomItems<T>(items: readonly T[], count: number): T[] {
  const pool = [...items];
  const result: T[] = [];
  while (pool.length > 0 && result.length < count) {
    const index = Math.floor(Math.random() * pool.length);
    const [item] = pool.splice(index, 1);
    if (item !== undefined) result.push(item);
  }
  return result;
}

function isLinkItem(value: unknown): value is LinkItem {
  if (typeof value !== "object" || value === null) return false;
  const spec = (value as Record<string, unknown>)["spec"];
  if (typeof spec !== "object" || spec === null) return false;
  const candidate = spec as Record<string, unknown>;
  return typeof candidate["displayName"] === "string" && typeof candidate["url"] === "string";
}

async function getFriendLinks(storage: ExpiringStorage, signal?: AbortSignal): Promise<LinkItem[]> {
  const cached = storage.get<string>("links-data");
  if (cached) {
    try {
      const items: unknown = JSON.parse(cached);
      if (Array.isArray(items)) return items.filter(isLinkItem);
    } catch {
      // Fetch a fresh value below.
    }
  }
  const response = await fetch(LINKS_ENDPOINT, { signal });
  if (!response.ok) throw new Error(`Friend links request failed with ${response.status}.`);
  const body: unknown = await response.json();
  const items =
    typeof body === "object" &&
    body !== null &&
    Array.isArray((body as Record<string, unknown>)["items"])
      ? ((body as Record<string, unknown>)["items"] as unknown[]).filter(isLinkItem)
      : [];
  storage.set("links-data", JSON.stringify(items), 10 / (60 * 24));
  return items;
}

async function refreshFooterLinks(
  config: Readonly<ThemeConfig>,
  storage: ExpiringStorage,
  signal?: AbortSignal,
): Promise<void> {
  const container = document.querySelector<HTMLElement>("#friend-links-in-footer");
  if (!container) return;
  const button = document.querySelector<HTMLElement>("#footer-random-friends-btn");
  if (button) {
    const rotations = Number(button.dataset["rotations"] ?? "0") + 1;
    button.dataset["rotations"] = String(rotations);
    button.style.opacity = "0.2";
    button.style.transform = `rotate(${rotations * 360}deg)`;
  }
  try {
    const links = await getFriendLinks(storage, signal);
    const count = config.source.links?.linksNum ?? 5;
    container.replaceChildren();
    for (const item of randomItems(links, count)) {
      const link = document.createElement("a");
      link.className = "footer-item";
      link.href = item.spec.url;
      link.target = "_blank";
      link.rel = "noopener nofollow";
      link.textContent = item.spec.displayName;
      container.append(link);
    }
    const more = document.createElement("a");
    more.className = "footer-item";
    more.href = config.source.links?.linksUrl ?? "/links";
    more.textContent = "更多";
    container.append(more);
  } catch (error) {
    if (!(error instanceof DOMException && error.name === "AbortError")) {
      console.warn("[Hanlo] Failed to refresh footer links.", error);
    }
  } finally {
    if (button) button.style.opacity = "1";
  }
}

function randomPost(): void {
  const url = document.querySelector<HTMLElement>("#hanlo-page-data")?.dataset["randomPostUrl"];
  if (!url) return;
  navigateTo(url);
}

function goToPage(): void {
  const input = document.querySelector<HTMLInputElement>("#toPageText");
  const pages = document.querySelectorAll<HTMLElement>(".page-number");
  if (!input || pages.length === 0) return;
  const page = Number.parseInt(input.value, 10);
  const lastPage = Number.parseInt(pages.item(pages.length - 1).textContent ?? "", 10);
  if (!Number.isInteger(page) || page <= 0 || page > lastPage) return;
  const current = resolveHttpUrl(window.location.href);
  if (!current) return;
  const suffix = current.search;
  current.search = "";
  const base = current.href.replace(/\/page\/\d+\/?$/, "").replace(/\/$/, "");
  const target = `${page === 1 ? base : `${base}/page/${page}`}${suffix}`;
  if (document.querySelector(".pl-container")) sessionStorage.setItem(SCROLL_POSTS_KEY, "1");
  navigateTo(target);
}

function copyText(text: string, message: string): void {
  void copyTextToClipboard(text).then(
    (copied) => {
      if (!copied) throw new Error("Copy command failed.");
      snackbarShow(message);
    },
    () => snackbarShow("复制失败，请手动复制"),
  );
}

function showRewardMask(visible: boolean): void {
  const display = visible ? "flex" : "none";
  const reward = document.querySelector<HTMLElement>(".reward-main");
  const quit = document.querySelector<HTMLElement>("#quit-box");
  if (reward) reward.style.display = display;
  if (quit) quit.style.display = display;
}

async function showRandomFriend(storage: ExpiringStorage, signal: AbortSignal): Promise<void> {
  try {
    const [item] = randomItems(await getFriendLinks(storage, signal), 1);
    if (!item) return;
    const targetUrl = resolveHttpUrl(item.spec.url, window.location.href);
    if (!targetUrl) {
      snackbarShow("该友链地址不是有效的 HTTP(S) 链接");
      return;
    }
    snackbarShow(
      `点击前往按钮进入随机一个友链，不保证跳转网站的安全性和可用性。本次随机到的是本站友链：「${item.spec.displayName}」`,
      () => openExternalUrl(targetUrl.href),
      8_000,
      "前往",
    );
  } catch (error) {
    if (!(error instanceof DOMException && error.name === "AbortError")) {
      snackbarShow("友链获取失败，请稍后再试");
    }
  }
}

function handleAction(
  action: string,
  trigger: HTMLElement,
  config: Readonly<ThemeConfig>,
  storage: ExpiringStorage,
  resources: PageResourceScope,
  event: Event,
): void {
  switch (action) {
    case "scroll-top":
      event.preventDefault();
      scrollToDestination(0);
      break;
    case "scroll-posts":
      if (document.querySelector(".pl-container")) sessionStorage.setItem(SCROLL_POSTS_KEY, "1");
      break;
    case "random-post":
      event.preventDefault();
      randomPost();
      break;
    case "show-console":
      event.preventDefault();
      showConsole();
      break;
    case "hide-console":
      event.preventDefault();
      hideConsole();
      break;
    case "show-reward-console":
      event.preventDefault();
      showConsole(true);
      break;
    case "toggle-aside":
      event.preventDefault();
      updateAsideState(storage);
      break;
    case "change-greeting":
      event.preventDefault();
      changeGreeting(config);
      break;
    case "hide-today-card":
      event.stopPropagation();
      document.querySelector("#topGroup")?.classList.add("hideCard");
      break;
    case "hide-loading":
      hideLoading();
      break;
    case "show-reward-mask":
      showRewardMask(true);
      break;
    case "hide-reward-mask":
      showRewardMask(false);
      break;
    case "copy-page-url":
      copyText(window.location.href, "复制本页链接地址成功");
      break;
    case "copy-text":
      copyText(trigger.dataset["copyText"] ?? "", "已复制装备名称");
      break;
    case "random-margin":
      trigger.style.marginLeft = `${Math.floor(Math.random() * 901) + 100}px`;
      break;
    case "refresh-footer-links":
      event.preventDefault();
      void refreshFooterLinks(config, storage, resources.signal);
      break;
    case "random-friend":
      event.preventDefault();
      void showRandomFriend(storage, resources.signal);
      break;
    case "open-search":
      event.preventDefault();
      window.SearchWidget?.open();
      break;
    case "open-link-submit":
      event.preventDefault();
      window.LinkSubmitWidget?.open();
      break;
    case "go-to-page":
      event.preventDefault();
      goToPage();
      break;
    default:
  }
}

function initializeHeader(resources: PageResourceScope): void {
  const nav = document.querySelector<HTMLElement>("#nav");
  const siteName = document.querySelector<HTMLElement>("#site-name");
  const menus = document.querySelector<HTMLElement>("#menus .menus_items");
  const search = document.querySelector<HTMLElement>("#search-button");
  const adjust = () => {
    if (!nav) return;
    const hide =
      window.innerWidth < 768 ||
      (siteName?.offsetWidth ?? 0) + (menus?.offsetWidth ?? 0) + (search?.offsetWidth ?? 0) >
        nav.offsetWidth - 120;
    nav.classList.toggle("hide-menu", hide);
  };
  adjust();
  nav?.classList.add("show");
  resources.listen(window, "resize", adjust);
  resources.listen(window, "orientationchange", () => resources.timeout(adjust, 100));
}

function initializeNavigation(
  config: Readonly<ThemeConfig>,
  storage: ExpiringStorage,
  resources: PageResourceScope,
): void {
  const body = document.body;
  const sidebar = document.querySelector<HTMLElement>("#sidebar-menus");
  const mask = document.querySelector<HTMLElement>("#menu-mask");

  document.querySelectorAll<HTMLAnchorElement>("[data-hanlo-login-link]").forEach((link) => {
    const loginUrl = resolveHttpUrl(link.href);
    if (!loginUrl || loginUrl.origin !== window.location.origin) return;
    loginUrl.searchParams.set("redirect_uri", window.location.href);
    link.href = loginUrl.href;
  });

  const closeSidebar = () => {
    body.style.overflow = "";
    body.style.paddingRight = "";
    if (mask) fadeOut(mask, 0.5);
    sidebar?.classList.remove("open");
  };
  resources.defer(closeSidebar);

  resources.listen(document, "click", (event) => {
    if (!(event.target instanceof Element)) return;
    const target = event.target.closest<HTMLElement>("[data-hanlo-action]");
    const action = target?.dataset["hanloAction"];
    if (target && action) handleAction(action, target, config, storage, resources, event);

    if (event.target.closest("#toggle-menu")) {
      sidebarPaddingRight();
      body.style.overflow = "hidden";
      if (mask) fadeIn(mask, 0.5);
      sidebar?.classList.add("open");
    } else if (event.target.closest("#menu-mask")) {
      closeSidebar();
    }

    const expand = event.target.closest<HTMLElement>("#sidebar-menus .expand");
    if (expand) {
      expand.classList.toggle("hide");
      const child = expand.parentElement?.nextElementSibling as HTMLElement | null;
      if (child) child.style.display = isHidden(child) ? "block" : "none";
    }

    const hideButton = event.target.closest<HTMLElement>("#article-container .hide-button");
    if (hideButton) {
      hideButton.classList.toggle("open");
      const content = hideButton.nextElementSibling;
      if (content && hideButton.classList.contains("open")) revealGalleries(content);
    }

    const tabButton = event.target.closest<HTMLButtonElement>("#article-container .tab > button");
    if (tabButton) activateTab(tabButton);

    const tabTop = event.target.closest<HTMLElement>("#article-container .tabs .tab-to-top");
    if (tabTop) {
      const tabs = tabTop.closest<HTMLElement>(".tabs");
      if (tabs) scrollToDestination(tabs.getBoundingClientRect().top + window.scrollY);
    }

    const category = event.target.closest<HTMLElement>(
      "#aside-cat-list .card-category-list-item.parent i",
    );
    if (category) {
      event.preventDefault();
      category.classList.toggle("expand");
      const children = category.parentElement?.nextElementSibling as HTMLElement | null;
      if (children) children.style.display = isHidden(children) ? "block" : "none";
    }

    const rightsideTarget = event.target.closest<HTMLElement>("#rightside [id]")?.id;
    if (rightsideTarget === "go-up") scrollToDestination(0);
    if (rightsideTarget === "rightside-config") {
      document.querySelector("#rightside-config-hide")?.classList.toggle("show");
    }
    if (rightsideTarget === "readmode") enterReadMode(resources);
    if (rightsideTarget === "hide-aside-btn") updateAsideState(storage);
    if (rightsideTarget === "mobile-toc-button") toggleMobileToc(event.target as HTMLElement);
  });

  resources.listen(document, "keydown", (event) => {
    const keyboardEvent = event as KeyboardEvent;
    if (
      keyboardEvent.key === "Enter" &&
      keyboardEvent.target instanceof HTMLInputElement &&
      keyboardEvent.target.id === "toPageText"
    ) {
      keyboardEvent.preventDefault();
      goToPage();
    }
  });
  resources.listen(document, "input", (event) => {
    if (!(event.target instanceof HTMLInputElement) || event.target.id !== "toPageText") return;
    const pages = document.querySelectorAll<HTMLElement>(".page-number");
    const maximum = Number.parseInt(pages.item(pages.length - 1)?.textContent ?? "", 10);
    const requested = Number.parseInt(event.target.value, 10);
    if (Number.isFinite(maximum) && requested > maximum) event.target.value = String(maximum);
    document
      .querySelector("#toPageButton")
      ?.classList.toggle("haveValue", event.target.value !== "");
  });

  resources.listen(document, "touchstart", () => {
    if (document.querySelector<HTMLElement>(".reward-main")?.style.display === "flex") {
      showRewardMask(false);
    }
  });

  resources.listen(window, "resize", () => {
    if (window.innerWidth >= 768 && sidebar?.classList.contains("open")) closeSidebar();
  });
  resources.listen(window, "touchmove", () => {
    document.querySelectorAll<HTMLElement>("#nav .menus_item_child").forEach((menu) => {
      if (!isHidden(menu)) menu.style.display = "none";
    });
  });
}

function activateTab(button: HTMLButtonElement): void {
  const tab = button.parentElement;
  const content = tab?.parentElement?.nextElementSibling;
  const id = button.dataset["href"]?.replace("#", "");
  if (!tab || !content || !id || tab.classList.contains("active")) return;
  tab.parentElement?.querySelector(".active")?.classList.remove("active");
  tab.classList.add("active");
  Array.from(content.children).forEach((child) =>
    child.classList.toggle("active", child.id === id),
  );
  const active = content.querySelector<HTMLElement>(`#${CSS.escape(id)}`);
  if (active) revealGalleries(active);
}

function revealGalleries(root: ParentNode): void {
  root.querySelectorAll<HTMLElement>(".gallery").forEach((gallery) => {
    gallery.classList.add("hanlo-native-gallery");
    gallery.style.opacity = "1";
  });
  root.querySelector(".loadings")?.classList.remove("loadings");
}

function enterReadMode(resources: PageResourceScope): void {
  if (document.body.classList.contains("read-mode")) return;
  document.body.classList.add("read-mode");
  const exit = document.createElement("button");
  exit.type = "button";
  exit.className = "haofont hao-icon-sign-out-alt exit-readmode";
  document.body.append(exit);
  resources.listen(exit, "click", () => {
    document.body.classList.remove("read-mode");
    exit.remove();
  });
  resources.defer(() => {
    document.body.classList.remove("read-mode");
    exit.remove();
  });
}

function toggleMobileToc(trigger: HTMLElement): void {
  const toc = document.querySelector<HTMLElement>("#card-toc");
  if (!toc) return;
  toc.style.transformOrigin = `right ${trigger.getBoundingClientRect().top + 17}px`;
  toc.style.transition = "transform 0.3s ease-in-out";
  toc.classList.toggle("open");
  toc.addEventListener(
    "transitionend",
    () => {
      toc.style.transition = "";
      toc.style.transformOrigin = "";
    },
    { once: true },
  );
}

function initializeScroll(resources: PageResourceScope): void {
  let previousTop = window.scrollY;
  const update = throttle(() => {
    const top = window.scrollY;
    const header = document.querySelector<HTMLElement>("#page-header");
    const rightside = document.querySelector<HTMLElement>("#rightside");
    if (header) {
      header.classList.toggle("nav-fixed", top > 0);
      header.classList.toggle("nav-visible", top > 0 && top <= previousTop);
    }
    document.querySelector("#cookies-window")?.classList.toggle("cw-hide", top > 0);
    if (rightside) {
      rightside.style.cssText =
        top > 0 || document.body.scrollHeight <= window.innerHeight
          ? "opacity: 0.8; transform: translateX(-58px)"
          : "";
    }
    const total = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    const percentage = Math.round((top / total) * 100);
    const percent = document.querySelector<HTMLElement>("#percent");
    const destination = document.querySelector<HTMLElement>("#post-comment, #footer");
    const nearEnd =
      percentage > 90 ||
      Boolean(
        destination &&
        destination.offsetTop + destination.offsetHeight / 2 < top + window.innerHeight,
      );
    document.querySelector("#nav-totop")?.classList.toggle("long", nearEnd);
    if (percent) percent.textContent = nearEnd ? "返回顶部" : String(Math.max(0, percentage));
    document.querySelectorAll(".needEndHide").forEach((element) => {
      element.classList.toggle("hide", total - top < 100);
    });
    previousTop = top;
    syncThemeColor();
  }, 200);
  update();
  resources.listen(window, "scroll", update);
  resources.defer(() => update.cancel());
}

async function initializeContent(
  config: Readonly<ThemeConfig>,
  resources: PageResourceScope,
): Promise<void> {
  const runtime = document.querySelector<HTMLElement>("#runtimeshow");
  if (runtime?.textContent)
    runtime.textContent = `${Math.max(0, differenceInDays(runtime.textContent))}天`;

  const lastPush = document.querySelector<HTMLElement>("#last-push-date");
  const lastPushDate =
    lastPush?.dataset["lastpushdate"] ?? lastPush?.getAttribute("data-lastPushDate");
  if (lastPush && lastPushDate) {
    lastPush.textContent = formatRelativeDate(lastPushDate, config.date_suffix);
  }
  document.querySelectorAll<HTMLTimeElement>(".aside-list time[datetime]").forEach((time) => {
    time.textContent = formatExactRelativeDate(time.dateTime, config.date_suffix);
  });

  document
    .querySelectorAll<HTMLElement>(
      "#article-container :not(.highlight) > table, #article-container > table",
    )
    .forEach((table) => {
      if (!table.parentElement?.classList.contains("table-wrap"))
        wrapElement(table, "div", "table-wrap");
    });

  if (config.copyright) {
    resources.listen(document.body, "copy", (event) => {
      const selection = window.getSelection()?.toString() ?? "";
      if (selection.length <= config.copyright!.limitCount) return;
      event.preventDefault();
      const languages = config.copyright!.languages;
      const text = `${selection}\n\n\n${languages.author}\n${languages.link}${window.location.href}\n${languages.source}\n${languages.info}`;
      (event as ClipboardEvent).clipboardData?.setData("text/plain", text);
    });
  }

  const mounts = [
    initializeToc(resources),
    initializeGalleries(resources),
    initializeQrCode(resources),
    initializeIndexEssay(resources),
    initializeCoverColor(config, resources),
  ];
  initializeLazyLoad(config, resources);
  initializeWaterfall(resources);
  await Promise.all(mounts);
}

async function initializeToc(resources: PageResourceScope): Promise<void> {
  const content = document.querySelector<HTMLElement>(".post-content");
  const toc = document.querySelector<HTMLElement>("#card-toc .toc-content");
  if (!content || !toc) return;
  const titles = content.querySelectorAll("h1,h2,h3,h4,h5,h6");
  if (titles.length === 0) {
    document.querySelector("#card-toc")?.remove();
    const button = document.querySelector<HTMLElement>("#mobile-toc-button");
    if (button) button.style.display = "none";
    return;
  }
  const [{ default: tocbot }] = await Promise.all([
    import("tocbot"),
    import("tocbot/dist/tocbot.css"),
  ]);
  if (resources.disposed) return;
  tocbot.init({
    tocSelector: ".toc-content",
    contentSelector: ".post-content",
    headingSelector: "h1,h2,h3,h4,h5,h6",
    listItemClass: "toc-item",
    activeLinkClass: "active",
    activeListItemClass: "active",
    headingsOffset: -400,
    scrollSmooth: true,
    scrollSmoothOffset: -70,
    tocScrollOffset: 50,
  });
  resources.defer(() => tocbot.destroy());
  resources.listen(toc, "click", () => {
    if (window.innerWidth < 900) document.querySelector("#card-toc")?.classList.remove("open");
  });
}

function initializeLazyLoad(config: Readonly<ThemeConfig>, resources: PageResourceScope): void {
  const images = Array.from(document.querySelectorAll<HTMLImageElement>("img[data-lazy-src]"));
  if (!config.lazyload.enable || images.length === 0) return;
  const load = (image: HTMLImageElement): void => {
    const source = image.dataset["lazySrc"];
    if (!source) return;
    image.src = source;
    image.removeAttribute("data-lazy-src");
    image.loading = "lazy";
    image.addEventListener(
      "error",
      () => {
        image.src = config.lazyload.error;
        image.removeAttribute("srcset");
      },
      { once: true },
    );
  };
  if (!("IntersectionObserver" in window)) {
    images.forEach(load);
    return;
  }
  const observer = resources.observe(
    new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const image = entry.target as HTMLImageElement;
          observer.unobserve(image);
          load(image);
        }
      },
      { rootMargin: "160px" },
    ),
  );
  images.forEach((image) => observer.observe(image));
}

async function initializeGalleries(resources: PageResourceScope): Promise<void> {
  if (
    !document.querySelector(
      "#article-container .gallery, #article-container img, .bber-container-img img",
    )
  )
    return;
  const { mountNativeGallery } = await import("../gallery");
  if (!resources.disposed) mountNativeGallery(resources);
}

async function initializeQrCode(resources: PageResourceScope): Promise<void> {
  const element = document.querySelector<HTMLElement>("#qrcode");
  if (!element) return;
  const { toCanvas } = await import("qrcode");
  if (resources.disposed) return;
  element.replaceChildren();
  const canvas = document.createElement("canvas");
  element.append(canvas);
  await toCanvas(canvas, window.location.href, {
    width: 250,
    errorCorrectionLevel: "H",
    color: { dark: "#000000", light: "#ffffff" },
  });
}

async function initializeIndexEssay(resources: PageResourceScope): Promise<void> {
  if (!document.querySelector(".hanlo-moment-track")) return;
  document.querySelectorAll<HTMLElement>(".swiper-wrapper .swiper-slide").forEach((slide) => {
    slide.textContent = changeContent(slide.textContent ?? "");
  });
  const [{ default: Swiper }, { Autoplay }] = await Promise.all([
    import("swiper"),
    import("swiper/modules"),
    import("swiper/css"),
  ]);
  if (resources.disposed) return;
  const swiper = new Swiper(".swiper-container", {
    modules: [Autoplay],
    direction: "vertical",
    loop: true,
    autoplay: { delay: 3_000, pauseOnMouseEnter: true },
  });
  resources.track(swiper, (value) => {
    value.destroy(true, true);
  });
}

function initializeWaterfall(resources: PageResourceScope): void {
  const waterfall = document.querySelector<HTMLElement>("#waterfall");
  if (!waterfall) return;
  const items = Array.from(waterfall.children).filter(
    (item): item is HTMLElement => item instanceof HTMLElement,
  );
  if (items.length === 0) return;

  let scheduled = false;
  const layout = (): void => {
    scheduled = false;
    const firstItem = items[0]!;
    const firstStyle = window.getComputedStyle(firstItem);
    const width = Number.parseFloat(firstStyle.width) || firstItem.offsetWidth;
    const marginLeft = Number.parseFloat(firstStyle.marginLeft) || 0;
    const marginRight = Number.parseFloat(firstStyle.marginRight) || 0;
    const stride = width + marginLeft + marginRight;
    const columns = Math.max(
      1,
      Math.min(items.length, Math.floor((waterfall.clientWidth + marginRight) / stride)),
    );
    const heights = Array.from({ length: columns }, () => 0);
    for (const item of items) {
      const column = heights.indexOf(Math.min(...heights));
      const style = window.getComputedStyle(item);
      const marginTop = Number.parseFloat(style.marginTop) || 0;
      const marginBottom = Number.parseFloat(style.marginBottom) || 0;
      const top = heights[column]! + marginTop;
      item.style.position = "absolute";
      item.style.removeProperty("width");
      item.style.left = `${column * stride + marginLeft}px`;
      item.style.top = `${top}px`;
      heights[column] = top + item.offsetHeight + marginBottom;
    }
    waterfall.style.position = "relative";
    waterfall.style.height = `${Math.max(...heights)}px`;
    waterfall.classList.add("show");
  };
  const schedule = (): void => {
    if (scheduled || resources.disposed) return;
    scheduled = true;
    resources.animationFrame(layout);
  };

  for (const image of Array.from(waterfall.querySelectorAll<HTMLImageElement>("img"))) {
    if (!image.complete) {
      resources.listen(image, "load", schedule);
      resources.listen(image, "error", schedule);
    }
  }
  if ("ResizeObserver" in window) {
    const observer = resources.observe(new ResizeObserver(schedule));
    observer.observe(waterfall);
    items.forEach((item) => observer.observe(item));
  } else {
    resources.listen(window, "resize", schedule);
  }
  resources.defer(() => {
    waterfall.classList.remove("show");
    waterfall.style.removeProperty("height");
    waterfall.style.removeProperty("position");
    items.forEach((item) => {
      item.style.removeProperty("left");
      item.style.removeProperty("position");
      item.style.removeProperty("top");
      item.style.removeProperty("width");
    });
  });
  layout();
}

async function initializeCoverColor(
  config: Readonly<ThemeConfig>,
  resources: PageResourceScope,
): Promise<void> {
  const rootStyle = document.documentElement.style;
  const reset = () => {
    rootStyle.setProperty("--heo-main", "var(--heo-theme)");
    rootStyle.setProperty("--heo-main-op", "var(--heo-theme-op)");
    rootStyle.setProperty("--heo-main-op-deep", "var(--heo-theme-op-deep)");
    rootStyle.setProperty("--heo-main-none", "var(--heo-theme-none)");
  };
  if (!config.source.post?.dynamicBackground) {
    reset();
    return;
  }
  const source = document.querySelector<HTMLImageElement>("#post-cover")?.src;
  if (!source) {
    reset();
    return;
  }
  const { FastAverageColor } = await import("fast-average-color");
  if (resources.disposed) return;
  const colorReader = resources.track(new FastAverageColor(), (value) => value.destroy());
  void colorReader
    .getColorAsync(source, { ignoredColor: [255, 255, 255, 255] })
    .then(({ hex }) => {
      if (resources.disposed) return;
      const color = contrastIsLight(hex) ? adjustHexColor(hex, -40) : hex;
      rootStyle.setProperty("--heo-main", color);
      rootStyle.setProperty("--heo-main-op", `${color}23`);
      rootStyle.setProperty("--heo-main-op-deep", `${color}dd`);
      rootStyle.setProperty("--heo-main-none", `${color}00`);
      document.querySelector("#coverdiv")?.classList.add("loaded");
      syncThemeColor();
    })
    .catch((error: unknown) => console.warn("[Hanlo] Failed to read the post cover color.", error));
}

function contrastIsLight(hex: string): boolean {
  const normalized = hex.replace("#", "");
  if (!/^[\da-f]{6}$/i.test(normalized)) return false;
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);
  return (red * 299 + green * 587 + blue * 114) / 255_000 >= 0.5;
}

function adjustHexColor(hex: string, amount: number): string {
  const value = Number.parseInt(hex.replace("#", ""), 16);
  const red = Math.max(0, Math.min(255, (value >> 16) + amount));
  const green = Math.max(0, Math.min(255, ((value >> 8) & 0xff) + amount));
  const blue = Math.max(0, Math.min(255, (value & 0xff) + amount));
  return `#${((red << 16) | (green << 8) | blue).toString(16).padStart(6, "0")}`;
}

function initializePageState(
  config: Readonly<ThemeConfig>,
  storage: ExpiringStorage,
  resources: PageResourceScope,
): void {
  document.body.dataset["type"] = config.htmlType;
  const home = window.location.pathname === "/";
  document.querySelectorAll<HTMLElement>(".only-home").forEach((element) => {
    element.style.display = home ? "flex" : "none";
  });
  if (/\/page\//.test(window.location.href)) {
    for (const id of ["recent-top-post-group", "bbTimeList", "climb"]) {
      document.querySelector(`#${id}`)?.classList.add("more-page");
    }
  }
  initializeGreeting(config);
  initializeActiveNavigation();
  initializeWheelScrolling(resources);
  hideLoading();
  document
    .querySelector("#consoleHideAside")
    ?.classList.toggle("on", document.documentElement.classList.contains("hide-aside"));
  if (config.isFriendLinksInFooter) void refreshFooterLinks(config, storage, resources.signal);
  if (sessionStorage.getItem(SCROLL_POSTS_KEY) === "1") {
    sessionStorage.removeItem(SCROLL_POSTS_KEY);
    if (document.querySelector(".pl-container")) {
      resources.timeout(() => scrollToDestination(window.innerHeight), 1_000);
    }
  }
}

function initializeActiveNavigation(): void {
  const path = decodeURIComponent(window.location.pathname);
  document.querySelector("#category-bar")?.querySelector(".select")?.classList.remove("select");
  if (path === "/") document.querySelector("#category-bar-home")?.classList.add("select");
  const category = path.match(/^\/categories\/([^/]+)/)?.[1];
  if (category) document.getElementById(category)?.classList.add("select");
  const tag = path.match(/^\/tags\/([^/]+)/)?.[1];
  if (tag) document.getElementById(tag)?.classList.add("select");
}

function initializeWheelScrolling(resources: PageResourceScope): void {
  for (const selector of ["#recent-post-top", "#category-bar-items"]) {
    const element = document.querySelector<HTMLElement>(selector);
    if (!element) continue;
    resources.listen(element, "wheel", (event) => {
      const wheel = event as WheelEvent;
      element.scrollLeft += wheel.deltaY / 2;
      if (selector === "#category-bar-items" || document.body.clientWidth < 1300) {
        wheel.preventDefault();
      }
    });
  }
}

export function createSiteShellController(storage: ExpiringStorage): PageControllerDefinition {
  return {
    name: "site-shell",
    create: ({ config, resources }) => ({
      async mount() {
        initializeHeader(resources);
        initializeNavigation(config, storage, resources);
        initializeScroll(resources);
        await initializeContent(config, resources);
        initializePageState(config, storage, resources);
      },
      unmount() {
        document.body.style.overflow = "";
        document.body.style.paddingRight = "";
        document.body.classList.remove("read-mode");
      },
    }),
  };
}

export const siteShellTestables = Object.freeze({
  adjustHexColor,
  contrastIsLight,
  randomItems,
  timeGreeting,
});
