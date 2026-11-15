import { parseHTML } from "linkedom";
import { afterEach, describe, expect, it, vi } from "vitest";

import { PageResourceScope } from "../../src/js/core/resource-scope";
import type { PageControllerContext } from "../../src/js/core/types";
import {
  createContentElementsController,
  extractHeight,
} from "../../src/js/features/content-elements";

describe("content element dimensions", () => {
  it("derives responsive heights without evaluating arbitrary code", () => {
    expect(extractHeight(1_000, "50%", "cwidth")).toBe("500");
    expect(extractHeight(1_000, "100%", "${full}")).toBe(1_000);
    expect(extractHeight(1_000, "100%", "${>=900?600:400}")).toBe(600);
  });
});

afterEach(() => {
  vi.doUnmock("dplayer");
  vi.doUnmock("hls.js");
  vi.resetModules();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("content element rendering", () => {
  it("keeps attributes and URLs within their boundaries while preserving rich content and media", () => {
    const { document, window: dom } = parseHTML("<html><body></body></html>");
    vi.stubGlobal("document", document);
    vi.stubGlobal("HTMLElement", dom.HTMLElement);
    vi.stubGlobal("customElements", dom.customElements);
    vi.stubGlobal("window", {
      location: { href: "https://example.test/post" },
      GLOBAL_CONFIG: { lazyload: { enable: false } },
    });
    const resources = new PageResourceScope();
    const controller = createContentElementsController().create({
      resources,
    } as PageControllerContext);
    void controller.mount(document as unknown as Document);

    document.body.innerHTML = `
      <hao-pdf src="/file.pdf?x=&quot; onload=&quot;evil()" width="80%" height="500"></hao-pdf>
      <hao-pdf id="invalid-pdf" src="javascript:alert(1)"></hao-pdf>
      <hao-pdf id="data-pdf" src="data:text/html,hello"></hao-pdf>
      <hao-tag-link link="javascript:alert(1)" logo="javascript:alert(1)" title="&lt;img src=x onerror=evil()&gt;" described="&lt;b&gt;site&lt;/b&gt;"></hao-tag-link>
      <hao-note class="info"><strong>rich text</strong></hao-note>
      <hao-folding color="blue" type="open" title="Details"><div class="_tpl"><em>folded</em></div></hao-folding>
      <hao-bilibili bvid="BV123" page="2" width="75%" height="400"></hao-bilibili>
      <hao-dplayer src="/movie.mp4" width="90%" height="360px"></hao-dplayer>
      <hao-gallery><div class="_tpl">{/image.jpg,javascript:alert(1)}</div></hao-gallery>
      <hao-introduction-card link="javascript:bad()" img="javascript:bad()" logo="javascript:bad()" title="title" subtitle="subtitle"></hao-introduction-card>
      <hao-btns class="circle"><div class="_tpl">{bad,javascript:bad(),javascript:bad()}{good,/page,/icon.png}</div></hao-btns>
      <hao-btns><div class="_tpl">{bad,javascript:bad(),icon}{wide,desc,javascript:bad(),javascript:bad(),icon}</div></hao-btns>
      <hao-gallery-group><div class="_tpl">{group,desc,javascript:bad(),javascript:bad()}</div></hao-gallery-group>
      <hao-introduction-card id="data-image" link="data:text/html,hello" img="data:image/png;base64,aGVsbG8=" logo="data:text/html,hello" title="title" subtitle="subtitle"></hao-introduction-card>
      <hao-tag-link id="image-logo" link="/page" logo="data:image/png;base64,aGVsbG8="></hao-tag-link>
      <hao-dplayer id="blob-video" src="blob:https://example.test/video-id"></hao-dplayer>
      <hao-dplayer id="data-video" src="data:video/mp4;base64,aGVsbG8="></hao-dplayer>
      <hao-dplayer id="bad-video" src="data:text/html,hello"></hao-dplayer>
      <hao-flink style="beautify"><div class="_tpl">{site,javascript:bad(),javascript:bad(),desc,javascript:bad()}</div></hao-flink>`;
    const pdf = document.querySelector("hao-pdf iframe")!;
    expect(pdf.getAttribute("src")).toBe("https://example.test/file.pdf?x=%22%20onload=%22evil()");
    expect(pdf.hasAttribute("onload")).toBe(false);
    expect(document.querySelector("#invalid-pdf iframe")).toBeNull();
    expect(document.querySelector("#data-pdf iframe")).toBeNull();
    expect(document.querySelector("#data-image img")!.getAttribute("src")).toBe(
      "data:image/png;base64,aGVsbG8=",
    );
    expect(document.querySelectorAll("#data-image img")[1]!.hasAttribute("src")).toBe(false);
    expect(document.querySelector("#data-image a")!.hasAttribute("href")).toBe(false);
    expect(document.querySelector("#image-logo .tag-link-left")!.getAttribute("style")).toContain(
      "data:image/png;base64,aGVsbG8=",
    );
    expect(
      document.querySelector("#blob-video .hao-dplayer-target")!.getAttribute("data-video-source"),
    ).toBe("blob:https://example.test/video-id");
    expect(
      document.querySelector("#data-video .hao-dplayer-target")!.getAttribute("data-video-source"),
    ).toBe("data:video/mp4;base64,aGVsbG8=");
    expect(document.querySelector("#bad-video .hao-dplayer-target")).toBeNull();
    expect(pdf.getAttribute("style")).toContain("width:80%");
    const link = document.querySelector("hao-tag-link a")!;
    expect(link.hasAttribute("href")).toBe(false);
    expect(document.querySelector("hao-tag-link img")).toBeNull();
    expect(document.querySelector(".tag-link-title")!.textContent).toBe(
      "<img src=x onerror=evil()>",
    );
    expect(document.querySelector(".tag-link-sitename")!.textContent).toBe("<b>site</b>");
    expect(document.querySelector("hao-note strong")!.textContent).toBe("rich text");
    expect(document.querySelector("hao-folding details")!.hasAttribute("open")).toBe(true);
    expect(document.querySelector("hao-folding em")!.textContent).toBe("folded");
    expect(document.querySelector("hao-bilibili iframe")!.getAttribute("src")).toContain(
      "bvid=BV123&page=2",
    );
    expect(document.querySelector(".hao-dplayer-target")!.getAttribute("data-video-source")).toBe(
      "https://example.test/movie.mp4",
    );
    expect(document.querySelector(".hao-dplayer-target")!.getAttribute("style")).toContain(
      "height:360px",
    );
    const images = document.querySelectorAll("hao-gallery img");
    expect(images[0]!.getAttribute("src")).toBe("https://example.test/image.jpg");
    expect(images[1]!.hasAttribute("src")).toBe(false);
    for (const element of document.querySelectorAll(
      "hao-introduction-card:not(#data-image) a, hao-introduction-card:not(#data-image) img, hao-gallery-group a, hao-gallery-group img, hao-flink a, hao-flink img",
    )) {
      expect(element.hasAttribute("href") || element.hasAttribute("src")).toBe(false);
    }
    const buttons = document.querySelectorAll("hao-btns a");
    expect(buttons[0]!.hasAttribute("href")).toBe(false);
    expect(buttons[0]!.querySelector("img")!.hasAttribute("src")).toBe(false);
    expect(buttons[1]!.getAttribute("href")).toBe("https://example.test/page");
    expect(buttons[1]!.querySelector("img")!.getAttribute("src")).toBe(
      "https://example.test/icon.png",
    );
    expect(buttons[2]!.hasAttribute("href")).toBe(false);
    expect(buttons[3]!.hasAttribute("href")).toBe(false);
    expect(buttons[3]!.querySelector("img")!.hasAttribute("src")).toBe(false);
    void resources.dispose();
  });
});

it("omits invalid lazy image attributes and keeps valid relative images", () => {
  const { document, window: dom } = parseHTML(
    '<html><body><hao-gallery-group><div class="_tpl">{bad,desc,javascript:bad(),javascript:bad()}{good,desc,/page,/image.png}</div></hao-gallery-group></body></html>',
  );
  vi.stubGlobal("document", document);
  vi.stubGlobal("HTMLElement", dom.HTMLElement);
  vi.stubGlobal("customElements", dom.customElements);
  vi.stubGlobal("window", {
    location: { href: "https://example.test/post" },
    GLOBAL_CONFIG: { lazyload: { enable: true } },
  });
  const resources = new PageResourceScope();
  void createContentElementsController()
    .create({ resources } as PageControllerContext)
    .mount(document as unknown as Document);
  const images = document.querySelectorAll("hao-gallery-group img");
  expect(images[0]!.hasAttribute("data-lazy-src")).toBe(false);
  expect(images[1]!.getAttribute("data-lazy-src")).toBe("https://example.test/image.png");
  expect(document.querySelectorAll("hao-gallery-group a")[1]!.getAttribute("href")).toBe(
    "https://example.test/page",
  );
  void resources.dispose();
});

describe("content element player loading", () => {
  it("mounts existing players asynchronously and isolates an HLS loading failure", async () => {
    const { document, window: dom } = parseHTML(
      '<html><body><hao-dplayer src="/bad.m3u8"></hao-dplayer><hao-dplayer src="/good.mp4"></hao-dplayer></body></html>',
    );
    vi.stubGlobal("document", document);
    vi.stubGlobal("HTMLElement", dom.HTMLElement);
    vi.stubGlobal("customElements", dom.customElements);
    vi.stubGlobal("window", {
      location: { href: "https://example.test/post" },
      GLOBAL_CONFIG: { lazyload: { enable: false } },
    });
    const destroy = vi.fn();
    const player = vi.fn(function (this: { destroy: typeof destroy }, _options: unknown) {
      this.destroy = destroy;
    });
    vi.doMock("dplayer", () => ({ default: player }));
    vi.doMock("hls.js", () => {
      throw new Error("HLS unavailable");
    });
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const resources = new PageResourceScope();
    const controller = createContentElementsController().create({
      resources,
    } as PageControllerContext);
    expect(controller.mount(document as unknown as Document)).toBeUndefined();
    expect(player).not.toHaveBeenCalled();
    await vi.waitFor(() => expect(player).toHaveBeenCalledOnce());
    expect(player.mock.calls[0]![0]).toMatchObject({
      video: { url: "https://example.test/good.mp4", type: "auto" },
    });
    expect(error).toHaveBeenCalled();
    await resources.dispose();
    expect(destroy).toHaveBeenCalledOnce();
  });

  it("handles a player library loading failure without rejecting mount", async () => {
    const { document, window: dom } = parseHTML(
      '<html><body><hao-dplayer src="/good.mp4"></hao-dplayer></body></html>',
    );
    vi.stubGlobal("document", document);
    vi.stubGlobal("HTMLElement", dom.HTMLElement);
    vi.stubGlobal("customElements", dom.customElements);
    vi.stubGlobal("window", {
      location: { href: "https://example.test/post" },
      GLOBAL_CONFIG: { lazyload: { enable: false } },
    });
    vi.doMock("dplayer", () => {
      throw new Error("player unavailable");
    });
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const resources = new PageResourceScope();
    const controller = createContentElementsController().create({
      resources,
    } as PageControllerContext);
    expect(controller.mount(document as unknown as Document)).toBeUndefined();
    await vi.waitFor(() => expect(error).toHaveBeenCalled());
    expect(document.querySelector(".hao-dplayer-target")).not.toBeNull();
    await resources.dispose();
  });
});
