import type { ThemeConfig } from "./config";
import { PageResourceScope } from "./resource-scope";
import type {
  NavigationContext,
  PageController,
  PageControllerContext,
  PageControllerDefinition,
} from "./types";

interface ActiveController {
  readonly name: string;
  readonly controller: PageController;
  readonly resources: PageResourceScope;
}

export class PageControllerRegistry {
  readonly #definitions = new Map<string, PageControllerDefinition>();
  #active: ActiveController[] = [];

  get activeNames(): readonly string[] {
    return this.#active.map(({ name }) => name);
  }

  register(definition: PageControllerDefinition): () => Promise<void> {
    const name = definition.name.trim();
    if (!name) throw new TypeError("A page controller name is required.");
    if (this.#definitions.has(name)) {
      throw new Error(`Page controller "${name}" is already registered.`);
    }

    this.#definitions.set(name, { ...definition, name });
    return async () => {
      this.#definitions.delete(name);
      const active = this.#active.find((entry) => entry.name === name);
      if (!active) return;
      this.#active = this.#active.filter((entry) => entry !== active);
      await this.#disposeActive(active);
    };
  }

  async mount(
    root: ParentNode,
    config: Readonly<ThemeConfig>,
    navigation: Readonly<NavigationContext>,
  ): Promise<void> {
    if (this.#active.length > 0) await this.unmount();

    const errors: unknown[] = [];
    for (const definition of this.#definitions.values()) {
      try {
        await this.mountDefinition(definition.name, root, config, navigation);
      } catch (error) {
        errors.push(error);
      }
    }

    if (errors.length > 0) {
      throw new AggregateError(errors, "One or more page controllers could not be mounted.");
    }
  }

  async mountDefinition(
    name: string,
    root: ParentNode,
    config: Readonly<ThemeConfig>,
    navigation: Readonly<NavigationContext>,
  ): Promise<void> {
    const definition = this.#definitions.get(name);
    if (!definition || this.#active.some((entry) => entry.name === name)) return;

    const resources = new PageResourceScope();
    const context: PageControllerContext = { config, navigation, resources };
    try {
      if (definition.when && !definition.when({ config, navigation })) {
        await resources.dispose();
        return;
      }
      const controller = definition.create(context);
      await controller.mount(root);
      const active = { name: definition.name, controller, resources };
      if (this.#definitions.get(name) !== definition) {
        await this.#disposeActive(active);
        return;
      }
      this.#active.push(active);
    } catch (error) {
      const errors = [error];
      try {
        await resources.dispose();
      } catch (cleanupError) {
        errors.push(cleanupError);
      }
      throw new AggregateError(errors, `Page controller "${name}" could not be mounted.`);
    }
  }

  async unmount(): Promise<void> {
    const active = this.#active.reverse();
    this.#active = [];
    const errors: unknown[] = [];

    for (const entry of active) {
      try {
        await this.#disposeActive(entry);
      } catch (error) {
        errors.push(error);
      }
    }

    if (errors.length > 0) {
      throw new AggregateError(errors, "One or more page controllers could not be unmounted.");
    }
  }

  async #disposeActive({ controller, resources }: ActiveController): Promise<void> {
    const errors: unknown[] = [];
    try {
      await controller.unmount();
    } catch (error) {
      errors.push(error);
    }
    try {
      await resources.dispose();
    } catch (error) {
      errors.push(error);
    }
    if (errors.length > 0) {
      throw new AggregateError(errors, "A page controller could not be fully unmounted.");
    }
  }
}
