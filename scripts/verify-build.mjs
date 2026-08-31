import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

function collectFiles(directory) {
  const files = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...collectFiles(entryPath));
    else if (entry.isFile()) files.push(entryPath);
  }

  return files;
}

const expected = new Map();

for (const source of collectFiles("public")) {
  expected.set(path.relative("public", source), source);
}

for (const source of collectFiles("src")) {
  if (path.extname(source) !== ".html" || path.basename(source) === ".build-entry.html") continue;
  expected.set(path.relative("src", source), source);
}

const actual = collectFiles("templates").map((file) => path.relative("templates", file));
const unexpected = actual.filter((file) => !expected.has(file));
const missing = [...expected.keys()].filter((file) => !actual.includes(file));
const changed = [...expected].flatMap(([output, source]) =>
  readFileSync(source).equals(readFileSync(path.join("templates", output))) ? [] : [output],
);

if (unexpected.length || missing.length || changed.length) {
  throw new Error(
    [
      unexpected.length ? `Unexpected output: ${unexpected.join(", ")}` : "",
      missing.length ? `Missing output: ${missing.join(", ")}` : "",
      changed.length ? `Changed output: ${changed.join(", ")}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  );
}

process.stdout.write(`Verified ${actual.length} build outputs against source files.\n`);
