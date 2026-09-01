import type { ThemeConfig } from "./config";
import type { HanloLifecycleApi } from "./runtime";
import type { PageControllerDefinition } from "./types";

interface Destroyable {
  destroy(...arguments_: unknown[]): unknown;
}

interface HanloPjax {
  loadUrl(url: string, options?: unknown): unknown;
}

interface SnackbarOptions {
  readonly text: string;
  readonly backgroundColor?: unknown;
  readonly onActionClick?: (element: HTMLElement) => void;
  readonly actionText?: string;
  readonly showAction?: boolean;
  readonly duration?: number | string;
  readonly pos?: unknown;
  readonly customClass?: string;
}

interface SnackbarApi {
  show(options: SnackbarOptions): void;
}

interface FjGalleryOptions {
  readonly itemSelector: string;
  readonly rowHeight: number;
  readonly gutter: number;
  readonly onJustify: () => void;
}

interface JQueryCollection {
  readonly length: number;
  attr(name: string): string | undefined;
  attr(name: string, value: string): JQueryCollection;
  each(callback: (index: number, element: Element) => void): JQueryCollection;
  fancybox?(options: Readonly<Record<string, unknown>>): JQueryCollection;
  wrap(html: string): JQueryCollection;
}

interface JQueryStatic {
  (input?: unknown): JQueryCollection;
  readonly fancybox?: unknown;
  getScript(url: string, callback: () => void): void;
}

interface LazyLoadInstance extends Destroyable {
  update(): void;
}

interface LazyLoadConstructor {
  new (options: Readonly<Record<string, unknown>>): LazyLoadInstance;
}

interface SwiperInstance extends Destroyable {}

interface SwiperConstructor {
  new (selector: string, options: Readonly<Record<string, unknown>>): SwiperInstance;
}

interface TocbotApi extends Destroyable {
  init(options: Readonly<Record<string, unknown>>): void;
}

interface QrCodeConstructor {
  new (element: HTMLElement, options: Readonly<Record<string, unknown>>): unknown;
  readonly CorrectLevel: Readonly<{ readonly H: unknown }>;
}

interface FastAverageColorResult {
  readonly hex: string;
}

interface FastAverageColorInstance extends Destroyable {
  getColorAsync(
    source: string,
    options?: Readonly<Record<string, unknown>>,
  ): Promise<FastAverageColorResult>;
}

interface FastAverageColorConstructor {
  new (): FastAverageColorInstance;
}

declare global {
  interface Window {
    GLOBAL_CONFIG: Readonly<ThemeConfig>;
    HanloLifecycle?: HanloLifecycleApi;
    HanloPageControllers?: PageControllerDefinition[];
    pjax?: HanloPjax;
    fjGallery?: (element: HTMLElement, options: FjGalleryOptions) => void;
    $?: JQueryStatic;
    FastAverageColor?: FastAverageColorConstructor;
    jQuery?: JQueryStatic;
    LazyLoad?: LazyLoadConstructor;
    QRCode?: QrCodeConstructor;
    Snackbar?: SnackbarApi;
    Swiper?: SwiperConstructor;
    waterfall?: (selector: string) => void;
    tocbot?: TocbotApi;
  }
}

export {};
