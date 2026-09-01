import { copyFileSync, mkdirSync, readFileSync, readdirSync, rmSync } from "node:fs";
import path from "node:path";

import { haloThemePlugin } from "@halo-dev/vite-plugin-halo-theme";
import { defineConfig, type Plugin } from "vite-plus";
import { parse } from "yaml";

const sourceRoot = path.resolve("src");
const outputRoot = path.resolve("templates");
const buildEntry = path.join(sourceRoot, ".build-entry.html");
const themeManifest: unknown = parse(readFileSync("theme.yaml", "utf8"));
const themeVersion =
  typeof themeManifest === "object" &&
  themeManifest !== null &&
  "spec" in themeManifest &&
  typeof themeManifest.spec === "object" &&
  themeManifest.spec !== null &&
  "version" in themeManifest.spec &&
  typeof themeManifest.spec.version === "string"
    ? themeManifest.spec.version
    : undefined;
if (!themeVersion) throw new TypeError("theme.yaml must declare spec.version.");

function collectLegacyTemplates(directory: string): string[] {
  const templates: string[] = [];

  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const sourcePath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      templates.push(...collectLegacyTemplates(sourcePath));
      continue;
    }

    if (!entry.isFile() || path.extname(entry.name) !== ".html" || sourcePath === buildEntry) {
      continue;
    }

    templates.push(sourcePath);
  }

  return templates;
}

function copyLegacyTemplates(): void {
  for (const sourcePath of collectLegacyTemplates(sourceRoot)) {
    const outputPath = path.join(outputRoot, path.relative(sourceRoot, sourcePath));
    mkdirSync(path.dirname(outputPath), { recursive: true });
    copyFileSync(sourcePath, outputPath);
  }
}

/** Remove package-manager-specific source paths embedded by prebuilt dependency bundles. */
function sanitizeGeneratedDependencyPaths(): Plugin {
  return {
    name: "hanlo-sanitize-generated-dependency-paths",
    generateBundle(_options, bundle) {
      for (const output of Object.values(bundle)) {
        if (output.type !== "chunk") continue;
        output.code = output.code.replace(
          /webpack:\/\/\.\/node_modules\/\.pnpm\/[^`"']+?\/node_modules\//g,
          "webpack://",
        );
      }
    },
  };
}

/**
 * Phase 1 compatibility bridge: legacy Thymeleaf fragments contain inline scripts that Vite's
 * HTML parser cannot safely transform yet. The Halo plugin still owns the output directory,
 * public asset copy, base path, and build lifecycle; this post-step preserves HTML byte-for-byte.
 */
function preserveLegacyTemplates(): Plugin {
  return {
    name: "hanlo-preserve-legacy-templates",
    config() {
      return {
        build: {
          rollupOptions: {
            input: buildEntry,
            output: {
              entryFileNames: `assets/js/hanlo-runtime-${themeVersion}.js`,
            },
          },
        },
      };
    },
    buildStart() {
      for (const template of collectLegacyTemplates(sourceRoot)) this.addWatchFile(template);
    },
    writeBundle() {
      rmSync(path.join(outputRoot, ".build-entry.html"), { force: true });
      copyLegacyTemplates();
    },
  };
}

export default defineConfig({
  // Vite Plus is API-compatible with Vite, but both packages publish nominal plugin types.
  plugins: [
    haloThemePlugin() as unknown as Plugin,
    sanitizeGeneratedDependencyPaths(),
    preserveLegacyTemplates(),
  ],
  lint: {
    options: { typeAware: true, typeCheck: true },
    ignorePatterns: [".agents", "dist", "public", "templates"],
  },
  fmt: {
    printWidth: 100,
    tabWidth: 2,
    useTabs: false,
    endOfLine: "lf",
    sortPackageJson: true,
    insertFinalNewline: true,
    sortImports: {},
    ignorePatterns: [".agents", "dist", "public", "templates", "src/**/*.html"],
  },
});
