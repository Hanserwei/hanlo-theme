import type { ExpiringStorage } from "../../core/storage";
import type { PageControllerDefinition } from "../../core/types";
import { snackbarShow } from "../../core/ui";
import { ChineseDomTranslation } from "./dom";
import {
  ChineseTranslation,
  setPageTranslation,
  TRANSLATION_EVENT,
  TRANSLATION_STORAGE_KEY,
  type ChineseEncoding,
} from "./state";

export function createTranslationController(storage: ExpiringStorage): PageControllerDefinition {
  return {
    name: "translation",
    create: ({ config, resources }) => ({
      mount() {
        const button = document.getElementById("translateLink");
        const menu = document.getElementById("menu-translate");
        if (!button && !menu) return;
        const translation = new ChineseTranslation(config.translate.defaultEncoding === 1 ? 1 : 2);
        setPageTranslation(document, translation);
        const dom = new ChineseDomTranslation();
        const convert = (text: string) => translation.convert(text);
        const updateButtons = () => {
          const traditional = translation.targetEncoding === 1;
          if (button)
            button.textContent = traditional
              ? config.translate.msgToSimplifiedChinese
              : config.translate.msgToTraditionalChinese;
          const label = menu?.querySelector("span");
          if (label) label.textContent = traditional ? "转为简体" : "轉為繁體";
          const icon = menu?.querySelector("i");
          icon?.classList.toggle("hao-icon-jianti", traditional);
          icon?.classList.toggle("hao-icon-fanti", !traditional);
        };
        const apply = async (target: ChineseEncoding, notify: boolean) => {
          try {
            if (!(await translation.setTarget(target)) || resources.disposed) return;
            document.documentElement.lang = target === 1 ? "zh-Hant" : "zh-Hans";
            dom.apply(document.body, convert);
            updateButtons();
            if (notify) storage.set(TRANSLATION_STORAGE_KEY, target, 2);
            document.dispatchEvent(new CustomEvent(TRANSLATION_EVENT));
            if (notify && config.Snackbar) {
              snackbarShow(
                (target === 1 ? config.Snackbar.chs_to_cht : config.Snackbar.cht_to_chs) ?? "",
              );
            }
          } catch (error) {
            if (resources.disposed) return;
            console.error("[Hanlo translation] Failed to load conversion dictionaries.", error);
            if (notify) snackbarShow("简繁转换资源加载失败，请重试");
          }
        };
        const stored = storage.get<number>(TRANSLATION_STORAGE_KEY);
        translation.ready = apply(
          stored === 1 || stored === 2 ? stored : translation.sourceEncoding,
          false,
        );
        const toggle = () => {
          translation.ready = apply(translation.requestedEncoding === 1 ? 2 : 1, true);
        };
        if (button) resources.listen(button, "click", toggle);
        if (menu) resources.listen(menu, "click", toggle);

        // Convert only newly added/changed content; cache the original, never reverse-convert
        // previously converted text. Own writes are detected by the cache and do not loop.
        const pending = new Set<Node>();
        let scheduled = false;
        const observer = resources.observe(
          new MutationObserver((records) => {
            for (const record of records) {
              if (record.type === "childList")
                record.addedNodes.forEach((node) => pending.add(node));
              else pending.add(record.target);
            }
            if (scheduled) return;
            scheduled = true;
            resources.animationFrame(() => {
              scheduled = false;
              const nodes = [...pending];
              pending.clear();
              nodes.filter((node) => node.isConnected).forEach((node) => dom.apply(node, convert));
            });
          }),
        );
        observer.observe(document.body, {
          subtree: true,
          childList: true,
          characterData: true,
          attributes: true,
          attributeFilter: ["title", "alt", "placeholder", "aria-label", "aria-description"],
        });
        resources.defer(() => {
          translation.dispose();
          pending.clear();
          setPageTranslation(document);
        });
      },
      unmount() {},
    }),
  };
}
