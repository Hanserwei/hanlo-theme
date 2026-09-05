import type { PageResourceScope } from "../../core/resource-scope";

interface MenuPanel {
  readonly item: HTMLElement;
  readonly panel: HTMLElement;
  readonly control: HTMLButtonElement;
}

export function submenuViewportShift(left: number, width: number, viewport: number): number {
  const gutter = 16;
  const maximumLeft = Math.max(gutter, viewport - width - gutter);
  return Math.min(Math.max(left, gutter), maximumLeft) - left;
}

function positionPanel(panel: HTMLElement): void {
  panel.style.removeProperty("--hanlo-submenu-shift");
  const { left, width } = panel.getBoundingClientRect();
  const shift = submenuViewportShift(left, width, document.documentElement.clientWidth);
  panel.style.setProperty("--hanlo-submenu-shift", `${shift}px`);
}

export function mountDesktopMenus(resources: PageResourceScope): void {
  const root = document.querySelector<HTMLElement>("#menus");
  if (!root) return;
  const entries: MenuPanel[] = [];
  root.querySelectorAll<HTMLElement>(".menus_item, .recursion_menus_item").forEach((item) => {
    const panel = item.querySelector<HTMLElement>(":scope > .menus_item_child");
    const control = item.querySelector<HTMLButtonElement>(":scope > button[aria-controls]");
    if (panel && control) entries.push({ item, panel, control });
  });

  const close = (entry: MenuPanel) => {
    for (const candidate of entries) {
      if (entry.item.contains(candidate.item)) {
        candidate.item.dataset["expanded"] = "false";
        candidate.control.setAttribute("aria-expanded", "false");
      }
    }
  };
  const closeAll = () => entries.forEach(close);
  const open = (entry: MenuPanel) => {
    for (const sibling of entries) {
      if (sibling !== entry && sibling.item.parentElement === entry.item.parentElement) {
        close(sibling);
      }
    }
    entry.item.dataset["expanded"] = "true";
    entry.control.setAttribute("aria-expanded", "true");
    positionPanel(entry.panel);
  };

  for (const entry of entries) {
    close(entry);
    resources.listen(entry.item, "pointerenter", (event) => {
      if ((event as PointerEvent).pointerType !== "touch") open(entry);
    });
    resources.listen(entry.item, "pointerleave", (event) => {
      if ((event as PointerEvent).pointerType !== "touch") close(entry);
    });
    resources.listen(entry.item, "focusin", () => open(entry));
    resources.listen(entry.item, "focusout", (event) => {
      const next = (event as FocusEvent).relatedTarget;
      if (!(next instanceof Node) || !entry.item.contains(next)) close(entry);
    });
    resources.listen(entry.control, "click", (event) => {
      open(entry);
      if ((event as MouseEvent).detail === 0 || (event as PointerEvent).pointerType === "touch") {
        entry.panel.querySelector<HTMLElement>("a, button")?.focus();
      }
    });
    resources.listen(entry.item, "keydown", (event) => {
      const keyboard = event as KeyboardEvent;
      if (keyboard.key === "Escape") {
        keyboard.preventDefault();
        keyboard.stopPropagation();
        entry.control.focus();
        close(entry);
      } else if (keyboard.key === "ArrowDown" && keyboard.target === entry.control) {
        keyboard.preventDefault();
        keyboard.stopPropagation();
        open(entry);
        entry.panel.querySelector<HTMLElement>("a, button")?.focus();
      }
    });
  }

  root.dataset["menusReady"] = "true";
  resources.listen(document, "pointerdown", (event) => {
    if (event.target instanceof Node && !root.contains(event.target)) closeAll();
  });
  const reposition = () => {
    for (const { item, panel } of entries) {
      if (item.dataset["expanded"] === "true") positionPanel(panel);
    }
  };
  resources.listen(window, "resize", reposition);
  if (document.fonts) resources.listen(document.fonts, "loadingdone", reposition);
  resources.defer(() => {
    closeAll();
    delete root.dataset["menusReady"];
    for (const { item, panel } of entries) {
      delete item.dataset["expanded"];
      panel.style.removeProperty("--hanlo-submenu-shift");
    }
  });
}
