import { createHighlighterCore } from "shiki/core";
import { createOnigurumaEngine } from "shiki/engine/oniguruma";
import darkPlus from "shiki/themes/dark-plus.mjs";
import githubDark from "shiki/themes/github-dark.mjs";
import githubLight from "shiki/themes/github-light.mjs";
import lightPlus from "shiki/themes/light-plus.mjs";
import oneDarkPro from "shiki/themes/one-dark-pro.mjs";
import oneLight from "shiki/themes/one-light.mjs";

import { LANGUAGE_LOADERS } from "./registry";

let highlighterPromise: ReturnType<typeof createHighlighterCore> | undefined;
const languagePromises = new Map<string, Promise<void>>();

export async function getLocalHighlighter(
  language: string,
): ReturnType<typeof createHighlighterCore> {
  highlighterPromise ??= createHighlighterCore({
    // Oniguruma supports the complete TextMate grammar set, including uncommon languages.
    engine: createOnigurumaEngine(import("shiki/wasm")),
    langs: [],
    themes: [darkPlus, githubDark, githubLight, lightPlus, oneDarkPro, oneLight],
  }).catch((error: unknown) => {
    highlighterPromise = undefined;
    throw error;
  });
  const highlighter = await highlighterPromise;
  const loader = LANGUAGE_LOADERS.get(language);
  if (loader && !highlighter.getLoadedLanguages().includes(language)) {
    let pending = languagePromises.get(language);
    if (!pending) {
      pending = highlighter.loadLanguage(loader).finally(() => languagePromises.delete(language));
      languagePromises.set(language, pending);
    }
    await pending;
  }
  return highlighter;
}
