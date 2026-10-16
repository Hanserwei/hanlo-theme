import { readFileSync } from "node:fs";

import { parseHTML } from "linkedom";
import { describe, expect, it } from "vitest";

const source = readFileSync("src/links.html", "utf8");
const { document } = parseHTML(source);
const custom = readFileSync("src/page_links.html", "utf8");
const macro = readFileSync("src/macro/content-links.html", "utf8");

describe("native link application template contract", () => {
  it("mounts the application independently of the comment switch", () => {
    const section = document.getElementById("link-application")!;
    const form = section.querySelector("form")!;
    expect(section.getAttribute("th:if")).toBeNull();
    expect(form.getAttribute("th:if")).toBe("${linkApplicationEnabled == true}");
    expect(form.getAttribute("method")).toBe("post");
    expect(form.getAttribute("enctype")).toBe("application/x-www-form-urlencoded");
    expect(form.getAttribute("th:action")).toBe("@{/links/apply/submit}");
    expect(section.outerHTML).not.toContain("enable_comment");
    expect(section.querySelector("[th\\:unless]")?.textContent).toContain("暂未开放");
  });

  it("provides the native required and optional fields with accessible labels", () => {
    const form = document.getElementById("link-application-form")!;
    for (const name of ["url", "displayName", "captchaCode"]) {
      const input = form.querySelector(`[name="${name}"]`)!;
      expect(input.hasAttribute("required")).toBe(true);
      expect(form.querySelector(`label[for="${input.id}"]`)).not.toBeNull();
    }
    const csrf = form.querySelector('[name="_csrf"]')!;
    expect(csrf.getAttribute("type")).toBe("hidden");
    expect(csrf.getAttribute("th:value")).toBe("${csrfToken}");
    for (const name of ["logo", "description", "email", "backlink", "feedUrls"]) {
      const input = form.querySelector(`[name="${name}"]`)!;
      expect(input.hasAttribute("required")).toBe(false);
      expect(form.querySelector(`label[for="${input.id}"]`)).not.toBeNull();
    }
    expect(form.querySelector('[type="submit"]')).not.toBeNull();
  });

  it("renders redirect feedback and field values only as escaped text or attributes", () => {
    const section = document.getElementById("link-application")!;
    const alert = section.querySelector('[role="alert"]')!;
    expect(alert.getAttribute("th:text")).toBeTruthy();
    expect(section.outerHTML).not.toContain("th:utext");
    expect(section.querySelector('[role="status"]')?.textContent).toContain("等待审核");
    expect(section.querySelector('[name="captchaCode"]')?.getAttribute("th:value")).toBeNull();
    for (const name of [
      "url",
      "displayName",
      "logo",
      "email",
      "backlink",
      "description",
      "feedUrls",
    ]) {
      const input = section.querySelector(`[name="${name}"]`)!;
      expect(input.getAttribute("th:value") ?? input.getAttribute("th:text")).toContain(
        `'${name}'`,
      );
    }
  });

  it("keeps captcha refresh optional and provides a no-script reload target", () => {
    expect(document.getElementById("link-application-captcha")?.getAttribute("th:src")).toBe(
      "@{/links/apply/captcha}",
    );
    const refresh = document.querySelector('[data-hanlo-action="refresh-link-captcha"]')!;
    expect(refresh.getAttribute("type")).toBe("button");
    expect(refresh.hasAttribute("hidden")).toBe(true);
    expect(source).toContain("@{/links#link-application}");
  });

  it("passes explicit context so custom pages never read the plugin CSRF model", () => {
    expect(source).toContain(
      "content-links(${htmlType}, ${linkApplicationEnabled == true}, '#link-application')",
    );
    expect(custom).toContain("content-links(${htmlType}, false, '/links#link-application')");
    expect(custom).not.toContain("${csrfToken}");
    expect(custom).not.toContain("${linkApplicationEnabled}");
    expect(macro).toContain(
      'th:fragment="content-links(htmlType, applicationEnabled, applicationTarget)"',
    );
    expect(macro).not.toContain("#post-comment");
    expect(macro).not.toContain("csrfToken");
    expect(macro).toContain("not applicationEnabled and pluginFinder.available('link-submit')");
    expect(macro).toContain('th:href="${applicationTarget}"');
  });
});
