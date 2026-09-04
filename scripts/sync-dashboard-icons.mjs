import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const dashboardIconsCommit = "d84d00eef4b14084963d5996397b76f9fe22f0c7";
const dashboardIconsBase = `https://cdn.jsdelivr.net/gh/homarr-labs/dashboard-icons@${dashboardIconsCommit}/svg`;
const assetsDirectory = fileURLToPath(new URL("../public/assets/images/", import.meta.url));
const checkOnly = process.argv.includes("--check");

const icons = [
  {
    file: "icons/vite.svg",
    url: `${dashboardIconsBase}/vite.svg`,
    sha256: "17e50649ce0babbf448e8a728d4475192b60b4d096a7d9414df727128435519e",
  },
  {
    file: "icons/github.svg",
    url: `${dashboardIconsBase}/github.svg`,
    sha256: "cdfb82ff14c8c2484eacba9d211d86cd0c993c933855cad2b03633414fa10ddb",
  },
  {
    file: "icons/docker.svg",
    url: `${dashboardIconsBase}/docker.svg`,
    sha256: "7de45e1ea203da32a040c257f47cd39a5711b3a200d27ec72dbccbc5efb1590b",
  },
  {
    file: "icons/typescript.svg",
    url: `${dashboardIconsBase}/typescript.svg`,
    sha256: "421952e083c20d0d9b237a42da3429f7a276515f8b06a01eda657e7cb4c384ce",
  },
  {
    file: "icons/postgresql.svg",
    url: `${dashboardIconsBase}/postgresql.svg`,
    sha256: "15392b515335ffd08a5a58cb9ed697772b4cf17f4a6af216900f2c774a951da2",
  },
  {
    file: "icons/python.svg",
    url: `${dashboardIconsBase}/python.svg`,
    sha256: "38a2dbbae6c06ef6d2dcf9d02a11338505d0a0c7c3f2c376b8d86908d81cfbc5",
  },
  {
    file: "icons/java.svg",
    url: `${dashboardIconsBase}/java.svg`,
    sha256: "de7fcfb88f7deb2761f6dd8f8625f8ff2aafdb637cfb48707b029e62a22dcbad",
  },
  {
    file: "icons/vue-js.svg",
    url: `${dashboardIconsBase}/vue-js.svg`,
    sha256: "dd3b8b7da4487e7911a84e90c86fad7efc5bc8217b1a58fac07525575bb9cd63",
  },
  {
    file: "icons/nodejs.svg",
    url: `${dashboardIconsBase}/nodejs.svg`,
    sha256: "a38f1f19900a97d0e89b6210ab1c901aacf0148d580379cbb9d0706132b3fadd",
  },
  {
    file: "icons/css.svg",
    url: `${dashboardIconsBase}/css.svg`,
    sha256: "3769775e44d04b7774465364c75b0036c329dcce2b1c4a450a5edc26eaed700f",
  },
  {
    file: "icons/javascript.svg",
    url: `${dashboardIconsBase}/javascript.svg`,
    sha256: "697ce78da2ac1b021d336d516b944836c11867132dd383955f44a42bb4705b31",
  },
  {
    file: "icons/html.svg",
    url: `${dashboardIconsBase}/html.svg`,
    sha256: "64100b7846dfc9bd1790ae35546cdd331f9a023bb05a00e8c4aa3f33822b4b93",
  },
  {
    file: "icons/git.svg",
    url: `${dashboardIconsBase}/git.svg`,
    sha256: "85e3e8c8e95285f4f4007fb29e3adb1ea85a6c0390aa706389e5c1aa9e6ac31b",
  },
  {
    file: "icons/springboot.svg",
    url: "https://cdn.jsdelivr.net/npm/simple-icons@16.29.0/icons/springboot.svg",
    sha256: "1b4bb8d7522fa0742a9fc40685b3efe3e089c5d07e4d3eebf4b4dbb28f827ad3",
  },
  {
    file: "footer/tencentcloud-color.svg",
    url: "https://cdn.jsdelivr.net/npm/@lobehub/icons-static-svg@1.94.0/icons/tencentcloud-color.svg",
    sha256: "f860dae064a3afd24970efd2bc5892f39438526bf52c3a9748f61fc05c1cfd58",
  },
];

function verifyIcon(icon, bytes) {
  const digest = createHash("sha256").update(bytes).digest("hex");
  if (digest !== icon.sha256) {
    throw new Error(`${icon.file} failed SHA-256 verification.`);
  }

  const source = bytes.toString("utf8");
  if (!/<svg\b/i.test(source)) {
    throw new Error(`${icon.file} is not an SVG document.`);
  }
  if (
    /<script\b|\bon\w+\s*=|(?:href|src)\s*=\s*["'](?:https?:|\/\/|data:|javascript:)/i.test(source)
  ) {
    throw new Error(`${icon.file} contains unsafe or externally loaded SVG content.`);
  }
}

for (const icon of icons) {
  const outputPath = path.join(assetsDirectory, icon.file);
  if (checkOnly) {
    const bytes = await readFile(outputPath);
    verifyIcon(icon, bytes);
    continue;
  }

  const response = await fetch(icon.url);
  if (!response.ok) {
    throw new Error(`Unable to download ${icon.file}: HTTP ${response.status}.`);
  }
  const bytes = Buffer.from(await response.arrayBuffer());
  verifyIcon(icon, bytes);
  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, bytes);
}

process.stdout.write(
  `${checkOnly ? "Verified" : "Synchronized"} ${icons.length} vendored SVG icons.\n`,
);
