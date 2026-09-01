import type { PageResourceScope } from "../../core/resource-scope";
import type { PageControllerDefinition } from "../../core/types";

type AiMode = "local" | "tianli";

interface PostAiConfig {
  readonly summary: string;
  readonly randomRange: number;
  readonly wordLimit: number;
  readonly buttonLink: string;
  readonly name: string;
  readonly mode: AiMode;
  readonly switchable: boolean;
  readonly key: string;
  readonly referer: string;
}

export function chooseLocalSummary(
  value: string,
  previousIndex: number,
  random: () => number = Math.random,
): Readonly<{ summary: string; index: number }> {
  const summaries = value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  if (summaries.length <= 1) return { summary: summaries[0] ?? "暂无文章摘要。", index: 0 };
  let index = Math.floor(random() * summaries.length);
  if (index === previousIndex) index = (index + 1) % summaries.length;
  return { summary: summaries[index] ?? summaries[0]!, index };
}

function articleText(limit: number): string {
  const container = document.querySelector<HTMLElement>("#post #article-container");
  if (!container) return "";
  const fragments = [document.title];
  container.querySelectorAll<HTMLElement>("h1, h2, h3, h4, h5, p").forEach((element) => {
    fragments.push(element.innerText.replace(/https?:\/\/[^\s]+/g, ""));
  });
  return fragments.join(" ").slice(0, Math.max(10, limit));
}

function setVisible(element: HTMLElement | null, visible: boolean): void {
  if (element) element.style.display = visible ? "block" : "none";
}

class PostAiController {
  readonly #config: PostAiConfig;
  readonly #explanation: HTMLElement;
  readonly #panel: HTMLElement;
  readonly #refresh: HTMLElement;
  readonly #resources: PageResourceScope;
  #animationGeneration = 0;
  #lastLocalIndex = -1;
  #mode: AiMode;
  #previousLimit: number | undefined;
  #refreshCount = 0;
  #request: AbortController | undefined;
  #statusInterval: ReturnType<typeof setInterval> | undefined;

  constructor(
    config: PostAiConfig,
    panel: HTMLElement,
    explanation: HTMLElement,
    refresh: HTMLElement,
    resources: PageResourceScope,
  ) {
    this.#config = config;
    this.#mode = config.mode;
    this.#panel = panel;
    this.#explanation = explanation;
    this.#refresh = refresh;
    this.#resources = resources;
    resources.defer(() => this.#cleanup());
  }

  mount(): void {
    const buttons = Array.from(this.#panel.querySelectorAll<HTMLElement>(".ai-btn-item")).filter(
      (button) => button.id !== "go-tianli-blog",
    );
    const actions = [
      () => this.#introduce(),
      () => this.#refreshSummary(),
      () => this.#recommend(),
      () => this.#goHome(),
    ];
    buttons.forEach((button, index) => {
      const action = actions[index];
      if (action) this.#resources.listen(button, "click", action);
    });
    this.#resources.listen(this.#refresh, "click", () => this.#refreshSummary());

    const tag = this.#panel.querySelector<HTMLElement>("#ai-tag");
    if (tag) this.#resources.listen(tag, "click", () => this.#describeMode());
    const external = this.#panel.querySelector<HTMLElement>("#go-tianli-blog");
    if (external) {
      this.#resources.listen(external, "click", () => {
        window.open(this.#config.buttonLink, "_blank", "noopener");
      });
    }
    const toggle = this.#panel.querySelector<HTMLElement>("#ai-Toggle");
    if (toggle && this.#config.switchable) {
      this.#resources.listen(toggle, "click", () => this.#toggleMode());
    }

    this.#showDefaultButtons();
    void this.#generateSummary(this.#config.wordLimit);
  }

  #cleanup(): void {
    this.#animationGeneration += 1;
    this.#request?.abort();
    this.#request = undefined;
    if (this.#statusInterval) clearInterval(this.#statusInterval);
    this.#statusInterval = undefined;
  }

  #write(text: string, pending = true): void {
    const generation = ++this.#animationGeneration;
    this.#explanation.textContent = pending ? "生成中. . ." : "请等待. . .";
    let index = 0;
    const observer = this.#resources.observe(
      new IntersectionObserver((entries) => {
        if (!entries[0]?.isIntersecting) return;
        observer.disconnect();
        const append = () => {
          if (generation !== this.#animationGeneration || this.#resources.disposed) return;
          const character = text.charAt(index);
          if (!character) return;
          if (index === 0) this.#explanation.replaceChildren();
          const cursor = this.#explanation.querySelector(".ai-cursor");
          cursor?.remove();
          this.#explanation.append(document.createTextNode(character));
          index += 1;
          if (index < text.length) {
            const nextCursor = document.createElement("span");
            nextCursor.className = "ai-cursor";
            this.#explanation.append(nextCursor);
            this.#resources.timeout(
              () => this.#resources.animationFrame(append),
              /[,.，。!?！？]/.test(text.charAt(index)) ? 150 : 20,
            );
          }
        };
        this.#resources.timeout(() => this.#resources.animationFrame(append), 200);
      }),
    );
    observer.observe(this.#panel);
  }

  async #generateSummary(limit: number): Promise<void> {
    this.#cleanupRequest();
    if (this.#mode === "local") {
      const selection = chooseLocalSummary(this.#config.summary, this.#lastLocalIndex);
      this.#lastLocalIndex = selection.index;
      this.#write(selection.summary);
      this.#resources.timeout(() => {
        this.#refresh.style.opacity = "1";
      }, 600);
      return;
    }

    const content = articleText(Math.max(10, Math.min(2_000, limit)));
    this.#request = new AbortController();
    this.#explanation.textContent = "生成中.";
    let dots = 1;
    this.#statusInterval = setInterval(() => {
      this.#explanation.textContent = `生成中${".".repeat(dots)}`;
      dots = (dots % 3) + 1;
    }, 500);
    try {
      const response = await fetch("https://summary.tianli0.top/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Referer: this.#config.referer,
        },
        body: JSON.stringify({
          key: this.#config.key,
          content,
          url: window.location.href,
        }),
        signal: this.#request.signal,
      });
      let summary: string;
      if (response.status === 403) summary = "403 refer 与 key 不匹配，本地无法显示。";
      else if (response.status === 500) summary = "500 系统内部错误";
      else {
        const result: unknown = await response.json();
        summary =
          typeof result === "object" &&
          result !== null &&
          typeof (result as Record<string, unknown>)["summary"] === "string"
            ? ((result as Record<string, unknown>)["summary"] as string).trim()
            : "";
      }
      if (!summary) summary = "摘要获取失败，请检查 Tianli 服务是否正常。";
      this.#write(summary);
      this.#resources.timeout(() => {
        this.#refresh.style.opacity = "1";
      }, 300);
    } catch (error) {
      if (!(error instanceof DOMException && error.name === "AbortError")) {
        console.error("[Hanlo] AI summary request failed.", error);
        this.#explanation.textContent = "摘要生成发生异常，请稍后重试。";
      }
    } finally {
      if (this.#statusInterval) clearInterval(this.#statusInterval);
      this.#statusInterval = undefined;
    }
  }

  #cleanupRequest(): void {
    this.#animationGeneration += 1;
    this.#request?.abort();
    this.#request = undefined;
    if (this.#statusInterval) clearInterval(this.#statusInterval);
    this.#statusInterval = undefined;
  }

  #refreshSummary(): void {
    const contentLength = articleText(2_000).length;
    const range = Math.max(1, this.#config.randomRange);
    let limit =
      contentLength <= 1_000
        ? Math.max(10, contentLength - Math.floor(Math.random() * range))
        : this.#config.wordLimit + Math.floor(Math.random() * range);
    if (limit === this.#previousLimit) limit += 1;
    this.#previousLimit = limit;
    this.#refresh.style.opacity = "0.2";
    this.#refresh.style.transitionDuration = "0.3s";
    this.#refresh.style.transform = `rotate(${this.#refreshCount * 360}deg)`;
    this.#refreshCount += 1;
    this.#showDefaultButtons();
    void this.#generateSummary(limit);
  }

  #introduce(): void {
    this.#write(
      this.#mode === "tianli"
        ? "我是文章辅助 AI：TianliGPT。点击下方按钮，让我生成本文简介、推荐相关文章等。"
        : `我是文章辅助 AI：${this.#config.name} GPT。点击下方按钮，让我生成本文简介、推荐相关文章等。`,
    );
  }

  #describeMode(): void {
    const external = this.#panel.querySelector<HTMLElement>("#go-tianli-blog");
    this.#panel.querySelectorAll<HTMLElement>(".ai-btn-item").forEach((button) => {
      setVisible(button, this.#mode !== "tianli");
    });
    setVisible(external, this.#mode === "tianli");
    this.#write(
      this.#mode === "tianli"
        ? "你好，我是 Tianli 开发的摘要生成助理 TianliGPT，在这里负责摘要的预生成和显示。"
        : `你好，我是本站摘要生成助理 ${this.#config.name} GPT，在这里负责摘要的预生成和显示。`,
    );
  }

  #toggleMode(): void {
    this.#mode = this.#mode === "tianli" ? "local" : "tianli";
    const tag = this.#panel.querySelector<HTMLElement>("#ai-tag");
    if (tag) tag.textContent = this.#mode === "tianli" ? "Tianli GPT" : `${this.#config.name} GPT`;
    this.#showDefaultButtons();
    void this.#generateSummary(this.#config.wordLimit);
  }

  #showDefaultButtons(): void {
    this.#panel.querySelectorAll<HTMLElement>(".ai-btn-item").forEach((button) => {
      setVisible(button, button.id !== "go-tianli-blog");
    });
  }

  #recommend(): void {
    this.#cleanupRequest();
    this.#explanation.replaceChildren();
    const candidates = Array.from(
      document.querySelectorAll<HTMLAnchorElement>(
        ".relatedPosts-list a, .card-widget.card-recent-post .aside-list-item a",
      ),
    ).filter((link) => link.title && !document.title.includes(link.title));
    this.#explanation.append(
      document.createTextNode(
        candidates.length > 0 ? "推荐文章：" : "很抱歉，暂时没有可推荐的文章。",
      ),
    );
    if (candidates.length === 0) return;
    const list = document.createElement("div");
    list.className = "ai-recommend";
    candidates.forEach((candidate, index) => {
      const item = document.createElement("div");
      item.className = "ai-recommend-item";
      const label = document.createElement("span");
      label.textContent = `推荐${index + 1}：`;
      const link = document.createElement("a");
      link.href = candidate.href;
      link.title = candidate.title;
      link.textContent = candidate.title;
      this.#resources.listen(link, "click", (event) => {
        if (!window.pjax) return;
        event.preventDefault();
        void window.pjax.loadUrl(link.href);
      });
      item.append(label, link);
      list.append(item);
    });
    this.#explanation.append(document.createElement("br"), list);
  }

  #goHome(): void {
    this.#write("正在返回本站首页...", false);
    this.#resources.timeout(() => {
      if (window.pjax) void window.pjax.loadUrl("/");
      else window.location.assign("/");
    }, 1_000);
  }
}

function readConfig(config: Readonly<import("../../core/config").ThemeConfig>): PostAiConfig {
  return {
    summary: config.postAi.summary,
    randomRange: config.postAi.randomRange,
    wordLimit: config.postAi.wordLimit,
    buttonLink: config.postAi.buttonLink,
    name: config.postAi.name,
    mode: config.postAi.mode,
    switchable: config.postAi.switchable,
    key: config.postAi.key,
    referer: config.postAi.referer,
  };
}

export function createPostAiController(): PageControllerDefinition {
  return {
    name: "post-ai",
    when: () => Boolean(document.querySelector("#post .post-ai")),
    create: ({ config, resources }) => ({
      mount() {
        const panel = document.querySelector<HTMLElement>("#post .post-ai");
        const explanation = panel?.querySelector<HTMLElement>(".ai-explanation");
        const refresh = panel?.querySelector<HTMLElement>(
          ".ai-title .haofont.hao-icon-arrow-rotate-right",
        );
        if (!panel || !explanation || !refresh) return;
        new PostAiController(readConfig(config), panel, explanation, refresh, resources).mount();
      },
      unmount() {},
    }),
  };
}
