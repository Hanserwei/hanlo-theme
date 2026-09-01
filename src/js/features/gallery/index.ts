import type { PageResourceScope } from "../../core/resource-scope";

const IMAGE_SELECTOR =
  "#article-container :not(a):not(.rss-plan-info-group):not(.no-lightbox) > img, #article-container > img, .bber-container-img > img";

function imageSource(image: HTMLImageElement): string {
  return image.dataset["lazySrc"] || image.currentSrc || image.src;
}

function galleryImages(clicked: HTMLImageElement): HTMLImageElement[] {
  const boundary = clicked.closest("#article-container, .bber-container-img") ?? document;
  return Array.from(boundary.querySelectorAll<HTMLImageElement>(IMAGE_SELECTOR)).filter(
    (image) =>
      Boolean(imageSource(image)) &&
      !image.closest("a") &&
      !image.classList.contains("no-lightbox"),
  );
}

function createLightbox(
  images: readonly HTMLImageElement[],
  startIndex: number,
  trigger: HTMLImageElement,
): HTMLElement {
  let index = startIndex;
  const overlay = document.createElement("div");
  overlay.className = "hanlo-lightbox";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-label", "图片预览");
  overlay.innerHTML = `
    <button class="hanlo-lightbox__close" type="button" aria-label="关闭图片预览">×</button>
    <button class="hanlo-lightbox__previous" type="button" aria-label="上一张图片">‹</button>
    <figure><img alt=""><figcaption></figcaption></figure>
    <button class="hanlo-lightbox__next" type="button" aria-label="下一张图片">›</button>
    <output class="hanlo-lightbox__count" aria-live="polite"></output>`;
  const preview = overlay.querySelector<HTMLImageElement>("figure img")!;
  const caption = overlay.querySelector<HTMLElement>("figcaption")!;
  const count = overlay.querySelector<HTMLOutputElement>("output")!;

  const render = (): void => {
    const image = images[index]!;
    preview.src = imageSource(image);
    preview.alt = image.alt || "预览图片";
    caption.textContent = image.alt;
    caption.hidden = !image.alt;
    count.value = `${index + 1} / ${images.length}`;
  };
  const close = (): void => {
    document.body.classList.remove("hanlo-lightbox-open");
    overlay.remove();
    if (trigger.isConnected) trigger.focus({ preventScroll: true });
  };
  const move = (step: number): void => {
    index = (index + step + images.length) % images.length;
    render();
  };
  const focusable = (): HTMLButtonElement[] =>
    Array.from(overlay.querySelectorAll<HTMLButtonElement>("button:not([disabled])"));

  overlay.querySelector(".hanlo-lightbox__close")?.addEventListener("click", close);
  overlay.querySelector(".hanlo-lightbox__previous")?.addEventListener("click", () => move(-1));
  overlay.querySelector(".hanlo-lightbox__next")?.addEventListener("click", () => move(1));
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });
  overlay.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      move(event.key === "ArrowLeft" ? -1 : 1);
      return;
    }
    if (event.key !== "Tab") return;
    const controls = focusable();
    if (controls.length === 0) {
      event.preventDefault();
      overlay.focus();
      return;
    }
    const current = controls.indexOf(document.activeElement as HTMLButtonElement);
    const next = event.shiftKey
      ? current <= 0
        ? controls.length - 1
        : current - 1
      : current < 0 || current === controls.length - 1
        ? 0
        : current + 1;
    event.preventDefault();
    controls[next]?.focus();
  });
  render();
  document.body.classList.add("hanlo-lightbox-open");
  document.body.append(overlay);
  overlay.querySelector<HTMLButtonElement>(".hanlo-lightbox__close")?.focus();
  return overlay;
}

export function mountNativeGallery(resources: PageResourceScope): void {
  document.querySelectorAll<HTMLElement>("#article-container .gallery").forEach((gallery) => {
    gallery.classList.add("hanlo-native-gallery");
    gallery.style.opacity = "1";
  });
  document.querySelector("#article-container .loadings")?.classList.remove("loadings");

  let overlay: HTMLElement | undefined;
  resources.listen(document, "click", (event) => {
    const target = event.target;
    if (!(target instanceof HTMLImageElement) || !target.matches(IMAGE_SELECTOR)) return;
    if (target.closest("a") || target.classList.contains("no-lightbox")) return;
    const images = galleryImages(target);
    const index = images.indexOf(target);
    if (index < 0) return;
    event.preventDefault();
    overlay?.remove();
    if (target.tabIndex < 0) target.tabIndex = 0;
    overlay = createLightbox(images, index, target);
  });
  resources.defer(() => {
    overlay?.remove();
    document.body.classList.remove("hanlo-lightbox-open");
  });
}

export const galleryTestables = Object.freeze({ galleryImages, imageSource });
