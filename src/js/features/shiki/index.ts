import { copyTextToClipboard } from "../../core/clipboard";
import type { ThemeConfig } from "../../core/config";
import type { PageResourceScope } from "../../core/resource-scope";
import type { PageControllerDefinition } from "../../core/types";
import { snackbarShow } from "../../core/ui";
import { isDiagramLanguage } from "../vditor/languages";
import { LANGUAGE_ALIASES, LANGUAGE_LABELS, LOCAL_LANGUAGES, LOCAL_THEMES } from "./registry";

const FALLBACK_THEMES = { light: "one-light", dark: "one-dark-pro" } as const;
const LEGACY_THEME_ALIASES: Readonly<Record<string, string>> = {
  "one-dark": "one-dark-pro",
  vs: "light-plus",
  "vsc-dark-plus": "dark-plus",
};

export function normalizeTheme(
  theme: string,
  mode: "dark" | "light",
  themes: Readonly<Record<string, unknown>> | readonly string[],
): string {
  const requested = LEGACY_THEME_ALIASES[theme] ?? theme;
  const available = Array.isArray(themes)
    ? (themes as readonly string[]).includes(requested)
    : Boolean((themes as Readonly<Record<string, unknown>>)[requested]);
  return requested && available ? requested : FALLBACK_THEMES[mode];
}

export function normalizeLanguage(
  language: string,
  languages: Readonly<Record<string, unknown>> | readonly string[],
): string {
  const requested = language.trim().toLowerCase();
  const aliased = Object.hasOwn(LANGUAGE_ALIASES, requested)
    ? LANGUAGE_ALIASES[requested]!
    : requested;
  if (["text", "txt", "plain", "plaintext"].includes(aliased)) return "text";
  const available = Array.isArray(languages)
    ? (languages as readonly string[]).includes(aliased)
    : Object.hasOwn(languages, aliased);
  return available ? aliased : "text";
}

function extractLanguage(pre: HTMLElement, code: HTMLElement): string {
  const classNames = `${code.className} ${pre.className}`;
  const declared =
    classNames.match(/(?:lang|language)-([^\s]+)/i)?.[1] ??
    code.dataset["language"] ??
    pre.dataset["language"] ??
    "text";
  return declared.toLowerCase();
}

function languageLabel(
  language: string,
  normalized: string,
  pre: HTMLElement,
  code: HTMLElement,
): string {
  return (
    code.dataset["title"] ??
    pre.dataset["title"] ??
    LANGUAGE_LABELS[normalized] ??
    LANGUAGE_LABELS[language] ??
    (language === "text" ? "Text" : language)
  );
}

function createButton(className: string, iconClass: string, label: string): HTMLButtonElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = className;
  button.title = label;
  button.setAttribute("aria-label", label);
  const icon = document.createElement("i");
  icon.className = iconClass;
  button.append(icon);
  return button;
}

function addToolbar(
  wrapper: HTMLElement,
  highlightedPre: HTMLElement,
  source: string,
  title: string,
  config: Readonly<ThemeConfig["shiki"]>,
  resources: PageResourceScope,
): void {
  const toolbar = document.createElement("div");
  toolbar.className = "toolbar";
  toolbar.classList.toggle("c-title", config.enable_title);
  toolbar.classList.toggle("c-hr", config.enable_hr);

  const titleItem = document.createElement("div");
  titleItem.className = "toolbar-item shiki-language-title";
  const titleText = document.createElement("span");
  titleText.textContent = title;
  titleItem.append(titleText);
  toolbar.append(titleItem);

  const actions = document.createElement("div");
  actions.className = "custom-item shiki-toolbar-actions";
  if (config.enable_copy) {
    const button = createButton(
      "shiki-tool shiki-copy-button",
      "haofont hao-icon-paste",
      "复制代码",
    );
    resources.listen(button, "click", () => {
      void copyTextToClipboard(source).then(
        (copied) => {
          if (!copied) throw new Error("Copy command failed.");
          button.dataset["copyState"] = "success";
          button.title = "复制成功";
          snackbarShow("复制成功");
          resources.timeout(() => {
            delete button.dataset["copyState"];
            button.title = "复制代码";
          }, 2_000);
        },
        (error: unknown) => {
          button.dataset["copyState"] = "error";
          button.title = "复制失败，请手动复制";
          snackbarShow("复制失败，请手动复制");
          console.error("[Shiki] Failed to copy code.", error);
        },
      );
    });
    actions.append(button);
  }
  if (config.enable_expander) {
    const button = createButton(
      "shiki-tool shiki-collapse-button",
      "haofont hao-icon-angle-down",
      "折叠代码",
    );
    button.setAttribute("aria-expanded", "true");
    resources.listen(button, "click", () => {
      const collapsed = wrapper.classList.toggle("is-code-collapsed");
      button.setAttribute("aria-expanded", String(!collapsed));
      button.title = collapsed ? "展开代码" : "折叠代码";
    });
    actions.append(button);
  }
  toolbar.append(actions);
  wrapper.append(highlightedPre, toolbar);

  if (config.enable_height_limit) {
    resources.animationFrame(() => {
      const limit = Number(config.height_limit) || 300;
      if (highlightedPre.scrollHeight <= limit) return;
      wrapper.classList.add("is-height-limited");
      const button = createButton(
        "code-expand-btn",
        "haofont hao-icon-angle-double-down",
        "展开完整代码",
      );
      button.setAttribute("aria-expanded", "false");
      resources.listen(button, "click", () => {
        const expanded = wrapper.classList.toggle("is-height-expanded");
        button.classList.toggle("expand-done", expanded);
        button.title = expanded ? "收起代码" : "展开完整代码";
        button.setAttribute("aria-expanded", String(expanded));
      });
      wrapper.append(button);
    });
  }
}

async function renderCodeBlock(
  code: HTMLElement,
  config: Readonly<ThemeConfig["shiki"]>,
  resources: PageResourceScope,
): Promise<void> {
  const pre = code.parentElement;
  if (!pre || pre.tagName !== "PRE" || pre.classList.contains("shiki")) return;
  if (pre.closest(".shiki-code-block") || code.dataset["shikiPending"] === "true") return;
  const language = extractLanguage(pre, code);
  if (isDiagramLanguage(language) || code.dataset["processed"] === "true") return;
  if (code.querySelector("svg, canvas, iframe, object, .katex, mjx-container")) return;
  code.dataset["shikiPending"] = "true";
  const source = code.textContent ?? "";
  try {
    const normalized = normalizeLanguage(language, LOCAL_LANGUAGES);
    if (isDiagramLanguage(normalized)) {
      delete code.dataset["shikiPending"];
      return;
    }
    const { getLocalHighlighter } = await import("./local");
    if (resources.disposed) return;
    const shiki = await getLocalHighlighter(normalized);
    if (resources.disposed) return;
    // Markdown ends a fenced block with a newline; it is a line terminator, not another row.
    // Remove exactly one for display, preserving intentional blank lines and the copied source.
    const displaySource = source.replace(/(?:\r\n|\r|\n)$/, "");
    const html = shiki.codeToHtml(displaySource, {
      lang: normalized,
      themes: {
        light: normalizeTheme(config.theme_light, "light", LOCAL_THEMES),
        dark: normalizeTheme(config.theme_dark, "dark", LOCAL_THEMES),
      },
      defaultColor: false,
    });
    if (resources.disposed || !pre.isConnected) return;
    // Shiki escapes the source; accept only its generated pre element from an inert document.
    const parsed = new DOMParser().parseFromString(html, "text/html");
    const highlighted = parsed.querySelector<HTMLElement>("pre.shiki");
    if (!highlighted) throw new Error("Shiki did not return a code block.");
    highlighted.dataset["shikiRendered"] = "true";
    highlighted.dataset["language"] = language;
    highlighted.classList.add(`language-${language.replace(/[^a-z0-9_+#.-]/g, "")}`);
    highlighted.querySelector("code")?.classList.add(`language-${normalized}`);
    if (config.enable_line) highlighted.classList.add("line-numbers");
    const wrapper = document.createElement("div");
    wrapper.className = "code-toolbar shiki-code-block";
    addToolbar(
      wrapper,
      highlighted,
      source,
      languageLabel(language, normalized, pre, code),
      config,
      resources,
    );
    pre.replaceWith(wrapper);
  } catch (error) {
    delete code.dataset["shikiPending"];
    console.error(`[Shiki] Failed to highlight language "${language}".`, error);
  }
}

async function highlightAll(
  container: ParentNode,
  config: Readonly<ThemeConfig["shiki"]>,
  resources: PageResourceScope,
): Promise<void> {
  const blocks = container.querySelectorAll<HTMLElement>(
    "#article-container pre > code, #post-comment pre > code, pre[data-language] > code",
  );
  for (const block of Array.from(blocks)) {
    if (resources.disposed) return;
    await renderCodeBlock(block, config, resources);
  }
}

export function createShikiController(): PageControllerDefinition {
  return {
    name: "shiki",
    when: ({ config }) => config.shiki.enable,
    create: ({ config, resources }) => ({
      mount() {
        let queue = Promise.resolve();
        const schedule = (container: ParentNode) => {
          queue = queue
            .then(() => highlightAll(container, config.shiki, resources))
            .catch((error: unknown) => console.error("[Shiki] Rendering failed.", error));
        };
        schedule(document);
        const comments = document.querySelector<HTMLElement>("#post-comment");
        if (!comments) return;
        let queued = false;
        const observer = resources.observe(
          new MutationObserver((mutations) => {
            const containsCode = mutations.some((mutation) =>
              Array.from(mutation.addedNodes).some(
                (node) =>
                  node instanceof Element &&
                  (node.matches("pre, code") || Boolean(node.querySelector("pre > code"))),
              ),
            );
            if (!containsCode || queued) return;
            queued = true;
            queueMicrotask(() => {
              queued = false;
              if (!resources.disposed) schedule(comments);
            });
          }),
        );
        observer.observe(comments, { childList: true, subtree: true });
      },
      unmount() {},
    }),
  };
}
