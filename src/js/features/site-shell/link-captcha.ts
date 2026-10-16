import type { PageResourceScope } from "../../core/resource-scope";

const IMAGE = "#link-application-captcha";
const BUTTON = '[data-hanlo-action="refresh-link-captcha"]';
let refreshSequence = 0;

function setLoading(root: ParentNode, loading: boolean, message: string): void {
  const button = root.querySelector<HTMLButtonElement>(BUTTON);
  if (button) {
    button.hidden = false;
    button.disabled = loading;
  }
  root.querySelector(IMAGE)?.setAttribute("aria-busy", String(loading));
  const status = root.querySelector<HTMLElement>("#link-application-captcha-status");
  if (status) status.textContent = message;
}

export function initializeLinkCaptcha(
  resources: PageResourceScope,
  root: ParentNode = document,
): void {
  const image = root.querySelector<HTMLImageElement>(IMAGE);
  if (!image) return;
  const loaded = () => setLoading(root, false, "验证码已加载，可填写验证码。");
  const failed = () => setLoading(root, false, "验证码加载失败，请刷新验证码重试。");
  resources.listen(image, "load", loaded);
  resources.listen(image, "error", failed);
  if (image.complete) {
    if (image.naturalWidth > 0) loaded();
    else failed();
  } else {
    setLoading(root, true, "验证码加载中，请稍候。");
  }
}

export function refreshLinkCaptcha(root: ParentNode = document): void {
  const image = root.querySelector<HTMLImageElement>(IMAGE);
  if (!image) return;
  const url = new URL(image.src, document.baseURI);
  url.searchParams.set("_", `${Date.now()}-${++refreshSequence}`);
  const code = root.querySelector<HTMLInputElement>("#link-application-captcha-code");
  if (code) code.value = "";
  setLoading(root, true, "验证码加载中，请稍候。");
  image.src = url.href;
}
