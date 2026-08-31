import { readFileSync } from "node:fs";

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
const packageJson = JSON.parse(readFileSync("package.json", "utf8"));

if (!theme?.metadata?.name || !theme?.spec?.version || !theme?.spec?.requires) {
  throw new Error("theme.yaml must define metadata.name, spec.version, and spec.requires");
}

if (packageJson.name !== theme.metadata.name) {
  throw new Error("package.json name must match theme.yaml metadata.name");
}

if (Object.hasOwn(packageJson, "version")) {
  throw new Error("package.json must not duplicate theme.yaml spec.version");
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
