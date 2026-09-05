import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";

const outputPath = path.resolve("THIRD_PARTY_NOTICES.txt");
const checkOnly = process.argv.includes("--check");
function parseJson(text, source) {
  try {
    return JSON.parse(text);
  } catch (cause) {
    throw new Error(`Invalid JSON from ${source}`, { cause });
  }
}

const licenseData = parseJson(
  execFileSync("pnpm", ["licenses", "list", "--prod", "--json"], {
    encoding: "utf8",
    maxBuffer: 32 * 1024 * 1024,
  }),
  "pnpm licenses",
);

const packages = new Map();
for (const [reportedLicense, entries] of Object.entries(licenseData)) {
  for (const entry of entries) {
    for (const packagePath of entry.paths ?? []) {
      const manifestPath = path.join(packagePath, "package.json");
      if (!existsSync(manifestPath)) continue;
      const manifest = parseJson(readFileSync(manifestPath, "utf8"), manifestPath);
      const name = String(manifest.name ?? entry.name ?? "unknown-package");
      const version = String(manifest.version ?? "unknown-version");
      const key = `${name}@${version}`;
      if (packages.has(key)) continue;
      const license =
        typeof manifest.license === "string"
          ? manifest.license
          : typeof reportedLicense === "string"
            ? reportedLicense
            : "UNKNOWN";
      const homepage =
        typeof manifest.homepage === "string"
          ? manifest.homepage
          : typeof manifest.repository === "string"
            ? manifest.repository
            : typeof manifest.repository?.url === "string"
              ? manifest.repository.url.replace(/^git\+/, "").replace(/\.git$/, "")
              : "not declared";
      const noticeFiles = readdirSync(packagePath)
        .filter((file) => /^(?:licen[cs]e|copying|notice)(?:\..*)?$/i.test(file))
        .sort();
      const notices = noticeFiles.map((file) => ({
        file,
        text: readFileSync(path.join(packagePath, file), "utf8").trim(),
      }));
      packages.set(key, { homepage, key, license, notices });
    }
  }
}

const records = [...packages.values()].sort((left, right) =>
  left.key < right.key ? -1 : left.key > right.key ? 1 : 0,
);
const missingMetadata = records.filter(({ license }) => !license || license === "UNKNOWN");
const missingText = records.filter(({ notices }) => notices.length === 0);
const lines = [
  "HANLO THEME THIRD-PARTY NOTICES",
  "=================================",
  "",
  "Generated deterministically from the installed production pnpm dependency graph.",
  "This inventory records package metadata; it is not legal advice or a grant of rights.",
  "",
  `Packages: ${records.length}`,
  `Missing license metadata: ${missingMetadata.length}`,
  `Missing packaged LICENSE/COPYING/NOTICE text: ${missingText.length}`,
  "",
];

for (const record of records) {
  lines.push(
    "--------------------------------------------------------------------------------",
    record.key,
  );
  lines.push(`License metadata: ${record.license}`);
  lines.push(`Homepage: ${record.homepage}`);
  if (record.notices.length === 0) {
    lines.push("Packaged notice text: NOT PRESENT IN THE INSTALLED PACKAGE");
  } else {
    for (const notice of record.notices) {
      lines.push("", `[${notice.file}]`, notice.text);
    }
  }
  lines.push("");
}

if (missingMetadata.length > 0 || missingText.length > 0) {
  lines.push("DISCLOSURE GAPS", "===============", "");
  if (missingMetadata.length > 0) {
    lines.push(`Missing license metadata: ${missingMetadata.map(({ key }) => key).join(", ")}`);
  }
  if (missingText.length > 0) {
    lines.push(`Missing packaged notice text: ${missingText.map(({ key }) => key).join(", ")}`);
  }
  lines.push("");
}

lines.push("BUNDLED FONT AND ICON ASSETS", "===========================", "");
for (const file of [
  "public/assets/fonts/PROVENANCE.md",
  "public/assets/fonts/MapleMono-OFL.txt",
  "public/assets/fonts/LXGWWenKai-OFL.txt",
  "public/assets/fonts/NerdFonts-LICENSE.txt",
  "public/assets/icon/antdv-next/LICENSE.txt",
]) {
  lines.push(`[${file}]`, readFileSync(file, "utf8").trim(), "");
}

const content = `${lines.join("\n").trimEnd()}\n`;
if (checkOnly) {
  if (!existsSync(outputPath) || readFileSync(outputPath, "utf8") !== content) {
    throw new Error("THIRD_PARTY_NOTICES.txt is missing or stale. Run pnpm notices.");
  }
  process.stdout.write(
    `Verified notices for ${records.length} production packages (${missingMetadata.length} metadata gaps, ${missingText.length} text gaps).\n`,
  );
} else {
  writeFileSync(outputPath, content);
  process.stdout.write(
    `Generated notices for ${records.length} production packages (${missingMetadata.length} metadata gaps, ${missingText.length} text gaps).\n`,
  );
}
