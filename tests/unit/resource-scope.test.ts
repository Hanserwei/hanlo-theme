import { afterEach, describe, expect, it, vi } from "vitest";

import { PageResourceScope } from "../../src/js/core/resource-scope";

afterEach(() => {
  vi.useRealTimers();
});

describe("PageResourceScope", () => {
  it("releases listeners, timers, observers, and third-party instances", async () => {
    vi.useFakeTimers();
    const scope = new PageResourceScope();
    const events = new EventTarget();
    let eventCalls = 0;
    let timerCalls = 0;
    let observerDisconnects = 0;
    let instanceDestroys = 0;

    scope.listen(events, "probe", () => eventCalls++);
    scope.timeout(() => timerCalls++, 10);
    scope.interval(() => timerCalls++, 10);
    scope.observe({
      disconnect: () => {
        observerDisconnects++;
      },
    });
    scope.track({ name: "player" }, () => {
      instanceDestroys++;
    });

    events.dispatchEvent(new Event("probe"));
    await vi.advanceTimersByTimeAsync(10);
    expect(eventCalls).toBe(1);
    expect(timerCalls).toBe(2);

    await scope.dispose();
    events.dispatchEvent(new Event("probe"));
    await vi.advanceTimersByTimeAsync(30);

    expect(eventCalls).toBe(1);
    expect(timerCalls).toBe(2);
    expect(observerDisconnects).toBe(1);
    expect(instanceDestroys).toBe(1);
    expect(scope.disposed).toBe(true);
  });

  it("is safe to dispose more than once", async () => {
    const scope = new PageResourceScope();
    const cleanup = vi.fn();
    scope.defer(cleanup);

    await scope.dispose();
    await scope.dispose();

    expect(cleanup).toHaveBeenCalledOnce();
    expect(() => scope.defer(cleanup)).toThrow("disposed page scope");
  });
});
