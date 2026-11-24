import { resolveHttpUrl } from "../../core/navigation";
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

function escapeHtml(value: string | number | null | undefined): string {
  return String(value ?? "").replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character]!,
  );
}

function httpUrl(value: string | null | undefined): string {
  return value ? (resolveHttpUrl(value, window.location.href)?.href ?? "") : "";
}

function mediaUrl(value: string | null | undefined, kind: "image" | "video"): string {
  const http = httpUrl(value);
  if (http) return http;
  if (!value) return "";
  try {
    const url = new URL(value, window.location.href);
    return url.protocol === "blob:" ||
      (url.protocol === "data:" && new RegExp(`^data:${kind}/[a-z0-9.+-]+[;,]`, "i").test(url.href))
      ? url.href
      : "";
  } catch {
    return "";
  }
}

function urlAttribute(name: string, value: string | null | undefined): string {
  const url = name === "href" ? httpUrl(value) : mediaUrl(value, "image");
  return url ? `${name}="${escapeHtml(url)}"` : "";
}

function cssValue(property: string, value: string): string {
  const style = document.createElement("span").style;
  style.setProperty(property, value);
  return style.getPropertyValue(property);
}

function templateValue(value: string | undefined): string {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = value ?? "";
  return textarea.value;
}

export function extractHeight(occupied: number, width: string, height: string): string | number {
  const occupiedWidth = width.endsWith("%")
    ? occupied * (Number.parseFloat(width) / 100)
    : Number.parseFloat(width);
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
  return window.GLOBAL_CONFIG.lazyload.enable ? "data-lazy-src" : "src";
}

function registerContentElements(): void {
  register("hao-tabs", (element) => {
    const id = escapeHtml(attribute(element, "id"));
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
    const start = escapeHtml(cssValue("color", attribute(element, "begin", "#ff6c6c")));
    const end = escapeHtml(cssValue("color", attribute(element, "end", "#1989fa")));
    return `<span class="tool_dotted" style="background-image:repeating-linear-gradient(-45deg,${start} 0,${start} 20%,transparent 0,transparent 25%,${end} 0,${end} 45%,transparent 0,transparent 50%)"></span>`;
  });

  register("hao-progress", (element) => {
    const requested = attribute(element, "pct", "50%");
    const percentage = /^\d{1,3}%$/.test(requested) ? requested : "50%";
    const color = escapeHtml(cssValue("color", attribute(element, "color", "#ff6c6c")));
    return `<span class="tool_progress"><div class="tool_progress__strip"><div class="tool_progress__strip-percent" style="width:${percentage};background:${color}"></div></div><div class="tool_progress__percentage">${percentage}</div></span>`;
  });

  register("hao-sign", (element) => {
    const type = escapeHtml(attribute(element, "type"));
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
          ? `https://player.bilibili.com/player.html?${new URLSearchParams({ bvid: source, page: attribute(element, "page", "1"), autoplay: attribute(element, "autoplay", "0") })}`
          : httpUrl(source);
      if (!url) return "请填写正确的pdf链接";
      const frameTitle = kind === "bilibili" ? "Bilibili 视频播放器" : "PDF 文档预览";
      return `<div class="${kind === "pdf" ? "tool_pdf" : ""}"><iframe class="iframe-dom ${kind === "bilibili" ? "tool_vplayer" : ""}" title="${frameTitle}" allowfullscreen="true" src="${escapeHtml(url)}" style="width:${escapeHtml(cssValue("width", width))};height:${escapeHtml(cssValue("height", `${height}px`))}"></iframe></div>`;
    };
  register("hao-bilibili", frameRenderer("bilibili"));
  register("hao-pdf", frameRenderer("pdf"));

  register("hao-introduction-card", (element) => {
    const link = attribute(element, "link", "https://0206.ink/");
    const image = attribute(element, "img");
    const logo = element.getAttribute("logo");
    const title = element.getAttribute("title");
    const subtitle = element.getAttribute("subtitle");
    const complete = logo !== null && title !== null && subtitle !== null;
    const source = lazyAttribute();
    return `<div class="introduction-card" style="${complete ? "" : "height:416px"}"><div class="introduction-card-top no-lightbox" style="${complete ? "" : "height:100%;border-radius:15px"}"><div class="int-card-info"><div class="int-tip">${escapeHtml(attribute(element, "tip", "小标题"))}</div><div class="int-cardTitle">${escapeHtml(attribute(element, "cardtitle", "标题"))}</div></div><img ${urlAttribute(source, image)} alt="introduction"></div>${complete ? `<div class="introduction-card-bottom"><div class="left no-lightbox"><img ${urlAttribute(source, logo)} alt="introduction"><div class="info"><div class="title">${escapeHtml(title)}</div><div class="subTitle">${escapeHtml(subtitle)}</div></div></div><div class="right"><a ${urlAttribute("href", link)} class="no-text-decoration">前往</a></div></div>` : ""}</div>`;
  });

  register("hao-folding", (element) => {
    const flags = [attribute(element, "color"), attribute(element, "type")].filter(
      (value) => /^[a-z][a-z0-9_-]*$/i.test(value) && !/^on/i.test(value),
    );
    return `<details class="folding-tag" ${flags.join(" ")}><summary>${escapeHtml(attribute(element, "title"))}</summary><div class="content">${templateContent(element)}</div></details>`;
  });

  register("hao-tag-link", (element) => {
    const logo = mediaUrl(attribute(element, "logo"), "image");
    const left = logo
      ? `<div class="tag-link-left" style="background-image:url(${escapeHtml(JSON.stringify(logo))})"></div>`
      : '<div class="tag-link-left"><i class="haofont hao-icon-link"></i></div>';
    return `<div class="hao-tag-link"><a class="tag-Link" target="_blank" ${urlAttribute("href", attribute(element, "link"))} rel="external nofollow noreferrer" draggable="false"><div class="tag-link-tips">引用站外地址</div><div class="tag-link-bottom">${left}<div class="tag-link-right"><div class="tag-link-title">${escapeHtml(attribute(element, "title"))}</div><div class="tag-link-sitename">${escapeHtml(attribute(element, "described"))}</div></div><i class="haofont hao-icon-angle-right"></i></div></a></div>`;
  });

  register("hao-note", (element) => {
    return `<div class="note ${escapeHtml(attribute(element, "class"))} ${escapeHtml(attribute(element, "noicon"))} ${escapeHtml(attribute(element, "style"))}">${clean(element.innerHTML)}</div>`;
  });
  register("hao-tip", (element) => {
    return `<div class="tip ${escapeHtml(attribute(element, "class", "info"))} ${escapeHtml(attribute(element, "noicon"))}">${clean(element.innerHTML)}</div>`;
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
    return `<div class="timeline ${escapeHtml(attribute(element, "color"))}"><div class="timeline-item headline"><div class="timeline-item-title"><div class="item-circle"><p>${escapeHtml(attribute(element, "title"))}</p></div></div></div>${content}</div>`;
  });

  register("hao-btns", (element) => {
    const shape = attribute(element, "class");
    const source = lazyAttribute();
    let content = "";
    templateContent(element).replace(/{([^}]*)}/g, (_match, value: string) => {
      const parts = value.split(",", 5).map(templateValue);
      const text = parts.map(escapeHtml);
      if (parts.length === 5) {
        content += `<a target="_blank" rel="noopener external nofollow noreferrer" ${urlAttribute("href", parts[2])} class="no-text-decoration"><i class="${text[4]}"></i><b>${text[0]}</b><p class="p red">${text[1]}</p><img ${urlAttribute(source, parts[3])}></a>`;
      } else if (shape === "circle") {
        content += `<a class="button no-text-decoration" target="_blank" rel="noopener external nofollow noreferrer" ${urlAttribute("href", parts[1])} title="${text[0]}"><img ${urlAttribute(source, parts[2])}>${text[0]}</a>`;
      } else {
        content += `<a class="button no-text-decoration" ${urlAttribute("href", parts[1])} title="${text[0]}"><i class="${text[2] ?? ""}"></i>${text[0]}</a>`;
      }
      return "";
    });
    return `<div class="btns ${escapeHtml(shape)} ${escapeHtml(attribute(element, "style"))} ${escapeHtml(attribute(element, "grid"))}">${content}</div>`;
  });

  register("hao-gallery-group", (element) => {
    const source = lazyAttribute();
    let content = "";
    templateContent(element).replace(/{([^}]*)}/g, (_match, value: string) => {
      const item = value.split(",", 4).map(templateValue);
      content += `<figure class="gallery-group no-lightbox group-two"><img class="gallery-group-img" ${urlAttribute(source, item[3])} alt="Group Image Gallery"><figcaption><div class="gallery-group-name">${escapeHtml(item[0])}</div><p>${escapeHtml(item[1])}</p><a target="_blank" rel="noopener" ${urlAttribute("href", item[2])}></a></figcaption></figure>`;
      return "";
    });
    return `<div class="gallery-group-main">${content}</div>`;
  });

  register("hao-gallery", (element) => {
    let content = "";
    templateContent(element).replace(/{([^}]*)}/g, (_match, value: string) => {
      content += value
        .split(",")
        .map(
          (source) =>
            `<div class="fj-gallery-item"><img ${urlAttribute("src", templateValue(source))}></div>`,
        )
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
      const values = value.split(",", 5).map(templateValue);
      const name = escapeHtml(values[0]);
      const description = escapeHtml(values[3]);
      const link = urlAttribute("href", values[1]);
      const image = urlAttribute(source, values[2]);
      const cover = urlAttribute(source, values[4] || values[2]);
      content +=
        style === "beautify"
          ? `<div class="site-card"><a class="img" rel="noopener noreferrer external nofollow" target="_blank" ${link} title="${name}"><img class="flink-avatar entered loaded" alt="${name}" ${cover}></a><a class="info cf-friends-link" rel="noopener noreferrer external nofollow" target="_blank" ${link} title="${name}"><div class="site-card-avatar no-lightbox"><img class="flink-avatar cf-friends-avatar" alt="${name}" ${image}></div><div class="site-card-text"><span class="title cf-friends-name">${name}</span><span class="desc" title="${description}">${description}</span></div></a></div>`
          : `<div class="flink-list-item"><a class="cf-friends-link" rel="noopener noreferrer external nofollow" target="_blank" ${link} title="${name}"><img class="flink-avatar cf-friends-avatar" alt="${name}" ${image}><div class="flink-item-info no-lightbox"><span class="flink-item-name cf-friends-name">${name}</span><span class="flink-item-desc" title="${description}">${description}</span><img ${image} alt=""></div></a></div>`;
      return "";
    });
    const description = escapeHtml(attribute(element, "desc"));
    return `<div class="flink"><div class="flink-name">${escapeHtml(attribute(element, "name"))}</div>${description ? `<div class="flink-desc">${description}</div>` : ""}<div class="${style === "beautify" ? "site-card-group" : "flink-list"}">${content}</div></div>`;
  });

  register("hao-checkbox", (element) => {
    const status = attribute(element, "status");
    return `<div class="checkbox ${escapeHtml(attribute(element, "class"))} ${escapeHtml(attribute(element, "colour"))} ${escapeHtml(status)}"><input type="checkbox" ${status === "checked" ? "checked" : ""}><p>${clean(element.innerHTML)}</p></div>`;
  });
  register("hao-tag-hide", (element) => {
    return `<span class="hide-inline"><button type="button" class="hide-button" style="background-color:${escapeHtml(cssValue("color", attribute(element, "bg")))};color:${escapeHtml(cssValue("color", attribute(element, "color")))}">${escapeHtml(attribute(element, "display", "查看"))}<br></button><span class="hide-content">${clean(element.innerHTML)}</span></span>`;
  });
  register("hao-dplayer", (element) => {
    const source = mediaUrl(attribute(element, "src"), "video");
    if (!source) return "视频地址未填写！";
    return `<div class="hao_vplayer hao-dplayer-target" data-video-source="${escapeHtml(source)}" style="width:${escapeHtml(cssValue("width", attribute(element, "width", "100%")))};height:${escapeHtml(cssValue("height", attribute(element, "height", "500px")))}"></div>`;
  });
}

async function mountDPlayers(
  resources: import("../../core/resource-scope").PageResourceScope,
): Promise<void> {
  const targets = document.querySelectorAll<HTMLElement>(".hao-dplayer-target[data-video-source]");
  if (resources.disposed || targets.length === 0) return;
  const { default: DPlayer } = await import("dplayer");
  if (resources.disposed) return;
  for (const target of Array.from(targets)) {
    const source = target.dataset["videoSource"];
    if (!source) continue;
    const hlsSource = /\.m3u8(?:$|[?#])/i.test(source);
    let customType: Record<string, (video: HTMLVideoElement) => void> | undefined;
    let type = "auto";
    if (hlsSource) {
      const module = await import("hls.js").catch((error: unknown) => {
        console.error("Failed to load HLS player", error);
        return undefined;
      });
      if (!module) continue;
      const { default: Hls } = module;
      if (resources.disposed) return;
      type = "hanloHls";
      customType = {
        hanloHls(video) {
          if (resources.disposed) return;
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
      mount() {
        registerContentElements();
        void Promise.resolve()
          .then(() => mountDPlayers(resources))
          .catch((error: unknown) => {
            console.error("[Hanlo] Failed to load video player.", error);
          });
      },
      unmount() {},
    }),
  };
}
