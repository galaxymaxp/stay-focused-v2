export interface ProtectedSourceToken {
  readonly text: string;
  readonly index: number;
}

export interface SourceTokenFidelityViolation {
  readonly text: string;
  readonly index: number;
}

const MONTH_NAMES =
  "January|February|March|April|May|June|July|August|September|October|November|December";

const PROTECTED_PATTERNS: readonly RegExp[] = [
  /^[^\n]*\|[^\n]*$/gmu,
  /https?:\/\/[^\s<>"']+/giu,
  /[A-Za-z]:\\(?:[^\s\\]+\\)*[^\s\\]*/gu,
  /\b[\p{L}_$][\p{L}\p{N}_$]*\([^()\n]*\)/gu,
  /\bArticle[ \t]+[IVXLCDM]+,[ \t]*Section[ \t]+\d+(?:\.\d+)*\b/giu,
  /\bR\.A\.[ \t]*\d+\b/giu,
  new RegExp(
    `\\b(?:${MONTH_NAMES})[ \\t]+\\d{1,2},[ \\t]+\\d{4}\\b`,
    "giu",
  ),
  /\b(?:Fig|Sec|No)\.[ \t]*\d+(?:\.\d+)*\b/giu,
  /\bChapter[ \t]+\d+(?:\.\d+)*\.[ \t]+[^\n\u2022|]+/giu,
  /\b\d+(?:\.\d+)+[ \t]+[\p{L}][^\n\u2022|]*/gu,
  /\b(?:Dr|Mr|Mrs|Ms|Prof)\.[ \t]+[\p{L}][\p{L}.'-]*(?:[ \t]+[\p{L}][\p{L}.'-]*){0,3}/giu,
  /\b(?:[\p{L}]\.){2,}/gu,
  /\b(?:\d{1,3}\.){3}\d{1,3}(?:\/\d{1,2})?\b/gu,
  /\b\d{1,2}\/\d{1,2}(?:\/\d{2,4})?\b/gu,
  /\b\d+[ \t]*(?:\u00d7|x)[ \t]*10\^[-+]?\d+(?:[ \t]*[\p{L}]+(?:\/[\p{L}]+)?)?/giu,
  /\b\d+[ \t]*[\u2013\u2014-][ \t]*\d+(?:[ \t]+[\p{L}]+)?\b/gu,
  /\b\d+[ \t]*:[ \t]*\d+(?:[ \t]+[\p{L}]+)?\b/gu,
  /\b\d+[ \t]*(?:\u00d7|x)[ \t]*\d+(?:[ \t]+[\p{L}]+)?\b/giu,
  /[±][ \t]*\d+(?:\.\d+)?%/gu,
  /[≤≥][ \t]*\d+(?:\.\d+)?%?/gu,
  /\bpH[ \t]+\d+(?:\.\d+)?\b/giu,
  /\b\d+(?:\.\d+)+(?:\^[-+]?\d+)?(?:[A-Za-zµΩ°%]+(?:\/[A-Za-zµΩ°²³]+)?)?(?=$|[^\p{L}\p{N}_])/gu,
  /\b\d+(?:\.\d+)?(?:kΩ|MΩ|Ω|mV|V|mA|A|m|cm|mm|km|ms|s|kg|g|mol\/L|m\/s²|°C|%)(?=$|[^\p{L}\p{N}_])/giu,
  /\b\d+\^[-+]?\d+(?:[ \t]*[\p{L}]+(?:\/[\p{L}]+)?)?/giu,
  /\b[\p{L}][\p{L}\p{N}_]*(?:\^[+-]?\d+|\/[\p{L}\p{N}_]+)\b/gu,
  /\b(?=[A-Za-z0-9]*\d)(?:[A-Z][a-z]?\d*){2,}[+-]?\b/g,
  /\b[A-Z][a-z]?[+-]\b/g,
  /\b[\p{L}][₀-₉]+\b/gu,
  /\b[\p{L}]+-[\p{L}\p{N}]+\b/gu,
  /(?:^|[\s("'`])\.[A-Za-z0-9_-]+(?:\.[A-Za-z0-9_-]+)+(?=$|[\s,;:)"'`])/gmu,
  /\b[A-Za-z0-9_-]+(?:-[A-Za-z0-9_-]+)+\.[A-Za-z0-9_-]+\b/gu,
  /\b[A-Za-z0-9_-]+\.(?:js|jsx|ts|tsx|json|md|txt|css|html|py|java|c|cpp|h|env|local)\b/giu,
  /\b[A-Za-z][A-Za-z0-9]*-\d+[A-Za-z0-9-]*\b/gu,
  /\b[\p{L}]+\d+\b/gu,
  /\b\d+\b/gu,
];

const COMPONENT_PATTERN = /[\p{L}]+|\p{N}+/gu;

export function extractProtectedSourceTokens(
  value: string,
): readonly ProtectedSourceToken[] {
  const candidates: ProtectedSourceToken[] = [];

  for (const pattern of PROTECTED_PATTERNS) {
    pattern.lastIndex = 0;
    for (const match of value.matchAll(pattern)) {
      const rawText = match[0];
      const rawIndex = match.index ?? 0;
      const trimmed = trimPatternPadding(rawText);
      if (!trimmed.text) {
        continue;
      }
      candidates.push({
        text: trimmed.text,
        index: rawIndex + trimmed.leadingLength,
      });
    }
  }

  return candidates
    .sort(
      (left, right) =>
        left.index - right.index || right.text.length - left.text.length,
    )
    .filter((candidate, index, sorted) => {
      const previous = sorted
        .slice(0, index)
        .find(
          (entry) =>
            candidate.index >= entry.index &&
            candidate.index + candidate.text.length <=
              entry.index + entry.text.length,
        );
      return previous === undefined;
    });
}

export function findSourceTokenFidelityViolations(
  sourceText: string,
  visibleText: string,
): readonly SourceTokenFidelityViolation[] {
  if (!visibleText.trim()) {
    return [];
  }

  const sourceTokens = extractProtectedSourceTokens(sourceText);
  const visibleTokens = extractProtectedSourceTokens(visibleText);
  const sourceExactTokens = new Set(
    sourceTokens.map((token) => normalizeExactToken(token.text)),
  );
  const violations: SourceTokenFidelityViolation[] = [];

  for (const token of visibleTokens) {
    if (!sourceExactTokens.has(normalizeExactToken(token.text))) {
      violations.push({ text: token.text, index: token.index });
    }
  }

  for (const sourceToken of sourceTokens) {
    if (
      containsExactToken(visibleText, sourceToken.text) ||
      !resemblesPunctuationMutation(sourceToken.text, visibleText)
    ) {
      continue;
    }

    violations.push({
      text: visibleText.trim(),
      index: visibleText.search(/\S|$/),
    });
  }

  const seen = new Set<string>();
  return violations.filter((violation) => {
    const key = `${violation.index}\u001f${violation.text}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function resemblesPunctuationMutation(
  sourceToken: string,
  visibleText: string,
): boolean {
  const sourceFingerprint = fidelityFingerprint(sourceToken);
  const visibleFingerprint = fidelityFingerprint(visibleText);
  if (
    sourceFingerprint.length >= 2 &&
    sourceFingerprint === visibleFingerprint
  ) {
    return true;
  }

  const sourceComponents = fidelityComponents(sourceToken);
  const visibleComponents = fidelityComponents(visibleText);
  if (sourceComponents.length < 2 || visibleComponents.length < 2) {
    return false;
  }

  if (
    isSubsequence(visibleComponents, sourceComponents) &&
    visibleComponents.length / sourceComponents.length >=
      minimumSubsequenceRatio(sourceToken) &&
    sharesAlphabeticComponent(sourceComponents, visibleComponents)
  ) {
    return true;
  }

  return false;
}

function minimumSubsequenceRatio(sourceToken: string): number {
  return sourceToken.includes("|") ? 0.5 : 0.6;
}

function fidelityFingerprint(value: string): string {
  return fidelityComponents(value).join("");
}

function fidelityComponents(value: string): readonly string[] {
  return [...value.matchAll(COMPONENT_PATTERN)].map((match) =>
    normalizeUnicodeDigits(match[0]).toLocaleLowerCase(),
  );
}

function normalizeUnicodeDigits(value: string): string {
  return value
    .replace(/[₀⁰]/g, "0")
    .replace(/[₁¹]/g, "1")
    .replace(/[₂²]/g, "2")
    .replace(/[₃³]/g, "3")
    .replace(/₄/g, "4")
    .replace(/₅/g, "5")
    .replace(/₆/g, "6")
    .replace(/₇/g, "7")
    .replace(/₈/g, "8")
    .replace(/₉/g, "9");
}

function isSubsequence(
  candidate: readonly string[],
  source: readonly string[],
): boolean {
  let candidateIndex = 0;

  for (const component of source) {
    if (component === candidate[candidateIndex]) {
      candidateIndex += 1;
      if (candidateIndex === candidate.length) {
        return true;
      }
    }
  }

  return false;
}

function sharesAlphabeticComponent(
  left: readonly string[],
  right: readonly string[],
): boolean {
  const rightTerms = new Set(right.filter((component) => /\p{L}/u.test(component)));
  return left.some(
    (component) => /\p{L}/u.test(component) && rightTerms.has(component),
  );
}

function containsExactToken(value: string, token: string): boolean {
  return normalizeExactToken(value).includes(normalizeExactToken(token));
}

function normalizeExactToken(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function trimPatternPadding(value: string): {
  readonly text: string;
  readonly leadingLength: number;
} {
  const text = value
    .replace(/^[ \t]*(?:[-*]\s+|\u2022\s+)?/, "")
    .replace(/^[("'`]+/, "")
    .replace(/[ \t]+$/, "");
  return {
    text,
    leadingLength: value.indexOf(text),
  };
}
