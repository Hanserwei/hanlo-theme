import { readFileSync } from "node:fs";

import { parseHTML } from "linkedom";
import { afterEach, describe, expect, it, vi, type Mock } from "vitest";

import { PageResourceScope } from "../../src/js/core/resource-scope";
import type { PageControllerContext } from "../../src/js/core/types";
import {
  createFriendMomentsController,
  filterFriendArticles,
  type FriendArticle,
} from "../../src/js/features/friend-moments";

function article(author: string, title: string, day: number): FriendArticle {
  return {
    id: title,
    author,
    authorUrl: "",
    title,
    description: "",
    postLink: "",
    logo: "",
    pubDate: new Date(2026, 0, day),
    creationTime: new Date(2026, 0, day),
    content: `${author} ${title}`.toLowerCase(),
  };
}

describe("friend moments filtering", () => {
  const articles = [article("Beta", "Second", 2), article("Alpha", "First", 1)];

  it("filters by author and keyword", () => {
    expect(
      filterFriendArticles(articles, {
        author: "Alpha",
        keyword: "first",
        sortField: "pubDate",
        sortOrder: "desc",
      }).map((item) => item.title),
    ).toEqual(["First"]);
  });

  it("sorts date and text fields deterministically", () => {
    expect(
      filterFriendArticles(articles, {
        author: "",
        keyword: "",
        sortField: "author",
        sortOrder: "asc",
      }).map((item) => item.author),
    ).toEqual(["Alpha", "Beta"]);
  });
});

interface PageResponse {
  ok: boolean;
  json: () => Promise<{ items: object[]; hasNext: boolean; last: boolean; total: number }>;
}

function page(items: object[], hasNext: boolean, total = 5): PageResponse {
  return { ok: true, json: async () => ({ items, hasNext, last: !hasNext, total }) };
}

function post(title: string, author = "Alice", urls = {}) {
  return {
    metadata: { name: title, creationTimestamp: "2026-01-01" },
    spec: {
      title,
      author,
      pubDate: "2026-01-01",
      ...urls,
    },
  };
}

function fixture(fetchMock: Mock) {
  const { document, window } = parseHTML(readFileSync("src/friends.html", "utf8"));
  vi.stubGlobal("location", new URL("https://example.com/friends"));
  const select = document.querySelector("#authorFilter")!;
  let selected = "";
  Object.defineProperty(select, "value", {
    get: () => selected,
    set: (value) => {
      selected = value;
    },
  });
  Object.assign(select, { add: (option: Element) => select.append(option) });
  vi.stubGlobal("window", window);
  vi.stubGlobal("document", document);
  vi.stubGlobal("HTMLAnchorElement", window.HTMLAnchorElement);
  vi.stubGlobal("Option", function (label: string, value: string) {
    const option = document.createElement("option");
    option.textContent = label;
    option.value = value;
    return option;
  });
  vi.stubGlobal("fetch", fetchMock);
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) =>
    setTimeout(() => callback(performance.now() + 1_000), 0),
  );
  vi.stubGlobal("cancelAnimationFrame", clearTimeout);
  const resources = new PageResourceScope();
  const controller = createFriendMomentsController().create({
    config: { friends: { apiUrl: "/api/friends", pageSize: 1, errorImage: "/error.png" } },
    resources,
  } as PageControllerContext);
  void controller.mount(document as unknown as ParentNode);
  return { document, window, resources, controller };
}

async function flush() {
  for (let i = 0; i < 8; i += 1) await Promise.resolve();
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("friend moments controller", () => {
  it("labels loaded statistics and keeps more pages available after an empty search", async () => {
    vi.useFakeTimers();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(page([post("First")], true))
      .mockResolvedValueOnce(page([post("Wanted", "Bob")], false));
    const { document, window, resources } = fixture(fetchMock);
    await flush();
    await vi.advanceTimersByTimeAsync(0);
    expect(document.querySelector("#totalArticles")?.textContent).toBe("5");
    expect(document.querySelector("#totalCount")?.textContent).toBe("1");
    expect(document.querySelector("#totalAuthors")?.parentElement?.textContent).toContain(
      "已加载的活跃作者",
    );
    expect(document.querySelector("#todayCount")?.parentElement?.textContent).toContain(
      "已加载的今日更新",
    );
    expect(document.querySelector("#weekCount")?.parentElement?.textContent).toContain(
      "已加载的本周更新",
    );
    expect(document.querySelector("#sortSelect")?.getAttribute("aria-label")).toContain("已加载");
    expect(document.querySelector("#authorFilter option")?.textContent).toContain("已加载");
    const search = document.querySelector<HTMLInputElement>("#searchInput")!;
    search.value = "wanted";
    search.dispatchEvent(new window.Event("input"));
    await vi.advanceTimersByTimeAsync(300);
    expect(document.querySelector("#emptyHint")?.textContent).toContain("继续加载更多");
    expect(document.querySelector<HTMLElement>("#fmomentsMoreBtn")?.style.display).toBe("flex");
    document.querySelector<HTMLElement>("#fmomentsMoreBtn")!.click();
    await flush();
    expect(document.querySelector("#displayedCount")?.textContent).toBe("1");
    expect(document.querySelector("#totalCount")?.textContent).toBe("2");
    expect(document.querySelector("#fmomentsContainer")?.textContent).toContain("Wanted");
    await resources.dispose();
  });

  it("renders unsafe API URLs as text and accepts HTTP links", async () => {
    vi.useFakeTimers();
    const fetchMock = vi.fn().mockResolvedValue(
      page(
        [
          post("Unsafe", "Alice", {
            postLink: "javascript:alert(1)",
            authorUrl: "data:text/html,test",
            logo: "javascript:alert(1)",
          }),
          post("Safe", "Bob", { postLink: "https://example.org/post", authorUrl: "/author" }),
        ],
        false,
      ),
    );
    const { document, resources } = fixture(fetchMock);
    await flush();
    const articles = document.querySelectorAll("#fmomentsContainer article");
    expect(articles[0]!.querySelectorAll("a")).toHaveLength(0);
    expect(articles[0]!.textContent).toContain("Unsafe");
    expect(articles[0]!.querySelector("img")?.getAttribute("src")).toBe("/error.png");
    expect(articles[1]!.querySelector('a[href="https://example.org/post"]')).not.toBeNull();
    await resources.dispose();
  });

  it("starts only one request when retry is clicked repeatedly", async () => {
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { promise, resolve } = Promise.withResolvers<PageResponse>();
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("offline"))
      .mockRejectedValueOnce(new Error("offline"))
      .mockRejectedValueOnce(new Error("offline"))
      .mockReturnValueOnce(promise);
    const { document, resources } = fixture(fetchMock);
    await flush();
    await vi.advanceTimersByTimeAsync(3_000);
    document.querySelector<HTMLElement>("#retryBtn")!.click();
    document.querySelector<HTMLElement>("#retryBtn")!.click();
    expect(fetchMock).toHaveBeenCalledTimes(4);
    resolve(page([post("Recovered")], false));
    await flush();
    expect(document.querySelector("#fmomentsContainer")?.textContent).toContain("Recovered");
    await resources.dispose();
  });

  it("serializes retry and load-more and ignores a response after unmount", async () => {
    vi.useFakeTimers();
    const { promise: pending, resolve: resolvePage } = Promise.withResolvers<PageResponse>();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(page([post("First")], true))
      .mockReturnValueOnce(pending);
    const { document, resources, controller } = fixture(fetchMock);
    await flush();
    document.querySelector<HTMLElement>("#fmomentsMoreBtn")!.click();
    document.querySelector<HTMLElement>("#retryBtn")!.click();
    document.querySelector<HTMLElement>("#fmomentsMoreBtn")!.click();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    await controller.unmount();
    await resources.dispose();
    resolvePage(page([post("Stale")], false));
    await flush();
    expect(document.querySelector("#fmomentsContainer")?.textContent).toBe("");
    expect(document.querySelector<HTMLElement>("#errorState")?.style.display).not.toBe("block");
  });
});
