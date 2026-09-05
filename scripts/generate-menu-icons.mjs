import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";

import * as icons from "@antdv-next/icons";
import { renderToString } from "@vue/server-renderer";
import { parseFragment, serialize } from "parse5";
import { h } from "vue";

const directory = path.resolve("public/assets/icon/antdv-next");
const checkOnly = process.argv.includes("--check");
const names = Object.keys(icons)
  .filter((name) => /^(?:[A-Z][a-zA-Z0-9]*)(?:Outlined|Filled|TwoTone)$/.test(name))
  .sort();
const primary = "#123456";
const secondary = "#abcdef";
const symbols = [];

for (const name of names) {
  const markup = await renderToString(h(icons[name], { twoToneColor: [primary, secondary] }));
  const wrapper = parseFragment(markup).childNodes.find((node) => node.tagName === "span");
  const svg = wrapper?.childNodes.find((node) => node.tagName === "svg");
  const viewBox = svg?.attrs.find((attr) => attr.name === "viewBox")?.value;
  if (!svg || !viewBox) throw new Error(`No SVG/viewBox in ${name}.`);
  const body = serialize(svg)
    .replaceAll(`fill="${primary}"`, 'fill="currentColor"')
    .replaceAll(`fill="${secondary}"`, 'fill="currentColor" fill-opacity="0.2"');
  if (/<(?:script|foreignObject)\b|\son\w+=/i.test(body)) {
    throw new Error(`Unexpected executable markup in ${name}.`);
  }
  symbols.push(`<symbol id="${name}" viewBox="${viewBox}" fill="currentColor">${body}</symbol>`);
}

if (names.length < 800) throw new Error("The complete menu icon collection was not generated.");
function readManifest(file) {
  try {
    return JSON.parse(readFileSync(file, "utf8"));
  } catch (cause) {
    throw new Error(`Cannot read icon package manifest: ${file}`, { cause });
  }
}

const manifestPath = path.resolve("node_modules/@antdv-next/icons/package.json");
const require = createRequire(realpathSync(manifestPath));
const svgManifestPath = require.resolve("@ant-design/icons-svg/package.json");
const notices = [manifestPath, svgManifestPath].map((file) => {
  const manifest = readManifest(file);
  // icons-svg omits LICENSE in its npm tarball; keep its upstream text pinned locally.
  const licensePath =
    file === svgManifestPath
      ? path.join(directory, "icons-svg-LICENSE.txt")
      : path.join(path.dirname(file), "LICENSE");
  const license = readFileSync(licensePath, "utf8").trim();
  return `${manifest.name}@${manifest.version}\nLicense: ${manifest.license}\n\n${license}`;
});
const version = readManifest(manifestPath).version;
const outputs = {
  "sprite.svg": `<svg xmlns="http://www.w3.org/2000/svg">\n${symbols.join("\n")}\n</svg>\n`,
  "names.json": `${JSON.stringify(names, null, 2)}\n`,
  "LICENSE.txt": `${notices.join("\n\n---\n\n")}\n\nicons-svg LICENSE source: https://github.com/ant-design/ant-design-icons/blob/7f2516ac91226d2b41f93b35cb5197c8d94f7189/LICENSE\n`,
  "catalog.html": `<!doctype html>
<html lang="zh-CN">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Hanlo 菜单图标</title>
<style>
@font-face{font-family:WenKai;src:url(../../fonts/LXGWWenKai-Regular.woff2?v=1.522) format("woff2");font-display:swap}
@font-face{font-family:Maple;src:url(../../fonts/MapleMono-NF-CN-Regular.woff2?v=7.9) format("woff2");font-display:swap}
:root{color-scheme:light dark}body{max-width:1200px;margin:2rem auto;padding:0 1rem;font-family:WenKai,serif}main{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:1rem}article{padding:1rem;border:1px solid #8886;border-radius:12px;display:flex;align-items:center;gap:1rem}svg{width:2em;height:2em;flex-shrink:0;color:#1677ff}code{font-family:Maple,monospace;font-feature-settings:"calt" 1,"liga" 1;overflow-wrap:anywhere}a{color:inherit}
</style>
<h1>Hanlo 菜单图标</h1>
<p>@antdv-next/icons ${version} · ${names.length} 个图标。使用浏览器查找功能搜索名称，将完整名称复制到「外观 → 菜单 → 图标」。</p>
<p>Outlined：线框；Filled：实底；TwoTone：双色。图标随主题提供。</p>
<main>
${names.map((name) => `<article id="${name}"><svg aria-hidden="true"><use href="sprite.svg#${name}"></use></svg><code>${name}</code></article>`).join("\n")}
</main>
</html>\n`,
};

if (!checkOnly) mkdirSync(directory, { recursive: true });
for (const [name, content] of Object.entries(outputs)) {
  const file = path.join(directory, name);
  if (checkOnly) {
    if (!existsSync(file) || readFileSync(file, "utf8") !== content) {
      throw new Error(`${file} is stale. Run pnpm menu-icons:sync.`);
    }
  } else {
    writeFileSync(file, content);
  }
}
console.log(
  `${checkOnly ? "Verified" : "Generated"} ${names.length} menu icons from @antdv-next/icons ${version}.`,
);
