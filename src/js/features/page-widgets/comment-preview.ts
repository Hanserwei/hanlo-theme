import { parseFragment, type DefaultTreeAdapterMap } from "parse5";

type CommentNode = DefaultTreeAdapterMap["node"];

const omittedElements = new Set([
  "script",
  "style",
  "template",
  "noscript",
  "iframe",
  "object",
  "embed",
  "svg",
  "math",
]);
const separatedElements = new Set([
  "address",
  "article",
  "aside",
  "blockquote",
  "br",
  "dd",
  "div",
  "dl",
  "dt",
  "figcaption",
  "figure",
  "footer",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "header",
  "hr",
  "li",
  "main",
  "nav",
  "ol",
  "p",
  "pre",
  "section",
  "table",
  "td",
  "th",
  "tr",
  "ul",
]);

/** Parse into a plain syntax tree, without executing HTML or fetching embedded resources. */
export function commentHtmlToText(html: string): string {
  const text: string[] = [];
  function visit(node: CommentNode): void {
    if (node.nodeName === "#text" && "value" in node) {
      text.push(node.value);
      return;
    }
    if (omittedElements.has(node.nodeName)) return;
    if (node.nodeName === "img" && "attrs" in node) {
      const alt = node.attrs.find((attribute) => attribute.name === "alt")?.value;
      text.push(` ${alt || "[图片]"} `);
      return;
    }
    if (separatedElements.has(node.nodeName)) text.push(" ");
    if ("childNodes" in node) {
      for (const child of node.childNodes) visit(child);
    }
    if (separatedElements.has(node.nodeName)) text.push(" ");
  }
  visit(parseFragment(html));
  return text.join("").replace(/\s+/g, " ").trim();
}

export function mountCommentPreviews(root: ParentNode): void {
  const elements = root.querySelectorAll<HTMLElement>("[data-hanlo-comment-preview]");
  elements.forEach((element) => {
    const html = element.dataset["hanloCommentHtml"];
    if (html === undefined) return;
    const text = commentHtmlToText(html);
    element.textContent = text;
    element.closest("a")?.setAttribute("title", text);
    delete element.dataset["hanloCommentHtml"];
  });
}
