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

const TEXT_NODE = 3;
const ELEMENT_NODE = 1;

/** Parse into an inert DOM document, without executing HTML or fetching embedded resources. */
export function commentHtmlToText(html: string): string {
  if (!html) return "";
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const root = parsed.body ?? parsed.documentElement;
  if (!root) return "";

  const text: string[] = [];
  function visit(node: Node): void {
    if (node.nodeType === TEXT_NODE) {
      if (node.nodeValue) text.push(node.nodeValue);
      return;
    }
    if (node.nodeType !== ELEMENT_NODE) return;
    const element = node as Element;
    const tagName = element.tagName.toLowerCase();
    if (omittedElements.has(tagName)) return;
    if (tagName === "img") {
      const alt = element.getAttribute("alt");
      text.push(` ${alt || "[图片]"} `);
      return;
    }
    const separated = separatedElements.has(tagName);
    if (separated) text.push(" ");
    for (const child of Array.from(element.childNodes)) visit(child);
    if (separated) text.push(" ");
  }

  for (const child of Array.from(root.childNodes)) visit(child);
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
