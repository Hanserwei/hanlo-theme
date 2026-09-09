import { spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

// Test the exact browser bundle, including its embedded Prism, rather than an API-only mock.
const version = "3.11.3";
const sha256 = "2d3a3914a7525e0cb39417c75b646a5cbb38ead7dc6ba5f1bd5236aff06f2fcb";
const url = `https://cdn.jsdelivr.net/npm/vditor@${version}/dist/js/markmap/markmap.min.js`;
const directory = path.resolve("build/markmap-runtime");
const file = path.join(directory, `vditor-${version}-markmap.min.js`);
await mkdir(directory, { recursive: true });
let bytes;
try {
  bytes = await readFile(file);
} catch (error) {
  if (error.code !== "ENOENT") throw error;
  const response = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!response.ok)
    throw new Error(`Markmap test runtime download failed: HTTP ${response.status}`);
  bytes = Buffer.from(await response.arrayBuffer());
}
const actual = createHash("sha256").update(bytes).digest("hex");
if (actual !== sha256) throw new Error(`Markmap test runtime checksum mismatch: ${actual}`);
await writeFile(file, bytes);
console.log(
  `Verified Vditor ${version} Markmap runtime (${bytes.length} bytes, SHA-256 ${actual}).`,
);
const result = spawnSync(
  "pnpm",
  ["exec", "vitest", "run", "--config", "tests/markmap-runtime.config.ts"],
  {
    env: { ...process.env, VDITOR_MARKMAP_RUNTIME: file },
    stdio: "inherit",
  },
);
if (result.error) throw result.error;
if (result.status !== 0)
  throw new Error(`Markmap runtime tests failed: ${result.signal ?? result.status}`);
