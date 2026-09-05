import type { ThemeConfig } from "../../core/config";
import type { PageResourceScope } from "../../core/resource-scope";

const DEFAULT_GREETING = "👋 你好，很高兴认识你";

export function profileGreetings(values: readonly string[] | undefined): string[] {
  const items = values?.flatMap((value) => value.split(/[,，\n]/).map((item) => item.trim()));
  const greetings = [...new Set(items?.filter(Boolean))];
  return greetings.length > 0 ? greetings : [DEFAULT_GREETING];
}

export function nextProfileGreeting(
  greetings: readonly string[],
  previous: string,
  random = Math.random(),
): string {
  const candidates = greetings.filter((value) => value !== previous);
  const index = Math.min(
    candidates.length - 1,
    Math.max(0, Math.floor(random * candidates.length)),
  );
  return candidates[index] ?? greetings[0] ?? DEFAULT_GREETING;
}

function mountProfileIntroduction(
  card: HTMLElement,
  index: number,
  resources: PageResourceScope,
): void {
  const description = card.querySelector<HTMLElement>("[data-profile-description]");
  const portrait = card.querySelector<HTMLElement>("[data-profile-portrait]");
  const toggle = card.querySelector<HTMLButtonElement>("[data-profile-toggle]");
  const label = toggle?.querySelector<HTMLElement>("[data-profile-toggle-text]");
  if (!description || !portrait || !toggle || !label) return;
  if (!description.textContent?.trim() && !description.querySelector("img, video, svg")) return;

  let pinned = false;
  let hovered = false;
  let expanded = false;
  const previousId = description.id;
  description.id = `hanlo-profile-description-${index}`;
  toggle.setAttribute("aria-controls", description.id);
  toggle.hidden = false;

  const show = (value: boolean) => {
    expanded = value;
    card.dataset["showDescription"] = String(value);
    description.hidden = !value;
    portrait.setAttribute("aria-hidden", String(value));
    toggle.setAttribute("aria-expanded", String(value));
    label.textContent = value ? "查看头像" : "认识我";
  };
  show(false);

  resources.listen(card, "pointerenter", (event) => {
    if ((event as PointerEvent).pointerType !== "mouse") return;
    hovered = true;
    show(true);
  });
  resources.listen(card, "pointerleave", () => {
    hovered = false;
    if (!pinned && !description.contains(document.activeElement)) show(false);
  });
  resources.listen(toggle, "click", () => {
    pinned = !expanded;
    show(pinned);
  });
  resources.listen(card, "focusout", (event) => {
    const next = (event as FocusEvent).relatedTarget;
    if (!pinned && !hovered && (!(next instanceof Node) || !card.contains(next))) show(false);
  });
  resources.listen(card, "keydown", (event) => {
    if ((event as KeyboardEvent).key !== "Escape" || !expanded) return;
    event.preventDefault();
    event.stopPropagation();
    pinned = false;
    toggle.focus();
    show(false);
  });
  resources.defer(() => {
    show(false);
    toggle.hidden = true;
    toggle.removeAttribute("aria-controls");
    description.id = previousId;
    delete card.dataset["showDescription"];
  });
}

export function mountProfileCards(
  config: Readonly<Pick<ThemeConfig, "helloText">>,
  resources: PageResourceScope,
): void {
  const greetings = profileGreetings(config.helloText);
  document.querySelectorAll<HTMLElement>("[data-profile-card]").forEach((card, index) => {
    const button = card.querySelector<HTMLButtonElement>("[data-profile-greeting]");
    const text = button?.querySelector<HTMLElement>("[data-profile-greeting-text]");
    if (button && text) {
      const change = () => {
        text.textContent = nextProfileGreeting(greetings, text.textContent ?? "");
        button.setAttribute(
          "aria-label",
          `${text.textContent}。${greetings.length > 1 ? "点击切换标签" : "个人标签"}`,
        );
      };
      change();
      button.disabled = greetings.length < 2;
      button.title = greetings.length > 1 ? "换一个标签" : "个人标签";
      resources.listen(button, "click", change);
    }
    mountProfileIntroduction(card, index, resources);
  });
}
