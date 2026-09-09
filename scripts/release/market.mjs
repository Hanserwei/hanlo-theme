import assert from "node:assert/strict";
import { appendFileSync, readdirSync, statSync } from "node:fs";
import path from "node:path";

const version = process.env.RELEASE_VERSION;
assert.match(version ?? "", /^\d+\.\d+\.\d+$/);
const endpoint =
  "https://www.halo.run/apis/api.store.halo.run/v1alpha1/applications/app-pin7ah2e/releases";
const expected = readdirSync("dist").map((name) => ({
  name,
  size: statSync(path.join("dist", name)).size,
}));
const verifying = process.argv.includes("--verify");
const attempts = verifying ? 10 : 1;
let found;
for (let attempt = 0; attempt < attempts; attempt += 1) {
  const response = await fetch(endpoint, {
    signal: AbortSignal.timeout(20_000),
    cache: "no-store",
  });
  assert.ok(response.ok, `Cannot inspect market releases: HTTP ${response.status}`);
  const releases = await response.json();
  assert.ok(Array.isArray(releases), "Unexpected market response");
  const matches = releases.filter((entry) => entry.release?.spec?.version === version);
  assert.ok(matches.length <= 1, "Duplicate market versions require inspection");
  found = matches[0];
  if (found) break;
  if (attempt + 1 < attempts) await new Promise((resolve) => setTimeout(resolve, 3_000));
}
if (verifying) assert.ok(found, `Market version ${version} was not published`);
if (found) {
  assert.equal(found.release.spec.draft, false, "Existing market release is a draft");
  for (const asset of expected) {
    assert.ok(
      found.assets.some(
        (item) =>
          item.spec.name === asset.name &&
          item.spec.size === asset.size &&
          item.spec.state === "UPLOADED",
      ),
      `Existing market asset differs: ${asset.name}`,
    );
  }
  console.log(
    `Verified market ${version}: ${found.release.metadata.name}, ${expected.length} matching assets.`,
  );
}
if (process.env.GITHUB_OUTPUT)
  appendFileSync(process.env.GITHUB_OUTPUT, `exists=${Boolean(found)}\n`);
