import type { PageControllerDefinition } from "../../core/types";

type Renderer = (element: HTMLElement) => string | undefined;

function clean(content: string): string {
  return content.trim().replace(/^(<br>)|(<br>)$/g, "");
}

function templateContent(element: HTMLElement): string {
  return clean(
    Array.from(element.children).find((child) => child.className === "_tpl")?.innerHTML ?? "",
  );
}

function attribute(element: HTMLElement, name: string, fallback = ""): string {
  return element.getAttribute(name) ?? fallback;
}

export function extractHeight(occupied: number, width: string, height: string): string | number {
  const occupiedWidth = width.endsWith("%")
    ? occupied * (Number(width.slice(0, -1)) / 100)
    : Number(width);
  const expression = height.replaceAll("cwidth", String(occupiedWidth));
  if (expression === "${full}") return occupied;
  const match = expression.match(/^\$\{([<>=]{1,2})([\d.]+)\?([\d.]+):([\d.]+)}$/);
  if (!match) return expression;
  const [, operator, operandText, truthyText, falseyText] = match;
  const operand = Number(operandText);
  const matches =
    operator === ">"
      ? occupied > operand
      : operator === ">="
        ? occupied >= operand
        : operator === "<"
          ? occupied < operand
          : operator === "<="
            ? occupied <= operand
            : operator === "=="
              ? occupied === operand
              : false;
  return Number(matches ? truthyText : falseyText);
}

function register(name: string, renderer: Renderer): void {
  if (customElements.get(name)) return;
  customElements.define(
    name,
    class extends HTMLElement {
      connectedCallback(): void {
        if (this.dataset["hanloRendered"] === "true") return;
        this.dataset["hanloRendered"] = "true";
        const html = renderer(this);
        if (html !== undefined) this.innerHTML = html;
      }
    },
  );
}

function lazyAttribute(): string {
  const source = window.GLOBAL_CONFIG.source.img;
  return typeof source === "object" && source !== null && "src" in source
    ? String((source as Record<string, unknown>)["src"])
    : "src";
}

function registerContentElements(): void {
  register("hao-tabs", (element) => {
    const id = attribute(element, "id");
    const selected = Number(attribute(element, "index", "1")) || 1;
    let index = 0;
    let navigation = "";
    let contents = "";
    templateContent(element).replace(
      /{tabs-item([^}]*)}([\s\S]*?){\/tabs-item}/g,
      (_match, title: string, content: string) => {
        index += 1;
        const active = index === selected ? "active" : "";
        navigation += `<li class="tab ${active}"><button type="button" data-href="#${id}-${index}">${title}</button></li>`;
        contents += `<div class="tab-item-content ${active}" id="${id}-${index}">${clean(content)}<button type="button" class="tab-to-top" aria-label="scroll to top"><i class="haofont hao-icon-arrow-up"></i></button></div>`;
        return "";
      },
    );
    return `<div class="tabs" id="${id}"><ul class="nav-tabs">${navigation}</ul><div class="tab-contents">${contents}</div></div>`;
  });

  register("hao-dotted", (element) => {
    const start = attribute(element, "begin", "#ff6c6c");
    const end = attribute(element, "end", "#1989fa");
    return `<span class="tool_dotted" style="background-image:repeating-linear-gradient(-45deg,${start} 0,${start} 20%,transparent 0,transparent 25%,${end} 0,${end} 45%,transparent 0,transparent 50%)"></span>`;
  });

  register("hao-progress", (element) => {
    const requested = attribute(element, "pct", "50%");
    const percentage = /^\d{1,3}%$/.test(requested) ? requested : "50%";
    const color = attribute(element, "color", "#ff6c6c");
    return `<span class="tool_progress"><div class="tool_progress__strip"><div class="tool_progress__strip-percent" style="width:${percentage};background:${color}"></div></div><div class="tool_progress__percentage">${percentage}</div></span>`;
  });

  register("hao-sign", (element) => {
    const type = attribute(element, "type");
    return `<span class="${type}">${element.innerHTML}</span>`;
  });

  const frameRenderer =
    (kind: "bilibili" | "pdf"): Renderer =>
    (element) => {
      const source = attribute(element, kind === "bilibili" ? "bvid" : "src");
      if (!source) return kind === "bilibili" ? "请填写正确的bvid" : "请填写正确的pdf链接";
      const width = attribute(element, "width", "100%");
      const height = extractHeight(
        element.parentElement?.offsetWidth ?? 0,
        width,
        attribute(element, "height", "500"),
      );
      element.setAttribute("height", String(height));
      const url =
        kind === "bilibili"
          ? `//player.bilibili.com/player.html?bvid=${source}&page=${attribute(element, "page", "1")}&autoplay=${attribute(element, "autoplay", "0")}`
          : source;
      return `<div class="${kind === "pdf" ? "tool_pdf" : ""}"><iframe class="iframe-dom ${kind === "bilibili" ? "tool_vplayer" : ""}" allowfullscreen="true" src="${url}" style="width:${width};height:${height}px"></iframe></div>`;
    };
  register("hao-bilibili", frameRenderer("bilibili"));
  register("hao-pdf", frameRenderer("pdf"));

  register("hao-introduction-card", (element) => {
    const link = attribute(element, "link", "https://0206.ink/");
    const image = attribute(element, "img");
    const logo = element.getAttribute("logo");
    const title = element.getAttribute("title");
    const subtitle = element.getAttribute("subTitle");
    const complete = logo !== null && title !== null && subtitle !== null;
    const source = lazyAttribute();
    return `<div class="introduction-card" style="${complete ? "" : "height:416px"}"><div class="introduction-card-top no-lightbox" style="${complete ? "" : "height:100%;border-radius:15px"}"><div class="int-card-info"><div class="int-tip">${attribute(element, "tip", "小标题")}</div><div class="int-cardTitle">${attribute(element, "cardTitle", "标题")}</div></div><img ${source}="${image}" alt="introduction"></div>${complete ? `<div class="introduction-card-bottom"><div class="left no-lightbox"><img ${source}="${logo}" alt="introduction"><div class="info"><div class="title">${title}</div><div class="subTitle">${subtitle}</div></div></div><div class="right"><a href="${link}" tabindex="-1" class="no-text-decoration">前往</a></div></div>` : ""}</div>`;
  });

  register("hao-folding", (element) => {
    return `<details class="folding-tag" ${attribute(element, "color")} ${attribute(element, "type")}><summary>${attribute(element, "title")}</summary><div class="content">${templateContent(element)}</div></details>`;
  });

  register("hao-tag-link", (element) => {
    const logo = attribute(element, "logo");
    const left = logo
      ? `<div class="tag-link-left" style="background-image:url(${logo})"></div>`
      : '<div class="tag-link-left"><i class="haofont hao-icon-link"></i></div>';
    return `<div class="hao-tag-link"><a class="tag-Link" target="_blank" href="${attribute(element, "link")}" rel="external nofollow noreferrer" draggable="false"><div class="tag-link-tips">引用站外地址</div><div class="tag-link-bottom">${left}<div class="tag-link-right"><div class="tag-link-title">${attribute(element, "title")}</div><div class="tag-link-sitename">${attribute(element, "described")}</div></div><i class="haofont hao-icon-angle-right"></i></div></a></div>`;
  });

  register("hao-note", (element) => {
    return `<div class="note ${attribute(element, "class")} ${attribute(element, "noIcon")} ${attribute(element, "style")}">${clean(element.innerHTML)}</div>`;
  });
  register("hao-tip", (element) => {
    return `<div class="tip ${attribute(element, "class", "info")} ${attribute(element, "noIcon")}">${clean(element.innerHTML)}</div>`;
  });

  register("hao-timeline", (element) => {
    let content = "";
    templateContent(element).replace(
      /{timeline-item([^}]*)}([\s\S]*?){\/timeline-item}/g,
      (_match, title: string, body: string) => {
        content += `<div class="timeline-item"><div class="timeline-item-title"><div class="item-circle"><p>${title}</p></div></div><div class="timeline-item-content">${clean(body)}</div></div>`;
        return "";
      },
    );
    return `<div class="timeline ${attribute(element, "color")}"><div class="timeline-item headline"><div class="timeline-item-title"><div class="item-circle"><p>${attribute(element, "title")}</p></div></div></div>${content}</div>`;
  });

  register("hao-btns", (element) => {
    const shape = attribute(element, "class");
    const source = lazyAttribute();
    let content = "";
    templateContent(element).replace(/{([^}]*)}/g, (_match, value: string) => {
      const parts = value.split(",", 5);
      if (parts.length === 5) {
        content += `<a target="_blank" rel="noopener external nofollow noreferrer" href="${parts[2]}" class="no-text-decoration"><i class="${parts[4]}"></i><b>${parts[0]}</b><p class="p red">${parts[1]}</p><img ${source}="${parts[3]}"></a>`;
      } else if (shape === "circle") {
        content += `<a class="button no-text-decoration" target="_blank" rel="noopener external nofollow noreferrer" href="${parts[1]}" title="${parts[0]}"><img ${source}="${parts[2]}">${parts[0]}</a>`;
      } else {
        content += `<a class="button no-text-decoration" href="${parts[1]}" title="${parts[0]}"><i class="${parts[2]}"></i>${parts[0]}</a>`;
      }
      return "";
    });
    return `<div class="btns ${shape} ${attribute(element, "style")} ${attribute(element, "grid")}">${content}</div>`;
  });

  register("hao-gallery-group", (element) => {
    const source = lazyAttribute();
    let content = "";
    templateContent(element).replace(/{([^}]*)}/g, (_match, value: string) => {
      const item = value.split(",", 4);
      content += `<figure class="gallery-group no-lightbox group-two"><img class="gallery-group-img" ${source}="${item[3]}" alt="Group Image Gallery"><figcaption><div class="gallery-group-name">${item[0]}</div><p>${item[1]}</p><a target="_blank" rel="noopener" href="${item[2]}"></a></figcaption></figure>`;
      return "";
    });
    return `<div class="gallery-group-main">${content}</div>`;
  });

  register("hao-gallery", (element) => {
    let content = "";
    templateContent(element).replace(/{([^}]*)}/g, (_match, value: string) => {
      content += value
        .split(",")
        .map((source) => `<div class="fj-gallery-item"><img src="${source}"></div>`)
        .join("");
      return "";
    });
    return `<section class="page-1 loadings"><div class="type-gallery"><div class="gallery">${content}</div></div></section>`;
  });

  register("hao-flink", (element) => {
    const style = attribute(element, "style");
    const source = lazyAttribute();
    let content = "";
    templateContent(element).replace(/{([^}]*)}/g, (_match, value: string) => {
      const item = value.split(",", 5);
      content +=
        style === "beautify"
          ? `<div class="site-card"><a class="img" target="_blank" href="${item[1]}" title="${item[0]}"><img class="flink-avatar entered loaded" alt="${item[0]}" ${source}="${item[4] || item[2]}"></a><a class="info cf-friends-link" target="_blank" href="${item[1]}" title="${item[0]}"><div class="site-card-avatar no-lightbox"><img class="flink-avatar cf-friends-avatar" alt="${item[0]}" ${source}="${item[2]}"></div><div class="site-card-text"><span class="title cf-friends-name">${item[0]}</span><span class="desc" title="${item[3]}">${item[3]}</span></div></a></div>`
          : `<div class="flink-list-item"><a class="cf-friends-link" rel="external nofollow" target="_blank" href="${item[1]}" title="${item[0]}"><img class="flink-avatar cf-friends-avatar" alt="${item[0]}" ${source}="${item[2]}"><div class="flink-item-info no-lightbox"><span class="flink-item-name cf-friends-name">${item[0]}</span><span class="flink-item-desc" title="${item[3]}">${item[3]}</span><img ${source}="${item[2]}"></div></a></div>`;
      return "";
    });
    const description = attribute(element, "desc");
    return `<div class="flink" id="article-container"><div class="flink-name">${attribute(element, "name")}</div>${description ? `<div class="flink-desc">${description}</div>` : ""}<div class="${style === "beautify" ? "site-card-group" : "flink-list"}">${content}</div></div>`;
  });

  register("hao-checkbox", (element) => {
    const status = attribute(element, "status");
    return `<div class="checkbox ${attribute(element, "class")} ${attribute(element, "colour")} ${status}"><input type="checkbox" ${status}><p>${clean(element.innerHTML)}</p></div>`;
  });
  register("hao-tag-hide", (element) => {
    return `<span class="hide-inline"><button type="button" class="hide-button" style="background-color:${attribute(element, "bg")};color:${attribute(element, "color")}">${attribute(element, "display", "查看")}<br></button><span class="hide-content">${clean(element.innerHTML)}</span></span>`;
  });
  register("hao-dplayer", (element) => {
    const source = attribute(element, "src");
    if (!source) return "视频地址未填写！";
    return `<div class="hao_vplayer hao-dplayer-target" data-video-source="${source}" style="width:${attribute(element, "width", "100%")} ;height:${attribute(element, "height", "500px")}"></div>`;
  });
}

async function mountDPlayers(
  resources: import("../../core/resource-scope").PageResourceScope,
): Promise<void> {
  const targets = document.querySelectorAll<HTMLElement>(".hao-dplayer-target[data-video-source]");
  if (targets.length === 0) return;
  const { default: DPlayer } = await import("dplayer");
  if (resources.disposed) return;
  for (const target of Array.from(targets)) {
    const source = target.dataset["videoSource"];
    if (!source) continue;
    const hlsSource = /\.m3u8(?:$|[?#])/i.test(source);
    let customType: Record<string, (video: HTMLVideoElement) => void> | undefined;
    let type = "auto";
    if (hlsSource) {
      const { default: Hls } = await import("hls.js");
      if (resources.disposed) return;
      type = "hanloHls";
      customType = {
        hanloHls(video) {
          if (Hls.isSupported()) {
            const hls = resources.track(new Hls(), (instance) => instance.destroy());
            hls.loadSource(source);
            hls.attachMedia(video);
          } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
            video.src = source;
          }
        },
      };
    }
    const player = new DPlayer({
      container: target,
      autoplay: false,
      theme: "#409eff",
      loop: false,
      screenshot: false,
      airplay: true,
      volume: 0.5,
      playbackSpeed: [2, 1.5, 1.25, 1],
      video: { url: source, type, customType },
    });
    resources.track(player, (instance) => instance.destroy());
  }
}

export function createContentElementsController(): PageControllerDefinition {
  return {
    name: "content-elements",
    create: ({ resources }) => ({
      async mount() {
        registerContentElements();
        await Promise.resolve();
        await mountDPlayers(resources);
      },
      unmount() {},
    }),
  };
}
