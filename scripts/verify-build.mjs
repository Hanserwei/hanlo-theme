import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

import { parse } from "yaml";

function collectFiles(directory) {
  const files = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...collectFiles(entryPath));
    else if (entry.isFile()) files.push(entryPath);
  }

  return files;
}

const theme = parse(readFileSync("theme.yaml", "utf8"));
const conditionalStyleSources = JSON.parse(readFileSync("css-entries.json", "utf8"));
const themeVersion = theme?.spec?.version;
if (typeof themeVersion !== "string") {
  throw new TypeError("theme.yaml must declare spec.version.");
}

const expected = new Map();
const generated = new Set([
  `assets/js/hanlo-runtime-${themeVersion}.js`,
  `assets/css/hanlo-theme-${themeVersion}.css`,
  ...Object.keys(conditionalStyleSources).map(
    (entryName) => `assets/css/${entryName}-${themeVersion}.css`,
  ),
]);
const generatedChunkPattern = /^assets\/(?:js\/)?[\w.-]+-[\w-]+\.(?:css|js)$/;

for (const source of collectFiles("public")) {
  expected.set(path.relative("public", source), source);
}

for (const source of collectFiles("src")) {
  if (path.extname(source) !== ".html" || path.basename(source) === ".build-entry.html") continue;
  expected.set(path.relative("src", source), source);
}

const actual = collectFiles("templates").map((file) => path.relative("templates", file));
const generatedChunks = actual.filter((file) => generatedChunkPattern.test(file));
const unexpected = actual.filter(
  (file) => !expected.has(file) && !generated.has(file) && !generatedChunkPattern.test(file),
);
const missing = [...expected.keys(), ...generated].filter((file) => !actual.includes(file));
const changed = [...expected].flatMap(([output, source]) =>
  readFileSync(source).equals(readFileSync(path.join("templates", output))) ? [] : [output],
);
const generatedOutputs = [...generated, ...generatedChunks];
const emptyGenerated = generatedOutputs.filter(
  (output) => readFileSync(path.join("templates", output)).length === 0,
);
const generatedPathResidue = generatedOutputs.filter((output) =>
  readFileSync(path.join("templates", output), "utf8").includes("node_modules/.pnpm"),
);

if (
  unexpected.length ||
  missing.length ||
  changed.length ||
  emptyGenerated.length ||
  generatedPathResidue.length
) {
  throw new Error(
    [
      unexpected.length ? `Unexpected output: ${unexpected.join(", ")}` : "",
      missing.length ? `Missing output: ${missing.join(", ")}` : "",
      changed.length ? `Changed output: ${changed.join(", ")}` : "",
      emptyGenerated.length ? `Empty generated output: ${emptyGenerated.join(", ")}` : "",
      generatedPathResidue.length
        ? `Generated output exposes package-manager paths: ${generatedPathResidue.join(", ")}`
        : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

process.stdout.write(
  `Verified ${actual.length} build outputs against source files and generated entries.\n`,
);
