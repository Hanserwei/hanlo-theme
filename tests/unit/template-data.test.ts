import { readFileSync } from "node:fs";

import { parseHTML } from "linkedom";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(`src/${path}`, "utf8");

describe("template data contracts", () => {
  it("loads at most one random post and guards the empty result", () => {
    const layout = source("modules/layouts/layout.html");
    expect(layout.match(/postFinder\.random\(1\)/g)).toHaveLength(1);
    expect(layout).not.toContain("postFinder.listAll()");
    expect(layout).toContain("not #lists.isEmpty(randomPosts)");
    expect(layout).toContain("randomPosts[0].status.permalink");
  });

  it("filters recommendations by metadata name before applying the display limit", () => {
    const related = source("modules/post/relatedPosts.html");
    expect(related).toContain("metadata.name != #ctx.getVariable('post').metadata.name");
    expect(related).toContain('th:each="recommandPost,iterStat : ${relatedPosts}"');
    expect(related).toContain("iterStat.index < (recommendQuantity == 'six' ? 6 : 2)");
    expect(related).not.toContain("post.spec.title, recommandPost.spec.title");
    expect(related.match(/class="relatedPosts-list"/g)).toHaveLength(1);
  });

  it("uses one subject resolver for all three comment layouts", () => {
    for (const [path, layout] of [
      ["new_comment.html", "page"],
      ["modules/widgets/console.html", "console"],
      ["modules/widgets/aside/comments.html", "aside"],
    ]) {
      const template = source(path);
      expect(template).toContain(`comment-item(${"${comment}"}, '${layout}')`);
      expect(template).not.toContain("subjectRef");
    }
    const item = source("modules/common/comment-item.html");
    expect(item).toContain("ref.group == 'content.halo.run' and ref.kind == 'Post'");
    expect(item).toContain("ref.group == 'content.halo.run' and ref.kind == 'SinglePage'");
    expect(item).toContain(
      "ref.group == 'plugin.halo.run' and ref.kind == 'Plugin' and ref.name == 'PluginLinks'",
    );
    expect(item).toContain("photoSubject and pluginFinder.available('PluginPhotos')");
    expect(item).toContain("and not photoSubject ? singlePageFinder.getByName(ref.name)");
    expect(item).not.toContain("#strings.contains");
    expect(item).toContain("#strings.isEmpty(target) ? null");
    expect(item).not.toContain('th:href="${url}"');
    expect(item).toContain("评论目标不可用");
    expect(item).toContain("'#comment-' + comment.metadata.name");
  });

  it("guards shared link and album finders before resolving them", () => {
    const links = parseHTML(source("macro/content-links.html")).document;
    const finder = Array.from(links.querySelectorAll("th\\:block")).find((node) =>
      node.getAttribute("th:with")?.includes("linkFinder.groupBy()"),
    )!;
    expect(finder.parentElement?.getAttribute("th:if")).toBe(
      "${pluginFinder.available('PluginLinks')}",
    );
    expect(links.querySelector('[role="status"]')?.textContent).toContain("友链插件未启用");
    for (const path of ["links.html", "page_links.html"]) {
      expect(source(path)).toContain("macro/content-links :: content-links");
    }
    const album = source("album.html");
    expect(album.match(/photoFinder\.groupBy\(\)/g)).toHaveLength(1);
    expect(album).toContain("pluginFinder.available('PluginPhotos')");
    expect(album).toContain("图库插件未启用");
    const document = parseHTML(album).document;
    const groups = Array.from(document.querySelectorAll("th\\:block")).find((node) =>
      node.getAttribute("th:with")?.includes("photoFinder.groupBy()"),
    )!;
    expect(groups.parentElement?.getAttribute("th:if")).toBe(
      "${pluginFinder.available('PluginPhotos')}",
    );
  });
});
