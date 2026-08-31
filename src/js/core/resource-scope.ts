export type ResourceCleanup = () => void | Promise<void>;

/**
 * Owns every browser resource created by one controller mount.
 * Disposing the scope is idempotent and releases resources in reverse order.
 */
export class PageResourceScope {
  readonly #abortController = new AbortController();
  readonly #cleanups: ResourceCleanup[] = [];
  readonly #intervals = new Set<ReturnType<typeof globalThis.setInterval>>();
  readonly #timeouts = new Set<ReturnType<typeof globalThis.setTimeout>>();
  readonly #animationFrames = new Set<number>();
  #disposed = false;

  get signal(): AbortSignal {
    return this.#abortController.signal;
  }

  get disposed(): boolean {
    return this.#disposed;
  }

  listen(
    target: EventTarget,
    type: string,
    listener: EventListenerOrEventListenerObject,
    options: AddEventListenerOptions | boolean = {},
  ): void {
    this.#assertActive();
    const normalizedOptions = typeof options === "boolean" ? { capture: options } : { ...options };
    target.addEventListener(type, listener, {
      ...normalizedOptions,
      signal: this.signal,
    });
  }

  timeout(callback: () => void, delay = 0): ReturnType<typeof globalThis.setTimeout> {
    this.#assertActive();
    const timeout = globalThis.setTimeout(() => {
      this.#timeouts.delete(timeout);
      if (!this.#disposed) callback();
    }, delay);
    this.#timeouts.add(timeout);
    return timeout;
  }

  interval(callback: () => void, delay = 0): ReturnType<typeof globalThis.setInterval> {
    this.#assertActive();
    const interval = globalThis.setInterval(() => {
      if (!this.#disposed) callback();
    }, delay);
    this.#intervals.add(interval);
    return interval;
  }

  animationFrame(callback: FrameRequestCallback): number {
    this.#assertActive();
    const frame = globalThis.requestAnimationFrame((timestamp) => {
      this.#animationFrames.delete(frame);
      if (!this.#disposed) callback(timestamp);
    });
    this.#animationFrames.add(frame);
    return frame;
  }

  observe<T extends { disconnect(): void }>(observer: T): T {
    this.defer(() => observer.disconnect());
    return observer;
  }

  track<T>(resource: T, cleanup: (resource: T) => void | Promise<void>): T {
    this.defer(() => cleanup(resource));
    return resource;
  }

  defer(cleanup: ResourceCleanup): void {
    this.#assertActive();
    this.#cleanups.push(cleanup);
  }

  async dispose(): Promise<void> {
    if (this.#disposed) return;
    this.#disposed = true;
    this.#abortController.abort();

    for (const timeout of this.#timeouts) globalThis.clearTimeout(timeout);
    for (const interval of this.#intervals) globalThis.clearInterval(interval);
    if (typeof globalThis.cancelAnimationFrame === "function") {
      for (const frame of this.#animationFrames) globalThis.cancelAnimationFrame(frame);
    }
    this.#timeouts.clear();
    this.#intervals.clear();
    this.#animationFrames.clear();

    const errors: unknown[] = [];
    for (const cleanup of this.#cleanups.reverse()) {
      try {
        await cleanup();
      } catch (error) {
        errors.push(error);
      }
    }
    this.#cleanups.length = 0;

    if (errors.length > 0) {
      throw new AggregateError(errors, "One or more page resources could not be disposed.");
    }
  }

  #assertActive(): void {
    if (this.#disposed) throw new Error("Cannot add a resource to a disposed page scope.");
  }
}
