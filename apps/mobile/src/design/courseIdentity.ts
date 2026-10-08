/**
 * One presentation of a course everywhere it appears (Generate, Tasks,
 * Library). Canvas names at this institution follow "CODE | SECTION | TITLE";
 * the title is what a student recognizes, so it leads, and code/section become
 * quiet metadata. Visual identity is derived only from the stable course id,
 * so a course keeps the same accent across screens and launches.
 */
export interface CourseInput {
  readonly id: string;
  readonly name: string;
  readonly code?: string | null;
}

export interface CourseIdentity {
  readonly id: string;
  readonly title: string;
  readonly code: string | null;
  readonly section: string | null;
  /** "CIT6 · CITCS 3N Group A", or null when Canvas gives nothing extra. */
  readonly subtitle: string | null;
  readonly monogram: string;
  /** Index into the course accent palette. */
  readonly hue: number;
}

export const COURSE_HUE_COUNT = 8;

/**
 * Restrained, mutually distinct hues. Red is intentionally absent so a course
 * never reads as an error and never competes with a red brand accent.
 */
export const courseAccents = {
  light: [
    { fg: "#4455B5", soft: "#E9ECFA" },
    { fg: "#1D6F6D", soft: "#E0F1F0" },
    { fg: "#3B7340", soft: "#E5F0E3" },
    { fg: "#8A5F0B", soft: "#F6EDD9" },
    { fg: "#9A4F2A", soft: "#F6E7DE" },
    { fg: "#744388", soft: "#F1E7F5" },
    { fg: "#4A5E73", soft: "#E6EBF0" },
    { fg: "#1E6394", soft: "#E0EDF6" },
  ],
  dark: [
    { fg: "#AEB9F2", soft: "#252C48" },
    { fg: "#88CFCA", soft: "#1A3433" },
    { fg: "#A5D2A0", soft: "#213425" },
    { fg: "#E6C57C", soft: "#382F1E" },
    { fg: "#EDAC89", soft: "#3D291F" },
    { fg: "#D3B1E1", soft: "#35273C" },
    { fg: "#B5C3D1", soft: "#293038" },
    { fg: "#92C4EA", soft: "#1C3141" },
  ],
} as const;

/** FNV-1a: tiny, dependency-free and identical on every platform and launch. */
export function stableHash(value: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

const SMALL_WORDS = new Set(["a", "an", "and", "as", "at", "by", "for", "in", "of", "on", "or", "the", "to", "with"]);
const ACRONYMS = new Set(["IT", "ERP", "AI", "UI", "UX", "OS", "PE", "UC", "IS", "ICT", "STS", "NSTP", "OSH", "CSR", "USC", "HCI", "OOP", "SQL", "API", "LAN", "WAN", "ERD", "SDLC"]);
const ROMAN = /^(?=[IVXLC]+$)M*(C[MD]|D?C{0,3})(X[CL]|L?X{0,3})(I[XV]|V?I{0,3})$/;

function isShouting(value: string): boolean {
  const letters = value.replace(/[^A-Za-z]/g, "");
  if (letters.length < 4) return false;
  return letters.replace(/[^A-Z]/g, "").length / letters.length > 0.8;
}

/** Title-cases ALL-CAPS Canvas titles while keeping acronyms, numerals and codes. */
export function presentCourseTitle(value: string): string {
  const title = value.replace(/\s+/g, " ").trim();
  if (!isShouting(title)) return title;
  const words = title.split(" ");
  return words
    .map((word, index) => {
      const bare = word.replace(/[^A-Za-z]/g, "");
      if (!bare) return word;
      if (ACRONYMS.has(bare) || ROMAN.test(bare) || /\d/.test(word)) return word;
      const lower = word.toLowerCase();
      if (index > 0 && SMALL_WORDS.has(bare.toLowerCase())) return lower;
      return lower.replace(/[a-z]/, (letter) => letter.toUpperCase());
    })
    .join(" ");
}

/** "CITCS 3N GROUP A" → "CITCS 3N Group A"; section codes otherwise stay intact. */
export function presentSection(value: string): string {
  return value
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\bGROUP\b/g, "Group")
    .replace(/\bGRP\b/g, "Grp");
}

function splitSegments(value: string | null | undefined): string[] {
  return (value ?? "").split("|").map((part) => part.trim()).filter(Boolean);
}

function monogramFor(code: string | null, title: string): string {
  const compact = code?.replace(/\s+/g, "") ?? "";
  if (compact && compact.length <= 5) return compact.toUpperCase();
  const initials = title
    .split(/\s+/)
    .filter((word) => /^[A-Za-z]/.test(word) && !SMALL_WORDS.has(word.toLowerCase()))
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join("");
  return initials || "•";
}

export function courseIdentity(course: CourseInput): CourseIdentity {
  const nameParts = splitSegments(course.name);
  const codeParts = splitSegments(course.code);
  let code: string | null = null;
  let section: string | null = null;
  let rawTitle = course.name.trim() || "Untitled course";

  if (nameParts.length >= 3) {
    code = nameParts[0]!;
    section = nameParts[1]!;
    rawTitle = nameParts.slice(2).join(" · ");
  } else if (nameParts.length === 2) {
    code = nameParts[0]!;
    rawTitle = nameParts[1]!;
    section = codeParts[1] ?? null;
  } else {
    code = codeParts[0] ?? null;
    section = codeParts[1] ?? null;
  }
  // A code identical to the title ("Registrar") adds nothing.
  if (code && code.toLowerCase() === rawTitle.toLowerCase()) code = null;

  const title = presentCourseTitle(rawTitle);
  const presentedSection = section ? presentSection(section) : null;
  const subtitle = [code, presentedSection].filter(Boolean).join(" · ") || null;
  return {
    id: course.id,
    title,
    code,
    section: presentedSection,
    subtitle,
    monogram: monogramFor(code, title),
    hue: stableHash(course.id) % COURSE_HUE_COUNT,
  };
}

export function courseAccent(identity: Pick<CourseIdentity, "hue">, mode: "light" | "dark") {
  return courseAccents[mode][identity.hue % COURSE_HUE_COUNT]!;
}
