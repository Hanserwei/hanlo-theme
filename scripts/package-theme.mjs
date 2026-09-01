import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

import { parse } from "yaml";

const theme = parse(readFileSync("theme.yaml", "utf8"));
const name = theme?.metadata?.name;
const version = theme?.spec?.version;
if (typeof name !== "string" || typeof version !== "string") {
  throw new TypeError("theme.yaml must declare metadata.name and spec.version.");
}

execFileSync("pnpm", ["exec", "theme-package"], { stdio: "inherit" });
const archive = path.resolve("dist", `${name}-${version}.zip`);
execFileSync("zip", ["-q", "-j", archive, "THIRD_PARTY_NOTICES.txt"], { stdio: "inherit" });
process.stdout.write(
  `Added THIRD_PARTY_NOTICES.txt to ${path.relative(process.cwd(), archive)}.\n`,
);
