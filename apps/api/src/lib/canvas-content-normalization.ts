import {
  parseFragment,
  type DefaultTreeAdapterMap,
} from "parse5";

import { sanitizeCanvasPreviewText } from "./canvas-source-safety";

type HtmlNode = DefaultTreeAdapterMap["node"];
type HtmlElement = DefaultTreeAdapterMap["element"];
type HtmlTextNode = DefaultTreeAdapterMap["textNode"];

const NON_CONTENT_WORDS = new Set([
  "add",
  "back",
  "calendar",
  "cancel",
  "delete",
  "edit",
  "grades",
  "home",
  "menu",
  "modules",
  "next",
  "overview",
  "previous",
  "publish",
  "published",
  "save",
  "settings",
  "unpublish",
]);

const SKIPPED_TAGS = new Set([
  "button",
  "canvas",
  "embed",
  "form",
  "iframe",
  "input",
  "nav",
  "object",
  "script",
  "select",
  "style",
  "svg",
  "textarea",
]);

const BLOCK_TAGS = new Set([
  "address",
  "article",
  "aside",
  "blockquote",
  "div",
  "dl",
  "fieldset",
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
  "main",
  "p",
  "pre",
  "section",
  "table",
]);

const CANVAS_CHROME_CLASSES = [
  "ic-app-header",
  "navigation-tray",
  "module-sequence-footer",
  "module-sequence-padding",
  "ui-menu",
  "screenreader-only",
  "sr-only",
];

/** Deterministic boundary for turning synchronized Canvas HTML into source text. */
export function normalizeCanvasHtmlToText(html: string | null): string {
  if (!html?.trim()) {
    return "";
  }

  const fragment = parseFragment(html);
  const writer = createTextWriter();
  walkHtmlChildren(fragment.childNodes, writer, { orderedListStack: [] });
  return sanitizeCanvasPreviewText(writer.toString());
}

/** Evidence check: content must contain instructional tokens, not merely UI labels. */
export function isMeaningfulCanvasContent(text: string): boolean {
  const normalized = sanitizeCanvasPreviewText(text);
  if (!normalized) {
    return false;
  }

  const tokens = normalized.match(/[\p{L}\p{N}]+(?:[./+#-][\p{L}\p{N}]+)*/gu) ?? [];
  const meaningful = tokens.filter((token) => {
    const lower = token.toLocaleLowerCase("en-US");
    return !NON_CONTENT_WORDS.has(lower) && !/^source\d*$/i.test(token);
  });

  if (meaningful.length >= 2) {
    return true;
  }
  if (meaningful.length !== 1) {
    return false;
  }

  const token = meaningful[0];
  return (
    /\d/.test(token) ||
    /[./+#-]/.test(token) ||
    (/^[A-Z\d]{2,8}$/.test(token) && token.length >= 2)
  );
}

interface HtmlWalkContext {
  readonly orderedListStack: readonly number[];
}

interface TextWriter {
  readonly blockBreak: () => void;
  readonly lineBreak: () => void;
  readonly text: (value: string) => void;
  readonly toString: () => string;
}

function walkHtmlChildren(
  nodes: readonly HtmlNode[],
  writer: TextWriter,
  context: HtmlWalkContext,
): void {
  for (const node of nodes) {
    walkHtmlNode(node, writer, context);
  }
}

function walkHtmlNode(
  node: HtmlNode,
  writer: TextWriter,
  context: HtmlWalkContext,
): void {
  if (isTextNode(node)) {
    writer.text(node.value);
    return;
  }
  if (!isElementNode(node) || shouldSkipElement(node)) {
    return;
  }

  const tag = node.tagName.toLowerCase();
  if (tag === "br") {
    writer.lineBreak();
    return;
  }
  if (tag === "li") {
    const itemNumber = context.orderedListStack.at(-1);
    writer.blockBreak();
    writer.text(itemNumber === undefined ? "- " : `${itemNumber}. `);
    walkHtmlChildren(node.childNodes, writer, context);
    writer.lineBreak();
    return;
  }
  if (tag === "ol") {
    writer.blockBreak();
    let listIndex = 0;
    for (const child of node.childNodes) {
      if (isElementNode(child) && child.tagName.toLowerCase() === "li") {
        listIndex += 1;
      }
      walkHtmlNode(child, writer, {
        orderedListStack: [...context.orderedListStack, listIndex],
      });
    }
    writer.blockBreak();
    return;
  }
  if (tag === "ul") {
    writer.blockBreak();
    walkHtmlChildren(node.childNodes, writer, context);
    writer.blockBreak();
    return;
  }
  if (tag === "tr") {
    writer.blockBreak();
    walkHtmlChildren(node.childNodes, writer, context);
    writer.lineBreak();
    return;
  }
  if (tag === "td" || tag === "th") {
    walkHtmlChildren(node.childNodes, writer, context);
    writer.text(" | ");
    return;
  }
  if (BLOCK_TAGS.has(tag)) {
    writer.blockBreak();
    walkHtmlChildren(node.childNodes, writer, context);
    writer.blockBreak();
    return;
  }
  walkHtmlChildren(node.childNodes, writer, context);
}

function createTextWriter(): TextWriter {
  const parts: string[] = [];

  function appendBreak(count: 1 | 2): void {
    const current = parts.join("").replace(/[ \t]+$/g, "");
    parts.length = 0;
    parts.push(current);
    const existingBreaks = /\n*$/.exec(current)?.[0].length ?? 0;
    if (current.length > 0 && existingBreaks < count) {
      parts.push("\n".repeat(count - existingBreaks));
    }
  }

  return {
    blockBreak: () => appendBreak(2),
    lineBreak: () => appendBreak(1),
    text: (value) => {
      const normalized = value.replace(/\s+/g, " ");
      if (!normalized.trim()) return;
      const current = parts.join("");
      const needsSpace =
        current.length > 0 &&
        !/[\s(]$/.test(current) &&
        !/^[,.;:!?)]/.test(normalized);
      parts.push(`${needsSpace ? " " : ""}${normalized.trim()}`);
    },
    toString: () =>
      parts
        .join("")
        .replace(/[ \t]*\|[ \t]*(?=\n|$)/g, "")
        .replace(/[ \t]+\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim(),
  };
}

function shouldSkipElement(node: HtmlElement): boolean {
  const tag = node.tagName.toLowerCase();
  if (SKIPPED_TAGS.has(tag)) return true;

  const hidden = getAttribute(node, "hidden");
  const ariaHidden = getAttribute(node, "aria-hidden");
  const role = getAttribute(node, "role")?.toLowerCase();
  const style = (getAttribute(node, "style")?.toLowerCase() ?? "").replace(/\s+/g, "");
  const classes = (getAttribute(node, "class")?.toLowerCase() ?? "").split(/\s+/);
  return (
    hidden !== null ||
    ariaHidden === "true" ||
    role === "navigation" ||
    style.includes("display:none") ||
    style.includes("visibility:hidden") ||
    classes.some((className) => CANVAS_CHROME_CLASSES.includes(className))
  );
}

function getAttribute(node: HtmlElement, name: string): string | null {
  return node.attrs.find((entry) => entry.name.toLowerCase() === name.toLowerCase())?.value ?? null;
}

function isTextNode(node: HtmlNode): node is HtmlTextNode {
  return node.nodeName === "#text" && "value" in node;
}

function isElementNode(node: HtmlNode): node is HtmlElement {
  return "tagName" in node && Array.isArray(node.childNodes);
}
