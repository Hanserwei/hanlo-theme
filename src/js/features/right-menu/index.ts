import { copyTextToClipboard, readTextFromClipboard } from "../../core/clipboard";
import { scrollToDestination } from "../../core/dom";
import type { PageControllerDefinition } from "../../core/types";
import { downloadImage, snackbarShow } from "../../core/ui";

interface MenuState {
  link: string;
  image: string;
  selection: string;
  input?: HTMLInputElement | HTMLTextAreaElement;
}

function setVisible(selector: string, visible: boolean): void {
  const element = document.querySelector<HTMLElement>(selector);
  if (element) element.style.display = visible ? "flex" : "none";
}

function copyText(text: string, message?: string): void {
  void copyTextToClipboard(text).then(
    (copied) => {
      if (!copied) throw new Error("Copy command failed.");
      if (message) snackbarShow(message);
    },
    () => snackbarShow("复制失败，请手动复制"),
  );
}

async function copyImage(source: string): Promise<void> {
  const response = await fetch(source);
  if (!response.ok) throw new Error(`Image request failed with ${response.status}.`);
  const sourceBlob = await response.blob();
  const blob =
    sourceBlob.type === "image/png"
      ? sourceBlob
      : await createImageBitmap(sourceBlob).then((bitmap) => {
          const canvas = document.createElement("canvas");
          canvas.width = bitmap.width;
          canvas.height = bitmap.height;
          canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
          bitmap.close();
          return new Promise<Blob>((resolve, reject) => {
            canvas.toBlob(
              (value) => (value ? resolve(value) : reject(new Error("Image conversion failed."))),
              "image/png",
            );
          });
        });
  await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
}

function pasteAtSelection(target: HTMLInputElement | HTMLTextAreaElement, text: string): void {
  const start = target.selectionStart ?? target.value.length;
  const end = target.selectionEnd ?? start;
  target.setRangeText(text, start, end, "end");
  target.focus();
}

export function createRightMenuController(): PageControllerDefinition {
  return {
    name: "right-menu",
    when: ({ config }) => config.rightMenuEnable,
    create: ({ resources }) => {
      const state: MenuState = { link: "", image: "", selection: "" };
      const hide = () => {
        const menu = document.querySelector<HTMLElement>("#rightMenu");
        const mask = document.querySelector<HTMLElement>("#rightmenu-mask");
        if (menu) menu.style.display = "none";
        if (mask) mask.style.display = "none";
      };

      return {
        mount() {
          const menu = document.querySelector<HTMLElement>("#rightMenu");
          const mask = document.querySelector<HTMLElement>("#rightmenu-mask");
          if (!menu || !mask) return;

          resources.listen(document, "dragstart", (event) => {
            if (event.target instanceof HTMLImageElement) event.preventDefault();
          });
          const rememberSelection = () => {
            state.selection = window.getSelection()?.toString() ?? "";
          };
          resources.listen(document, "mouseup", rememberSelection);
          resources.listen(document, "dblclick", rememberSelection);
          resources.listen(document, "contextmenu", (event) => {
            const contextEvent = event as MouseEvent;
            if (document.body.clientWidth <= 768 || !(event.target instanceof Element)) return;
            event.preventDefault();

            state.selection = window.getSelection()?.toString() ?? state.selection;
            state.link = event.target.closest<HTMLAnchorElement>("a[href]")?.href ?? "";
            const image = event.target.closest<HTMLImageElement>("img");
            state.image = image?.currentSrc || image?.src || "";
            state.input =
              event.target instanceof HTMLInputElement ||
              event.target instanceof HTMLTextAreaElement
                ? event.target
                : undefined;

            const hasSelection = state.selection.length > 0;
            const hasLink = state.link.length > 0;
            const hasImage = state.image.length > 0;
            const pluginMode = hasSelection || hasLink || hasImage || Boolean(state.input);
            setVisible("#menu-copytext", hasSelection);
            setVisible("#menu-search", hasSelection);
            setVisible("#menu-searchBaidu", hasSelection);
            setVisible("#menu-newwindow", hasLink);
            setVisible("#menu-copylink", hasLink);
            setVisible("#menu-copyimg", hasImage);
            setVisible("#menu-downloadimg", hasImage);
            setVisible("#menu-newwindowimg", hasImage);
            setVisible("#menu-pastetext", Boolean(state.input));
            document.querySelectorAll<HTMLElement>(".rightMenuOther").forEach((group) => {
              group.style.display = pluginMode ? "none" : "block";
            });
            document.querySelectorAll<HTMLElement>(".rightMenuPlugin").forEach((group) => {
              group.style.display = pluginMode ? "block" : "none";
            });

            menu.style.display = "block";
            const width = menu.offsetWidth;
            const height = menu.offsetHeight;
            let left = contextEvent.clientX + 10;
            let top = contextEvent.clientY;
            if (left + width > window.innerWidth) left -= width + 10;
            if (top + height > window.innerHeight) top = window.innerHeight - height;
            menu.style.left = `${Math.max(0, left)}px`;
            menu.style.top = `${Math.max(0, top)}px`;
            mask.style.display = "flex";
          });

          resources.listen(document, "click", (event) => {
            if (!(event.target instanceof Element)) return;
            const item = event.target.closest<HTMLElement>("#rightMenu [id], #rightmenu-mask");
            if (!item) return;
            switch (item.id) {
              case "menu-backward":
                window.history.back();
                break;
              case "menu-forward":
                window.history.forward();
                break;
              case "menu-refresh":
                window.location.reload();
                return;
              case "menu-top":
                scrollToDestination(0);
                break;
              case "menu-copy":
                copyText(window.location.href, "复制本页链接地址成功");
                break;
              case "menu-copytext":
                copyText(state.selection, "复制成功，复制和转载请标注本文地址");
                break;
              case "menu-pastetext":
                if (state.input) {
                  void readTextFromClipboard().then(
                    (text) => pasteAtSelection(state.input!, text),
                    () => snackbarShow("当前浏览器环境不允许读取剪贴板"),
                  );
                }
                break;
              case "menu-newwindow":
                if (state.link) window.open(state.link, "_blank", "noopener");
                break;
              case "menu-copylink":
                copyText(state.link, "已复制链接地址");
                break;
              case "menu-downloadimg":
                if (state.image) downloadImage(state.image, "hao");
                break;
              case "menu-newwindowimg":
                if (state.image) window.open(state.image, "_blank", "noopener");
                break;
              case "menu-copyimg":
                if (state.image) {
                  snackbarShow("正在复制图片，请稍后", false, 10_000);
                  void copyImage(state.image).then(
                    () => snackbarShow("复制成功！请遵守图片版权协议"),
                    () => snackbarShow("图片复制失败，请检查浏览器权限"),
                  );
                }
                break;
              case "menu-searchBaidu":
                window.open(
                  `https://www.baidu.com/s?wd=${encodeURIComponent(state.selection)}`,
                  "_blank",
                  "noopener",
                );
                break;
              default:
            }
            hide();
          });
          resources.listen(mask, "contextmenu", (event) => {
            event.preventDefault();
            hide();
          });
          resources.listen(mask, "wheel", hide);
          resources.listen(menu, "wheel", hide);
          resources.defer(hide);
        },
        unmount: hide,
      };
    },
  };
}
