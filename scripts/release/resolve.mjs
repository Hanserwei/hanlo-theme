import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";

import { parse } from "yaml";

const tag = process.env.RELEASE_TAG;
assert.match(tag ?? "", /^v?\d+\.\d+\.\d+$/, "A stable semver release tag is required.");
const repo = process.env.GITHUB_REPOSITORY;
assert.equal(repo, "Hanserwei/hanlo-theme");
function json(text) {
  try {
    return JSON.parse(text);
  } catch (cause) {
    throw new Error("Invalid release metadata JSON.", { cause });
  }
}
function api(route, query = ".") {
  try {
    return json(
      execFileSync("gh", ["api", `repos/${repo}/${route}`, "--jq", query], { encoding: "utf8" }),
    );
  } catch (cause) {
    throw new Error(`Cannot read release metadata: ${route}`, { cause });
  }
}
const release =
  process.env.PUBLISH_ARCHIVE_DRAFT === "true"
    ? api("releases?per_page=100", `map(select(.tag_name == "${tag}")) | .[0]`)
    : api(`releases/tags/${tag}`);
assert.ok(release, "Release was not found; create its GitHub draft first.");
assert.equal(release.prerelease, false);
const sha = api(`commits/${tag}`, "{sha: .sha}").sha;
assert.match(sha, /^[a-f0-9]{40}$/);
const manifest = api(`contents/theme.yaml?ref=${sha}`);
const version = parse(Buffer.from(manifest.content, "base64").toString()).spec.version;
assert.ok(tag === version || tag === `v${version}`, "Tag and theme.yaml version differ.");
const archive = json(readFileSync("releases/archives.json", "utf8"))[version];
if (archive) {
  const record = api(`contents/release-archive.json?ref=${sha}`);
  const snapshot = json(Buffer.from(record.content, "base64").toString());
  assert.equal(snapshot.version, version);
  assert.equal(snapshot.sha256, archive.sha256);
}
if (release.draft) {
  assert.ok(
    archive && process.env.PUBLISH_ARCHIVE_DRAFT === "true",
    "Publish the GitHub Release before syncing it.",
  );
  assert.ok(
    release.assets.some(
      (asset) =>
        asset.name === `theme-hanlo-${version}.zip` &&
        asset.digest === `sha256:${archive.sha256}` &&
        asset.size === archive.size,
    ),
    "Draft package does not match the historical archive.",
  );
  // GITHUB_TOKEN publication stays in this direct workflow, avoiding a second nested workflow
  // and preserving access to the existing environment secret in the publish job.
  execFileSync("gh", ["release", "edit", tag, "--draft=false", "--latest=false"], {
    stdio: "inherit",
  });
}
const control = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
const outputs = {
  tag,
  version,
  sha,
  control,
  release_id: String(release.id),
  archive: String(Boolean(archive)),
};
for (const [key, value] of Object.entries(outputs))
  appendFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`);
console.log(
  `Resolved ${tag} at ${sha}: ${archive ? "verified historical package" : "source build"}.`,
);
