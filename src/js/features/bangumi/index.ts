import type { PageControllerDefinition } from "../../core/types";

export function bangumiPageCount(itemCount: number, pageSize = 10): number {
  return Math.max(1, Math.ceil(itemCount / pageSize));
}

function panelItems(pagination: Element): HTMLElement[] {
  const parent = pagination.parentElement;
  if (!parent) return [];
  return Array.from(parent.children).filter(
    (element): element is HTMLElement =>
      element instanceof HTMLElement &&
      element !== pagination &&
      !element.classList.contains("bangumi-tab"),
  );
}

function showPage(pagination: HTMLElement, page: number): void {
  const items = panelItems(pagination);
  const pages = bangumiPageCount(items.length);
  const current = Math.max(0, Math.min(pages - 1, page));
  items.forEach((item, index) => {
    item.classList.toggle("bangumi-hide", Math.floor(index / 10) !== current);
  });
  const label = pagination.querySelector<HTMLElement>(".bangumi-pagenum");
  if (label) label.textContent = `${current + 1} / ${pages}`;
  pagination.dataset["page"] = String(current);
}

export function createBangumiController(): PageControllerDefinition {
  return {
    name: "bangumi",
    when: () => Boolean(document.querySelector(".bangumi-tabs")),
    create: ({ resources }) => ({
      mount() {
        const tabs = Array.from(document.querySelectorAll<HTMLElement>(".bangumi-tab"));
        const activate = (tab: HTMLElement) => {
          tabs.forEach((candidate) =>
            candidate.classList.toggle("bangumi-active", candidate === tab),
          );
          const panelId = tab.id.replace("tab", "item");
          document.querySelectorAll<HTMLElement>("[id^='bangumi-item']").forEach((panel) => {
            const active = panel.id === panelId;
            panel.classList.toggle("bangumi-show", active);
            panel.classList.toggle("bangumi-hide", !active);
          });
        };
        tabs.forEach((tab) => resources.listen(tab, "click", () => activate(tab)));
        const initial = tabs[1] ?? tabs[0];
        if (initial) activate(initial);

        document.querySelectorAll<HTMLElement>(".bangumi-pagination").forEach((pagination) => {
          showPage(pagination, 0);
          const page = () => Number.parseInt(pagination.dataset["page"] ?? "0", 10) || 0;
          const items = () => panelItems(pagination);
          const first = pagination.querySelector<HTMLElement>(".bangumi-firstpage");
          const previous = pagination.querySelector<HTMLElement>(".bangumi-previouspage");
          const next = pagination.querySelector<HTMLElement>(".bangumi-nextpage");
          const last = pagination.querySelector<HTMLElement>(".bangumi-lastpage");
          if (first) resources.listen(first, "click", () => showPage(pagination, 0));
          if (previous) {
            resources.listen(previous, "click", () => showPage(pagination, page() - 1));
          }
          if (next) resources.listen(next, "click", () => showPage(pagination, page() + 1));
          if (last) {
            resources.listen(last, "click", () =>
              showPage(pagination, bangumiPageCount(items().length) - 1),
            );
          }
        });
      },
      unmount() {},
    }),
  };
}
