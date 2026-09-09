// These fences are executable renderers, even when Shiki also has a grammar for them.
const DIAGRAM_LANGUAGES = new Set([
  "math",
  "mermaid",
  "echarts",
  "mindmap",
  "markmap",
  "abc",
  "flowchart",
  "graphviz",
  "plantuml",
]);

export function isDiagramLanguage(language: string): boolean {
  return DIAGRAM_LANGUAGES.has(language.trim().toLowerCase());
}
