import { spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

import { expect, it } from "vitest";

it("ignores integrity digests while rejecting retired navigation dependencies", () => {
  const directory = mkdtempSync(path.join(tmpdir(), "hanlo-validation-"));
  try {
    for (const file of [
      "theme.yaml",
      "settings.yaml",
      "annotation-setting.yaml",
      "package.json",
      "pnpm-workspace.yaml",
      ".github/workflows/ci.yml",
      ".github/workflows/cd.yml",
      "src/layout.html",
    ]) {
      const target = path.join(directory, file);
      mkdirSync(path.dirname(target), { recursive: true });
      copyFileSync(file, target);
    }
    writeFileSync(path.join(directory, "THIRD_PARTY_NOTICES.txt"), "");
    const retired = ["p", "jax"].join("");
    const lockfile = path.join(directory, "pnpm-lock.yaml");
    writeFileSync(lockfile, `integrity: sha512-${retired}${"A".repeat(82)}==\n`);
    const valid = spawnSync(process.execPath, [path.resolve("scripts/validate-theme.mjs")], {
      cwd: directory,
      encoding: "utf8",
    });
    expect(valid.status, valid.stderr).toBe(0);
    writeFileSync(lockfile, `packages:\n  ${retired}@2.0.0: {}\n`);
    const invalid = spawnSync(process.execPath, [path.resolve("scripts/validate-theme.mjs")], {
      cwd: directory,
      encoding: "utf8",
    });
    expect(invalid.status).not.toBe(0);
    expect(invalid.stderr).toContain("retired partial-navigation reference");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
