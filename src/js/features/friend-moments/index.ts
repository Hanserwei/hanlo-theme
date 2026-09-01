import { throttle, type ThrottledFunction } from "../../core/dom";
import type { PageResourceScope } from "../../core/resource-scope";
import type { PageControllerDefinition } from "../../core/types";
import { snackbarShow } from "../../core/ui";

export type FriendMomentsSortField = "author" | "creationTime" | "pubDate" | "title";
export type SortOrder = "asc" | "desc";

export interface FriendArticle {
  readonly id: string;
  readonly author: string;
  readonly authorUrl: string;
  readonly title: string;
  readonly description: string;
  readonly postLink: string;
  readonly logo: string;
  readonly pubDate: Date;
  readonly creationTime: Date;
  readonly content: string;
}

interface FriendPostResource {
  readonly metadata?: Readonly<{ readonly name?: unknown; readonly creationTimestamp?: unknown }>;
  readonly spec?: Readonly<Record<string, unknown>>;
}

interface FriendPostPage {
  readonly items: FriendPostResource[];
  readonly totalPages: number;
  readonly total: number;
  readonly hasNext: boolean;
  readonly hasPrevious: boolean;
  readonly first: boolean;
  readonly last: boolean;
}

export interface FriendArticleFilter {
  readonly author: string;
  readonly keyword: string;
  readonly sortField: FriendMomentsSortField;
  readonly sortOrder: SortOrder;
}

function text(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePage(value: unknown): FriendPostPage {
  if (!isRecord(value) || !Array.isArray(value["items"])) {
    throw new TypeError("朋友圈 API 返回数据格式错误。");
  }
  return {
    items: value["items"] as FriendPostResource[],
    totalPages: typeof value["totalPages"] === "number" ? value["totalPages"] : 0,
    total: typeof value["total"] === "number" ? value["total"] : 0,
    hasNext: value["hasNext"] === true,
    hasPrevious: value["hasPrevious"] === true,
    first: value["first"] === true,
    last: value["last"] === true,
  };
}

function parseArticle(resource: FriendPostResource): FriendArticle {
  const spec = resource.spec ?? {};
  const metadata = resource.metadata ?? {};
  const title = text(spec["title"]);
  const author = text(spec["author"]);
  const description = text(spec["description"]);
  return {
    id: text(metadata.name),
    author,
    authorUrl: text(spec["authorUrl"]),
    title,
    description,
    postLink: text(spec["postLink"]),
    logo: text(spec["logo"]),
    pubDate: new Date(text(spec["pubDate"])),
    creationTime: new Date(text(metadata.creationTimestamp)),
    content: `${title} ${author} ${description}`.toLowerCase(),
  };
}

export function filterFriendArticles(
  articles: readonly FriendArticle[],
  filter: FriendArticleFilter,
): FriendArticle[] {
  const filtered = articles.filter(
    (article) =>
      (!filter.author || article.author === filter.author) &&
      (!filter.keyword || article.content.includes(filter.keyword.toLowerCase())),
  );
  return filtered.sort((first, second) => {
    const firstValue =
      filter.sortField === "author" || filter.sortField === "title"
        ? first[filter.sortField].toLowerCase()
        : first[filter.sortField].getTime();
    const secondValue =
      filter.sortField === "author" || filter.sortField === "title"
        ? second[filter.sortField].toLowerCase()
        : second[filter.sortField].getTime();
    const comparison = firstValue < secondValue ? -1 : firstValue > secondValue ? 1 : 0;
    return filter.sortOrder === "asc" ? comparison : -comparison;
  });
}

function delay(milliseconds: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(resolve, milliseconds);
    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timeout);
        reject(new DOMException("The operation was aborted.", "AbortError"));
      },
      { once: true },
    );
  });
}

function setDisplay(id: string, display: string): void {
  const element = document.querySelector<HTMLElement>(`#${id}`);
  if (element) element.style.display = display;
}

class FriendMomentsController {
  readonly #config: Readonly<{ apiUrl: string; pageSize: number; errorImage: string }>;
  readonly #resources: PageResourceScope;
  #articles: FriendArticle[] = [];
  #author = "";
  #currentPage = 0;
  #hasNext = false;
  #keyword = "";
  #loading = false;
  #scrollHandler: ThrottledFunction<[]> | undefined;
  #sortField: FriendMomentsSortField = "pubDate";
  #sortOrder: SortOrder = "desc";
  #totalCount = 0;

  constructor(
    config: Readonly<{ apiUrl: string; pageSize: number; errorImage: string }>,
    resources: PageResourceScope,
  ) {
    this.#config = config;
    this.#resources = resources;
  }

  async mount(): Promise<void> {
    this.#showLoading();
    this.#bindEvents();
    try {
      await this.#loadPage(1);
      if (this.#resources.disposed) return;
      this.#updateAuthors();
      this.#updateStats();
      this.#render();
      this.#hideLoading();
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) this.#showError(error);
    }
  }

  unmount(): void {
    this.#scrollHandler?.cancel();
    this.#articles = [];
    document.querySelector("#fmomentsContainer")?.replaceChildren();
  }

  async #loadPage(page: number): Promise<void> {
    let lastError: unknown;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      try {
        const url = new URL(this.#config.apiUrl, window.location.origin);
        url.searchParams.set("page", String(page));
        url.searchParams.set("size", String(this.#config.pageSize));
        const response = await fetch(url, {
          headers: { Accept: "application/json" },
          signal: this.#resources.signal,
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        const data = parsePage(await response.json());
        const articles = data.items.map(parseArticle);
        this.#articles = page === 1 ? articles : [...this.#articles, ...articles];
        this.#currentPage = page;
        this.#totalCount = data.total || this.#articles.length;
        this.#hasNext = data.hasNext && !data.last;
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") throw error;
        lastError = error;
        if (attempt < 3) await delay(attempt * 1_000, this.#resources.signal);
      }
    }
    throw lastError;
  }

  #bindEvents(): void {
    const search = document.querySelector<HTMLInputElement>("#searchInput");
    let searchTimeout: ReturnType<typeof setTimeout> | undefined;
    if (search) {
      this.#resources.listen(search, "input", () => {
        if (searchTimeout) clearTimeout(searchTimeout);
        searchTimeout = this.#resources.timeout(() => {
          this.#keyword = search.value.toLowerCase();
          this.#render();
        }, 300);
      });
    }

    const author = document.querySelector<HTMLSelectElement>("#authorFilter");
    if (author) {
      this.#resources.listen(author, "change", () => {
        this.#author = author.value;
        this.#render();
      });
    }

    const sort = document.querySelector<HTMLSelectElement>("#sortSelect");
    if (sort) {
      this.#resources.listen(sort, "change", () => {
        const value = sort.value;
        if (["author", "creationTime", "pubDate", "title"].includes(value)) {
          this.#sortField = value as FriendMomentsSortField;
          this.#render();
        }
      });
    }

    const order = document.querySelector<HTMLElement>("#sortOrderSwitch");
    if (order) {
      this.#resources.listen(order, "click", () => {
        order.classList.toggle("active");
        this.#sortOrder = order.classList.contains("active") ? "desc" : "asc";
        this.#render();
      });
    }

    const more = document.querySelector<HTMLButtonElement>("#fmomentsMoreBtn");
    if (more) this.#resources.listen(more, "click", () => void this.#loadMore());
    const retry = document.querySelector<HTMLButtonElement>("#retryBtn");
    if (retry) {
      this.#resources.listen(retry, "click", () => {
        this.#articles = [];
        this.#currentPage = 0;
        this.#showLoading();
        void this.#loadPage(1).then(
          () => {
            this.#updateAuthors();
            this.#updateStats();
            this.#render();
            this.#hideLoading();
          },
          (error: unknown) => this.#showError(error),
        );
      });
    }

    this.#scrollHandler = throttle(() => {
      if (
        window.innerHeight + window.scrollY >= document.body.offsetHeight - 1_000 &&
        !this.#loading &&
        this.#hasNext
      ) {
        void this.#loadMore();
      }
    }, 200);
    this.#resources.listen(window, "scroll", this.#scrollHandler);
    this.#resources.defer(() => this.#scrollHandler?.cancel());
  }

  async #loadMore(): Promise<void> {
    if (this.#loading || !this.#hasNext) return;
    this.#loading = true;
    try {
      await this.#loadPage(this.#currentPage + 1);
      if (this.#resources.disposed) return;
      this.#updateAuthors();
      this.#updateStats();
      this.#render();
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        console.error("[Hanlo] Failed to load more friend moments.", error);
        snackbarShow("加载更多失败，请稍后再试");
      }
    } finally {
      this.#loading = false;
    }
  }

  #render(): void {
    const container = document.querySelector<HTMLElement>("#fmomentsContainer");
    if (!container) return;
    const articles = filterFriendArticles(this.#articles, {
      author: this.#author,
      keyword: this.#keyword,
      sortField: this.#sortField,
      sortOrder: this.#sortOrder,
    });
    container.replaceChildren(
      ...articles.map((article, index) => this.#renderArticle(article, index)),
    );
    setDisplay("emptyState", articles.length === 0 ? "block" : "none");
    const displayed = document.querySelector<HTMLElement>("#displayedCount");
    const total = document.querySelector<HTMLElement>("#totalCount");
    if (displayed) displayed.textContent = String(articles.length);
    if (total) total.textContent = String(this.#totalCount || this.#articles.length);
    const hasFilter = Boolean(this.#author || this.#keyword);
    setDisplay("filterStatus", hasFilter ? "flex" : "none");
    const filterText = document.querySelector<HTMLElement>("#filterText");
    if (filterText) {
      filterText.textContent = [
        this.#author ? `作者: ${this.#author}` : "",
        this.#keyword ? `搜索: ${this.#keyword}` : "",
      ]
        .filter(Boolean)
        .join(" | ");
    }
    setDisplay("loadingStatus", "block");
    setDisplay("fmomentsMoreBtn", this.#hasNext ? "flex" : "none");
    setDisplay("noMoreTip", this.#hasNext ? "none" : "block");
    const finalCount = document.querySelector<HTMLElement>("#finalCount");
    if (finalCount) finalCount.textContent = String(articles.length);
  }

  #renderArticle(article: FriendArticle, index: number): HTMLElement {
    const item = document.createElement("article");
    item.className = "fMomentsArticleItem";
    item.style.animationDelay = `${index * 0.1}s`;
    const header = document.createElement("div");
    header.className = "fMomentsArticleHeader";
    const avatar = document.createElement("img");
    avatar.className = "fMomentsAvatar";
    avatar.src = article.logo || this.#config.errorImage;
    avatar.alt = article.author;
    avatar.addEventListener(
      "error",
      () => {
        avatar.src = this.#config.errorImage;
      },
      { once: true },
    );
    const authorLink = this.#link(article.authorUrl, article.author);
    const info = document.createElement("div");
    info.className = "fMomentsAuthorInfo";
    const authorName = document.createElement("div");
    authorName.className = "fMomentsAuthorName";
    authorName.textContent = article.author;
    const time = document.createElement("div");
    time.className = "fMomentsPublishTime";
    time.textContent = article.pubDate.toLocaleTimeString("zh-CN", {
      hour: "2-digit",
      minute: "2-digit",
    });
    info.append(authorName, time);
    authorLink.replaceChildren(info);
    header.append(avatar, authorLink);

    const content = document.createElement("div");
    content.className = "fMomentsArticleContent";
    const title = this.#link(article.postLink, article.title);
    title.className = "fMomentsArticleTitle";
    title.title = article.title;
    const descriptionLink = this.#link(article.postLink, "");
    descriptionLink.className = "fMomentsArticleTitle";
    descriptionLink.title = article.title;
    const description = document.createElement("div");
    description.className = "fMomentsArticleDescription";
    description.textContent = article.description;
    descriptionLink.append(description);
    content.append(title, descriptionLink);

    const footer = document.createElement("div");
    footer.className = "fMomentsArticleFooter";
    const date = document.createElement("span");
    date.textContent = `📅 ${article.pubDate.toLocaleDateString("zh-CN")}`;
    const source = document.createElement("span");
    source.append("🌐 ", this.#link(article.authorUrl, article.author));
    footer.append(date, source);
    item.append(header, content, footer);
    return item;
  }

  #link(url: string, label: string): HTMLAnchorElement {
    const link = document.createElement("a");
    link.href = url || "#";
    link.target = "_blank";
    link.rel = "noopener nofollow";
    link.textContent = label;
    return link;
  }

  #updateAuthors(): void {
    const select = document.querySelector<HTMLSelectElement>("#authorFilter");
    if (!select) return;
    const current = select.value;
    select.replaceChildren();
    select.add(new Option("全部作者", ""));
    const authors = [...new Set(this.#articles.map((article) => article.author))]
      .filter(Boolean)
      .sort();
    authors.forEach((author) => select.add(new Option(author, author)));
    select.value = current;
  }

  #updateStats(): void {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const weekAgo = new Date(today.getTime() - 7 * 86_400_000);
    this.#animateNumber("totalArticles", this.#totalCount || this.#articles.length);
    this.#animateNumber(
      "totalAuthors",
      new Set(this.#articles.map((article) => article.author)).size,
    );
    this.#animateNumber(
      "todayCount",
      this.#articles.filter((article) => article.pubDate >= today).length,
    );
    this.#animateNumber(
      "weekCount",
      this.#articles.filter((article) => article.pubDate >= weekAgo).length,
    );
    const updated = document.querySelector<HTMLElement>("#lastUpdateTime");
    if (updated) updated.textContent = new Date().toLocaleString("zh-CN");
  }

  #animateNumber(id: string, value: number): void {
    const element = document.querySelector<HTMLElement>(`#${id}`);
    if (!element) return;
    const started = performance.now();
    const animate = (timestamp: number) => {
      const progress = Math.min((timestamp - started) / 1_000, 1);
      element.textContent = String(Math.floor(value * progress));
      if (progress < 1) this.#resources.animationFrame(animate);
    };
    this.#resources.animationFrame(animate);
  }

  #showLoading(): void {
    setDisplay("loadingIndicator", "block");
    setDisplay("fmomentsContainer", "none");
    setDisplay("errorState", "none");
  }

  #hideLoading(): void {
    setDisplay("loadingIndicator", "none");
    setDisplay("fmomentsContainer", "grid");
  }

  #showError(error: unknown): void {
    console.error("[Hanlo] Friend moments failed to load.", error);
    setDisplay("loadingIndicator", "none");
    setDisplay("fmomentsContainer", "none");
    setDisplay("errorState", "block");
    const message = document.querySelector<HTMLElement>("#errorMessage");
    if (message) {
      const detail = error instanceof Error ? error.message : "";
      message.textContent = detail.includes("HTTP")
        ? `服务器错误: ${detail}`
        : "加载失败，请检查网络连接后重试";
    }
  }
}

export function createFriendMomentsController(): PageControllerDefinition {
  return {
    name: "friend-moments",
    when: () => Boolean(document.querySelector("#fmomentsContainer")),
    create: ({ config, resources }) => {
      const controller = new FriendMomentsController(config.friends, resources);
      return {
        mount() {
          void controller.mount();
        },
        unmount: () => controller.unmount(),
      };
    },
  };
}
