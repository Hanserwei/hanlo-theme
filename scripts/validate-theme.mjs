import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";

import { parseFragment } from "parse5";
import { parseAllDocuments } from "yaml";

function parseYaml(file) {
  const documents = parseAllDocuments(readFileSync(file, "utf8"), {
    prettyErrors: true,
    strict: true,
    uniqueKeys: true,
  });

  const errors = documents.flatMap((document) => document.errors);
  if (errors.length > 0) {
    throw new Error(`${file}:\n${errors.map((error) => error.message).join("\n")}`);
  }

  return documents.map((document) => document.toJS());
}

const [theme] = parseYaml("theme.yaml");
const [settings] = parseYaml("settings.yaml");
const annotations = parseYaml("annotation-setting.yaml");
parseYaml("pnpm-workspace.yaml");
parseYaml(".github/workflows/ci.yml");
parseYaml(".github/workflows/cd.yml");
let packageJson;
try {
  packageJson = JSON.parse(readFileSync("package.json", "utf8"));
} catch (error) {
  throw new Error(
    `package.json is not valid JSON: ${error instanceof Error ? error.message : String(error)}`,
  );
}
const layoutTemplate = readFileSync("src/layout.html", "utf8");

if (!theme?.metadata?.name || !theme?.spec?.version || !theme?.spec?.requires) {
  throw new Error("theme.yaml must define metadata.name, spec.version, and spec.requires");
}

if (packageJson.name !== theme.metadata.name) {
  throw new Error("package.json name must match theme.yaml metadata.name");
}

if (Object.hasOwn(packageJson, "version")) {
  throw new Error("package.json must not duplicate theme.yaml spec.version");
}

if (!/^\d+\.\d+\.\d+$/.test(packageJson.dependencies?.parse5 ?? "")) {
  throw new Error("parse5 must use an exact production dependency version");
}

if (!/th:fragment="html\(head, content\)"/.test(layoutTemplate)) {
  throw new Error("src/layout.html must implement the Halo 2.26 html(head, content) contract");
}

const navigationScanFiles = [
  ...collectFiles("src", [".css", ".html", ".ts"]),
  ...collectFiles("tests", [".js", ".ts"]),
  "package.json",
  "pnpm-lock.yaml",
  "THIRD_PARTY_NOTICES.txt",
];
for (const file of navigationScanFiles) {
  if (/p\s*j\s*a\s*x/i.test(readFileSync(file, "utf8"))) {
    throw new Error(`${file} contains a retired partial-navigation reference`);
  }
}

for (const file of collectFiles("src", [".html"])) {
  const document = parseFragment(readFileSync(file, "utf8"));
  walkHtml(document, (node) => {
    const attributes = new Map((node.attrs ?? []).map(({ name, value }) => [name, value]));
    for (const value of attributes.values()) {
      // Halo wraps JSON objects in ComparableJsonNode; Map.get is not available.
      if (/\btheme\.config(?:\.[A-Za-z_]\w*)*\.get\s*\(/.test(value)) {
        throw new Error(
          `${file} calls get() on theme.config; use property access for Halo JsonPropertyAccessor`,
        );
      }
    }
    if (
      attributes.has("onclick") ||
      attributes.has("th:onclick") ||
      /(?:^|;)\s*onclick\s*=/.test(attributes.get("th:attr") ?? "")
    ) {
      throw new Error(`${file} contains an inline click handler`);
    }
    if (node.nodeName !== "a") return;
    if (!attributes.has("href") && !attributes.has("th:href") && !attributes.has("th:replace")) {
      throw new Error(`${file} contains an anchor without a real href`);
    }
    const href = (attributes.get("href") ?? "").trim().toLowerCase();
    if (href.startsWith("javascript:")) {
      throw new Error(`${file} contains a javascript: anchor URL`);
    }
    if (href === "#") throw new Error(`${file} contains a hash-only pseudo link`);
  });
}

if (settings?.metadata?.name !== theme.spec.settingName) {
  throw new Error("settings.yaml metadata.name must match theme.yaml spec.settingName");
}

if (annotations.length === 0 || annotations.some((document) => !document?.kind)) {
  throw new Error("annotation-setting.yaml must contain valid resource documents");
}

process.stdout.write(
  `Validated theme ${theme.metadata.name} ${theme.spec.version} (${annotations.length} annotation resources).\n`,
);

function collectFiles(directory, extensions) {
  if (!existsSync(directory)) return [];
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) return collectFiles(entryPath, extensions);
    return entry.isFile() && extensions.some((extension) => entry.name.endsWith(extension))
      ? [entryPath]
      : [];
  });
}

function walkHtml(node, visit) {
  visit(node);
  for (const child of node.childNodes ?? []) walkHtml(child, visit);
  if (node.content) walkHtml(node.content, visit);
}
