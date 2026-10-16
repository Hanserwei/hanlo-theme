import { readFileSync } from "node:fs";

import { parseHTML } from "linkedom";
import { describe, expect, it } from "vitest";

// Both the authored template and the shipped template must use the plugin's identity.
// Rendering and disabled-plugin behavior are covered by the plugin's Thymeleaf tests.
describe.each(["src/equipments.html", "templates/equipments.html"])("%s", (file) => {
  const { document } = parseHTML(readFileSync(file, "utf8"));
  const availability = "${pluginFinder.available('han-equipment', '>=2.0.0')}";

  it("loads the enabled plugin's stylesheet from its own resource namespace", () => {
    const stylesheets = Array.from(document.querySelectorAll("link")).filter((link) =>
      link.getAttribute("th:href")?.includes("/plugins/"),
    );

    expect(stylesheets).toHaveLength(1);
    expect(stylesheets[0]!.getAttribute("th:href")).toBe(
      "@{/plugins/han-equipment/assets/static/equipment.css(v='2.0.0')}",
    );
    expect(stylesheets[0]!.getAttribute("th:if")).toBe(availability);
  });

  it("guards fragment resolution in a parent block and supplies the route's groups", () => {
    const content = document.getElementById("equipment")!;
    const fragments = Array.from(content.querySelectorAll("*")).filter((element) =>
      element.getAttribute("th:replace")?.includes("plugin:"),
    );

    expect(content.getAttribute("th:with")).toBe(`equipmentAvailable=${availability}`);
    expect(fragments).toHaveLength(1);
    expect(fragments[0]!.getAttribute("th:replace")).toBe(
      "~{plugin:han-equipment:modules/equipment :: list(groups=${groups})}",
    );
    // th:replace runs before th:if on the same element; the parent must own the guard.
    expect(fragments[0]!.parentElement!.getAttribute("th:if")).toBe("${equipmentAvailable}");
    const fallback = content.querySelector(".hanlo-equipment-unavailable")!;
    expect(fallback.getAttribute("th:unless")).toBe("${equipmentAvailable}");
    expect(fallback.textContent?.trim().length).toBeGreaterThan(0);
  });
});
