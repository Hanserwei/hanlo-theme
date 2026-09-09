import { readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";

import { bundledLanguagesInfo } from "shiki/langs";

const require = createRequire(import.meta.url);
const { version } = require("shiki/package.json");
const aliases = bundledLanguagesInfo.reduce(
  (count, language) => count + (language.aliases?.length ?? 0),
  0,
);
const rows = bundledLanguagesInfo.map(
  ({ id, name, aliases: names = [] }) =>
    `| ${name.replaceAll("|", "\\|")} | \`${id}\` | ${names.map((alias) => `\`${alias}\``).join("、") || "—"} |`,
);
const content = `# Shiki 支持语言\n\n本文件由 \`node scripts/generate-shiki-languages.mjs\` 从 Shiki ${version} 的真实注册表生成，共 **${bundledLanguagesInfo.length} 种语言、${aliases} 个官方别名**。\n\n代码围栏推荐使用「标识」列的小写名称。主题另外兼容 \`c++\` → \`cpp\`、\`c#\` → \`csharp\`、\`htm\` → \`html\`、\`shell\` → \`shellscript\`、\`vue-html\` → \`vue\`。\n\n注意：\`mermaid\`、\`math\`、\`echarts\`、\`mindmap\`、\`markmap\`、\`abc\`、\`graphviz\`、\`flowchart\`、\`plantuml\` 保留给图表/公式渲染；需要展示原始图表代码时使用 \`text\`。参见 [Vditor 书写说明](vditor-writing.md)。\n\n| 语言 | 标识 | 官方别名 |\n| --- | --- | --- |\n${rows.join("\n")}\n`;
const output = "docs/shiki-languages.md";
if (process.argv.includes("--check")) {
  if (readFileSync(output, "utf8") !== content) {
    throw new Error(
      "Shiki language documentation is stale. Run node scripts/generate-shiki-languages.mjs.",
    );
  }
} else {
  writeFileSync(output, content);
}
console.log(
  `Shiki ${version}: ${bundledLanguagesInfo.length} languages, ${aliases} official aliases; ${output}`,
);
