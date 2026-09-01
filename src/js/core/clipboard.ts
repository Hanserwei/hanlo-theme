function fallbackCopyText(text: string): boolean {
  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.cssText = "position:fixed;opacity:0;pointer-events:none";
  document.body.append(textArea);
  textArea.focus();
  textArea.select();
  try {
    return document.execCommand("copy");
  } finally {
    textArea.remove();
  }
}

export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return true;
  }
  return fallbackCopyText(text);
}

export async function readTextFromClipboard(): Promise<string> {
  if (!navigator.clipboard?.readText || !window.isSecureContext) {
    throw new Error("Clipboard reading is unavailable outside a secure browser context.");
  }
  return navigator.clipboard.readText();
}
