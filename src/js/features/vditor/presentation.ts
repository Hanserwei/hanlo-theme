import { DIAGRAM_SELECTOR, type Diagram, type VditorWindow } from "./diagrams";

export function prepareDiagrams(root: HTMLElement): void {
  root.classList.add("hanlo-vditor");
  root.querySelectorAll<HTMLElement>(DIAGRAM_SELECTOR).forEach((element) => {
    if (element.closest(".hanlo-vditor-block")) return;
    const block = element.parentElement?.tagName === "PRE" ? element.parentElement : element;
    const wrapper = root.ownerDocument.createElement("div");
    wrapper.className = "hanlo-vditor-block";
    wrapper.tabIndex = 0;
    wrapper.setAttribute("role", "region");
    wrapper.setAttribute("aria-label", "文章图表，可横向滚动");
    block.before(wrapper);
    wrapper.append(block);
    if (block !== element) block.classList.add("hanlo-vditor-pre");
  });
}

export function polishDiagram({ element, kind }: Diagram): void {
  if (kind === "abc") {
    element.querySelectorAll<SVGElement>("svg, path").forEach((node) => {
      node.style.color = "var(--heo-fontcolor)";
      if (node.getAttribute("fill") !== "none") node.style.fill = "currentColor";
    });
  }
  if (kind === "graphviz") {
    element.querySelectorAll<SVGElement>("polygon").forEach((node) => {
      node.style.fill = node.getAttribute("fill") ?? "black";
    });
  }
  if (kind === "mermaid") {
    const svg = element.querySelector<SVGSVGElement>("svg");
    const width = svg?.viewBox.baseVal.width;
    if (svg && width && width > 0) {
      svg.style.width = `${width}px`;
      svg.style.maxWidth = "none";
      svg.style.height = "auto";
    }
  }
}

export function polishChart(diagram: Diagram, root: HTMLElement, win: VditorWindow): void {
  const chart = win.echarts?.getInstanceByDom(diagram.element);
  if (!chart) return;
  if (diagram.kind === "mindmap") {
    const styles = win.getComputedStyle(root);
    chart.setOption({
      backgroundColor: "transparent",
      series: [
        {
          label: {
            color: styles.getPropertyValue("--heo-fontcolor").trim(),
            backgroundColor: styles.getPropertyValue("--heo-card-bg").trim(),
            borderColor: styles.getPropertyValue("--heo-secondtext").trim(),
          },
          lineStyle: { color: styles.getPropertyValue("--heo-secondtext").trim() },
        },
      ],
    });
  } else {
    try {
      const option: unknown = JSON.parse(diagram.source);
      if (option && typeof option === "object" && !Object.hasOwn(option, "backgroundColor")) {
        chart.setOption({ backgroundColor: "transparent" });
      }
    } catch {
      /* Preserve non-JSON plugin extensions and author styling. */
    }
  }
  chart.resize();
}

export function preconnectRenderOrigins(root: HTMLElement, cdn: string | undefined): void {
  const targets = [cdn];
  if (root.querySelector(".language-plantuml")) targets.push("https://www.plantuml.com");
  for (const target of targets) {
    if (!target) continue;
    try {
      const origin = new URL(target, root.ownerDocument.baseURI).origin;
      if (!origin.startsWith("https://") && !origin.startsWith("http://")) continue;
      if (origin === new URL(root.ownerDocument.baseURI).origin) continue;
      const links = root.ownerDocument.querySelectorAll<HTMLLinkElement>('link[rel="preconnect"]');
      if (Array.from(links).some((link) => link.href === `${origin}/` || link.href === origin))
        continue;
      const link = root.ownerDocument.createElement("link");
      link.rel = "preconnect";
      link.href = origin;
      root.ownerDocument.head.append(link);
    } catch {
      /* A malformed plugin CDN will be reported by its actual resource request. */
    }
  }
}
