import { bundledLanguagesInfo } from "shiki/langs";

// This entry contains metadata and dynamic imports, not eagerly loaded grammars.
export const LOCAL_LANGUAGES = Object.freeze(bundledLanguagesInfo.map(({ id }) => id));
export const LANGUAGE_LOADERS = new Map(
  bundledLanguagesInfo.map((language) => [language.id, language.import]),
);
export const LANGUAGE_ALIASES: Readonly<Record<string, string>> = Object.freeze({
  ...Object.fromEntries(
    bundledLanguagesInfo.flatMap(({ id, aliases = [] }) => aliases.map((alias) => [alias, id])),
  ),
  "c++": "cpp",
  "c#": "csharp",
  htm: "html",
  shell: "shellscript",
  "vue-html": "vue",
});
export const LANGUAGE_LABELS: Readonly<Record<string, string>> = Object.freeze(
  Object.fromEntries(bundledLanguagesInfo.map(({ id, name }) => [id, name])),
);

export const LOCAL_THEMES = Object.freeze([
  "dark-plus",
  "github-dark",
  "github-light",
  "light-plus",
  "one-dark-pro",
  "one-light",
]);
