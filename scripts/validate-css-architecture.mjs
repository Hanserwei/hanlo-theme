import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import postcss from "postcss";
import selectorParser from "postcss-selector-parser";

function collectFiles(directory, extension) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectFiles(entryPath, extension);
    return entry.isFile() && entryPath.endsWith(extension) ? [entryPath] : [];
  });
}

function fail(message) {
  throw new Error(`CSS architecture validation failed: ${message}`);
}

function readJson(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    fail(`${file} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

const packageManifest = readJson("package.json");
const conditionalStyleSources = readJson("css-entries.json");
const qualityBudget = readJson("css-quality-budget.json");
const conditionalStyles = new Set(
  Object.values(conditionalStyleSources).map((source) => path.resolve(source)),
);
for (const dependency of [
  "@tailwindcss/vite",
  "postcss",
  "postcss-selector-parser",
  "stylelint",
  "tailwindcss",
]) {
  const version = packageManifest.devDependencies?.[dependency];
  if (typeof version !== "string" || !/^\d+\.\d+\.\d+$/.test(version)) {
    fail(`${dependency} must use an exact devDependency version.`);
  }
}

const cssRoot = path.resolve("src/css");
const indexPath = path.join(cssRoot, "index.css");
const indexCss = readFileSync(indexPath, "utf8");
const expectedLayers =
  "@layer reset, tokens, base, layout, components, pages, utilities, overrides;";
if (!indexCss.startsWith(expectedLayers)) fail("src/css/index.css must declare the layer order.");
if (indexCss.includes("tailwindcss/preflight.css"))
  fail("Tailwind Preflight must remain disabled.");
if (!/tailwindcss\/theme\.css[^;]+prefix\(hl\)/.test(indexCss)) {
  fail("Tailwind theme variables must use the hl prefix.");
}
if (!/tailwindcss\/utilities\.css[^;]+prefix\(hl\)/.test(indexCss)) {
  fail("Tailwind utilities must use the hl prefix.");
}

const importedCss = new Map();
const importedLayers = new Map();
for (const match of indexCss.matchAll(/@import\s+"(\.\/.+?\.css)"\s+layer\(([^)]+)\)/g)) {
  const importedPath = path.resolve(cssRoot, match[1]);
  importedCss.set(importedPath, (importedCss.get(importedPath) ?? 0) + 1);
  importedLayers.set(importedPath, match[2]);
  if (!existsSync(importedPath))
    fail(`missing imported module ${path.relative(".", importedPath)}.`);
}

function expectedLayer(file) {
  const relativePath = path.relative(cssRoot, file).replaceAll(path.sep, "/");
  if (relativePath === "tokens.css") return "tokens";
  if (relativePath === "base.css" || relativePath.startsWith("legacy/")) return "base";
  if (relativePath === "utilities.css") return "utilities";
  return relativePath.split("/", 1)[0];
}

const sourceCss = collectFiles("src/css", ".css").map((file) => path.resolve(file));
for (const file of sourceCss) {
  if (file === indexPath) continue;
  const importCount = importedCss.get(file) ?? 0;
  const entryCount = conditionalStyles.has(file) ? 1 : 0;
  if (importCount + entryCount !== 1) {
    fail(
      `${path.relative(".", file)} must be a main import or conditional entry exactly once; ` +
        `found ${importCount + entryCount}.`,
    );
  }
  if (importCount === 1 && importedLayers.get(file) !== expectedLayer(file)) {
    fail(
      `${path.relative(".", file)} must use layer(${expectedLayer(file)}), found ` +
        `layer(${importedLayers.get(file) ?? "none"}).`,
    );
  }
  const css = readFileSync(file, "utf8");
  if (entryCount === 1) {
    const root = postcss.parse(css, { from: file });
    const rules = root.nodes.filter((node) => node.type !== "comment");
    const layer = rules[0];
    if (
      rules.length !== 1 ||
      layer?.type !== "atrule" ||
      layer.name !== "layer" ||
      layer.params !== expectedLayer(file) ||
      layer.nodes === undefined
    ) {
      fail(
        `${path.relative(".", file)} must wrap its conditional entry in one ` +
          `@layer ${expectedLayer(file)} block.`,
      );
    }
  }
  const lineCount = css.split("\n").length;
  if (lineCount > 1_300) fail(`${path.relative(".", file)} has ${lineCount} lines (limit 1300).`);
}

const unexpectedPublicCss = collectFiles("public", ".css").filter(
  (file) => file !== path.normalize("public/assets/icon/iconfont.css"),
);
if (unexpectedPublicCss.length) {
  fail(`first-party CSS must live in src/css: ${unexpectedPublicCss.join(", ")}.`);
}

const htmlFiles = collectFiles("src", ".html");
const styleBlockAllowlist = new Set([path.normalize("src/modules/variables/layout.html")]);
const legacyAssetPattern =
  /\/css\/(?:categories-3d|fmoments|friend-circle|fullPage|phase4-runtime|post-copyright(?:-one)?|read-mode|related-posts-(?:six|two)|shiki|tenyear)\.css|zhheo\/(?:zhheoblog|custom)\.css/;
let dynamicStyleCount = 0;
const htmlSource = htmlFiles.map((file) => readFileSync(file, "utf8")).join("\n");

for (const [entryName, source] of Object.entries(conditionalStyleSources)) {
  if (!existsSync(source)) fail(`conditional entry ${entryName} points to missing ${source}.`);
  if (!htmlSource.includes(`/css/${entryName}-`)) {
    fail(`conditional entry ${entryName} is not referenced by a source template.`);
  }
}

for (const file of htmlFiles) {
  const html = readFileSync(file, "utf8");
  if (/\sstyle="/.test(html)) fail(`${file} contains a static inline style attribute.`);
  if (/<style\b/.test(html) && !styleBlockAllowlist.has(path.normalize(file))) {
    fail(`${file} contains a component-local style block.`);
  }
  if (legacyAssetPattern.test(html)) fail(`${file} references a retired standalone stylesheet.`);
  for (const match of html.matchAll(/th:style="([^"]*)"/g)) {
    dynamicStyleCount += 1;
    if (!match[1].includes("--hanlo-")) {
      fail(`${file} uses th:style outside the --hanlo-* custom-property boundary.`);
    }
  }
}

if (dynamicStyleCount > 40) fail(`dynamic style boundary grew to ${dynamicStyleCount} (limit 40).`);

const quality = {
  importantDeclarations: 0,
  idSelectorEntries: 0,
  complexSelectorEntries: 0,
  maxIdsPerSelector: 0,
  maxCombinatorsPerSelector: 0,
};

for (const file of sourceCss) {
  const css = readFileSync(file, "utf8");
  const root = postcss.parse(css, { from: file });
  root.walkDecls((declaration) => {
    if (declaration.important) quality.importantDeclarations += 1;
  });
  root.walkRules((rule) => {
    try {
      selectorParser((selectors) => {
        selectors.each((selector) => {
          let combinators = 0;
          let ids = 0;
          selector.walk((node) => {
            if (node.type === "combinator") combinators += 1;
            if (node.type === "id") ids += 1;
          });
          if (ids > 0) quality.idSelectorEntries += 1;
          if (combinators >= 4) quality.complexSelectorEntries += 1;
          quality.maxIdsPerSelector = Math.max(quality.maxIdsPerSelector, ids);
          quality.maxCombinatorsPerSelector = Math.max(
            quality.maxCombinatorsPerSelector,
            combinators,
          );
        });
      }).processSync(rule.selector);
    } catch (error) {
      fail(
        `${path.relative(".", file)} contains an invalid selector "${rule.selector}": ` +
          `${error instanceof Error ? error.message : String(error)}`,
      );
    }
  });
  if (quality.importantDeclarations > qualityBudget.importantDeclarations) {
    fail(
      `active !important declarations grew to ${quality.importantDeclarations} ` +
        `(budget ${qualityBudget.importantDeclarations}).`,
    );
  }
  if (/nth-child\(\)|var\(-[^-]/.test(css)) {
    fail(`${path.relative(".", file)} contains a known-invalid legacy selector or variable.`);
  }
}

for (const [metric, budget] of Object.entries(qualityBudget)) {
  if (quality[metric] > budget) {
    fail(`${metric} grew to ${quality[metric]} (budget ${budget}).`);
  }
}

process.stdout.write(
  `Validated ${sourceCss.length} CSS modules and ${htmlFiles.length} templates ` +
    `(${dynamicStyleCount} dynamic custom-property boundaries, ` +
    `${quality.importantDeclarations} !important declarations, ` +
    `${quality.idSelectorEntries} ID selector entries, ` +
    `${quality.complexSelectorEntries} complex selector entries).\n`,
);
