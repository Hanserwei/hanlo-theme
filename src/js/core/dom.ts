export interface ThrottledFunction<Arguments extends unknown[]> {
  (...arguments_: Arguments): void;
  cancel(): void;
}

export function throttle<Arguments extends unknown[]>(
  callback: (...arguments_: Arguments) => void,
  wait: number,
): ThrottledFunction<Arguments> {
  let lastRun = 0;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let pendingArguments: Arguments | undefined;

  const run = () => {
    lastRun = Date.now();
    timeout = undefined;
    const arguments_ = pendingArguments;
    pendingArguments = undefined;
    if (arguments_) callback(...arguments_);
  };

  const throttled = (...arguments_: Arguments) => {
    pendingArguments = arguments_;
    const remaining = wait - (Date.now() - lastRun);
    if (remaining <= 0) {
      if (timeout) clearTimeout(timeout);
      run();
    } else if (!timeout) {
      timeout = setTimeout(run, remaining);
    }
  };

  throttled.cancel = () => {
    if (timeout) clearTimeout(timeout);
    timeout = undefined;
    pendingArguments = undefined;
  };
  return throttled;
}

export function scrollToDestination(target: number): void {
  if (target < 0) return;
  window.scrollTo({ top: Math.max(0, target - 70), behavior: "smooth" });
}

export function isHidden(element: HTMLElement): boolean {
  return element.offsetHeight === 0 && element.offsetWidth === 0;
}

export function elementTop(element: HTMLElement): number {
  return element.getBoundingClientRect().top + window.scrollY;
}

export function closestParent(element: Element, selector: string): HTMLElement | null {
  return element.closest<HTMLElement>(selector);
}

export function siblings(element: Element, selector?: string): Element[] {
  const parent = element.parentElement;
  if (!parent) return [];
  return Array.from(parent.children).filter(
    (candidate) => candidate !== element && (!selector || candidate.matches(selector)),
  );
}

export function wrapElement(
  element: Element,
  tagName: keyof HTMLElementTagNameMap,
  className = "",
): HTMLElement {
  const wrapper = document.createElement(tagName);
  wrapper.className = className;
  element.parentNode?.insertBefore(wrapper, element);
  wrapper.append(element);
  return wrapper;
}

export function changeContent(content: string, maximumLength?: number): string {
  let result = content
    .replace(/<img.*?src="(.*?)"?[^>]+>/gi, "[图片]")
    .replace(/<a[^>]+?href=["']?([^"']+)["']?[^>]*>([^<]+)<\/a>/gi, "[链接]")
    .replace(/<pre><code>.*?<\/pre>/gi, "[代码]")
    .replace(/<[^>]+>/g, "");
  if (maximumLength !== undefined && result.length > maximumLength) {
    result = `${result.slice(0, maximumLength)}...`;
  }
  return result;
}
