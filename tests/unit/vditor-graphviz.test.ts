import { afterEach, describe, expect, it, vi } from "vitest";

import { PageResourceScope } from "../../src/js/core/resource-scope";
import type { VditorWindow } from "../../src/js/features/vditor/diagrams";
import { renderGraphviz } from "../../src/js/features/vditor/graphviz";

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function fixture() {
  const terminate = vi.fn();
  vi.stubGlobal(
    "Worker",
    class {
      terminate = terminate;
    },
  );
  vi.spyOn(URL, "createObjectURL").mockReturnValue("blob:graphviz");
  const revoke = vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});
  const replaceChildren = vi.fn();
  const element = {
    isConnected: true,
    dataset: {},
    replaceChildren,
    ownerDocument: {
      getElementById: () => ({ src: "https://cdn.example.test/vditor/dist/js/graphviz/viz.js" }),
      importNode: (node: unknown) => node,
    },
  } as unknown as HTMLElement;
  let resolve!: (node: SVGElement) => void;
  const render = vi.fn(
    () =>
      new Promise<SVGElement>((done) => {
        resolve = done;
      }),
  );
  const win = {
    Viz: class {
      renderSVGElement = render;
    },
  } as unknown as VditorWindow;
  return {
    terminate,
    revoke,
    replaceChildren,
    element,
    win,
    render,
    finish: () => resolve({} as SVGElement),
  };
}

describe("Graphviz redraw lifecycle", () => {
  it("terminates each redraw worker and revokes its URL after rendering", async () => {
    const h = fixture();
    const resources = new PageResourceScope();
    const pending = renderGraphviz(h.element, "digraph { 用户 -> 发布 }", h.win, resources);
    h.finish();
    await pending;
    expect(h.render).toHaveBeenCalledWith("digraph { 用户 -> 发布 }");
    expect(h.replaceChildren).toHaveBeenCalledOnce();
    expect(h.terminate).toHaveBeenCalledOnce();
    expect(h.revoke).toHaveBeenCalledWith("blob:graphviz");
    await resources.dispose();
    expect(h.terminate).toHaveBeenCalledOnce();
  });

  it("releases a pending worker on navigation and ignores its stale result", async () => {
    const h = fixture();
    const resources = new PageResourceScope();
    const pending = renderGraphviz(h.element, "digraph {}", h.win, resources);
    await resources.dispose();
    expect(h.terminate).toHaveBeenCalledOnce();
    h.finish();
    await pending;
    expect(h.replaceChildren).not.toHaveBeenCalled();
    expect(h.revoke).toHaveBeenCalledOnce();
  });
});
