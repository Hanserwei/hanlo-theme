import type { ThemeConfig } from "./config";
import type { PageResourceScope } from "./resource-scope";

export type NavigationSource = "initial" | "pjax" | "history" | "document";
export type NavigationDirection = "forward" | "backward" | "unknown";

export interface NavigationContext {
  readonly id: number;
  readonly source: NavigationSource;
  readonly direction: NavigationDirection;
  readonly url: string;
}

export interface PageController {
  mount(root: ParentNode): void | Promise<void>;
  unmount(): void | Promise<void>;
}

export interface PageControllerContext {
  readonly config: Readonly<ThemeConfig>;
  readonly navigation: Readonly<NavigationContext>;
  readonly resources: PageResourceScope;
}

export interface PageControllerDefinition {
  readonly name: string;
  readonly create: (context: PageControllerContext) => PageController;
  readonly when?: (context: Omit<PageControllerContext, "resources">) => boolean;
}

export interface PageLifecycleEventDetail {
  readonly navigation: Readonly<NavigationContext>;
  readonly config?: Readonly<ThemeConfig>;
  readonly error?: unknown;
}
