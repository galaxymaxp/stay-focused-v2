/**
 * Input parsing for the task editor.
 *
 * Kept pure and separate from the form so the rules the backend enforces
 * (title length, estimate range, ISO timestamps) can be tested directly rather
 * than through a rendered component.
 */

export const MAX_TASK_TITLE_LENGTH = 200;
export const MIN_ESTIMATE_MINUTES = 1;
export const MAX_ESTIMATE_MINUTES = 1440;

const DATE_ONLY = /^(\d{4})-(\d{2})-(\d{2})$/;
const DATE_TIME = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{1,2}):(\d{2})$/;

/**
 * Renders a stored timestamp back into the editor's text format, in the
 * device's local time so a student sees the deadline they set.
 */
export function formatDueInput(dueAt: string | null): string {
  if (!dueAt) return "";
  const parsed = Date.parse(dueAt);
  if (!Number.isFinite(parsed)) return "";
  const value = new Date(parsed);
  const date = [
    value.getFullYear(),
    String(value.getMonth() + 1).padStart(2, "0"),
    String(value.getDate()).padStart(2, "0"),
  ].join("-");
  const time = `${String(value.getHours()).padStart(2, "0")}:${String(value.getMinutes()).padStart(2, "0")}`;
  return time === "00:00" ? date : `${date} ${time}`;
}

/**
 * Returns an ISO timestamp, null for an intentionally empty deadline, or
 * "invalid" so the caller can explain the expected format instead of silently
 * dropping what the user typed.
 */
export function parseDueInput(value: string): string | null | "invalid" {
  const trimmed = value.trim();
  if (!trimmed) return null;

  const dateTime = DATE_TIME.exec(trimmed);
  if (dateTime) {
    return buildTimestamp(
      Number(dateTime[1]),
      Number(dateTime[2]),
      Number(dateTime[3]),
      Number(dateTime[4]),
      Number(dateTime[5]),
    );
  }

  const dateOnly = DATE_ONLY.exec(trimmed);
  if (dateOnly) {
    return buildTimestamp(
      Number(dateOnly[1]),
      Number(dateOnly[2]),
      Number(dateOnly[3]),
      0,
      0,
    );
  }

  return "invalid";
}

export function parseEstimateInput(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const minutes = Number(trimmed);
  return minutes >= MIN_ESTIMATE_MINUTES && minutes <= MAX_ESTIMATE_MINUTES
    ? minutes
    : null;
}

function buildTimestamp(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
): string | "invalid" {
  if (month < 1 || month > 12 || day < 1 || day > 31) return "invalid";
  if (hour > 23 || minute > 59) return "invalid";
  const value = new Date(year, month - 1, day, hour, minute, 0, 0);
  // Rejects impossible dates that JavaScript would otherwise roll forward,
  // such as 2026-02-30 becoming 2026-03-02.
  if (
    value.getFullYear() !== year ||
    value.getMonth() !== month - 1 ||
    value.getDate() !== day
  ) {
    return "invalid";
  }
  return value.toISOString();
}
