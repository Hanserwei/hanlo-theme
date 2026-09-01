import { createHighlighterCore } from "shiki/core";
import { createJavaScriptRegexEngine } from "shiki/engine/javascript";
import bash from "shiki/langs/bash.mjs";
import cpp from "shiki/langs/cpp.mjs";
import csharp from "shiki/langs/csharp.mjs";
import css from "shiki/langs/css.mjs";
import dockerfile from "shiki/langs/dockerfile.mjs";
import html from "shiki/langs/html.mjs";
import java from "shiki/langs/java.mjs";
import javascript from "shiki/langs/javascript.mjs";
import json from "shiki/langs/json.mjs";
import jsx from "shiki/langs/jsx.mjs";
import markdown from "shiki/langs/markdown.mjs";
import python from "shiki/langs/python.mjs";
import shellscript from "shiki/langs/shellscript.mjs";
import sql from "shiki/langs/sql.mjs";
import tsx from "shiki/langs/tsx.mjs";
import typescript from "shiki/langs/typescript.mjs";
import vue from "shiki/langs/vue.mjs";
import yaml from "shiki/langs/yaml.mjs";
import darkPlus from "shiki/themes/dark-plus.mjs";
import githubDark from "shiki/themes/github-dark.mjs";
import githubLight from "shiki/themes/github-light.mjs";
import lightPlus from "shiki/themes/light-plus.mjs";
import oneDarkPro from "shiki/themes/one-dark-pro.mjs";
import oneLight from "shiki/themes/one-light.mjs";

let highlighterPromise: ReturnType<typeof createHighlighterCore> | undefined;

export function getLocalHighlighter(): ReturnType<typeof createHighlighterCore> {
  highlighterPromise ??= createHighlighterCore({
    engine: createJavaScriptRegexEngine(),
    langs: [
      bash,
      cpp,
      csharp,
      css,
      dockerfile,
      html,
      java,
      javascript,
      json,
      jsx,
      markdown,
      python,
      shellscript,
      sql,
      tsx,
      typescript,
      vue,
      yaml,
    ],
    themes: [darkPlus, githubDark, githubLight, lightPlus, oneDarkPro, oneLight],
  });
  return highlighterPromise;
}
