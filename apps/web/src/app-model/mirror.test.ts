import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, it } from "vitest";

// These modules are copies of the app's pure presentation logic. The app's own
// tests cover their behavior; this keeps the copies from drifting.
const mirrors: [web: string, mobile: string, rewrites?: [string, string][]][] = [
  ["./presentation.ts", "features/redesign/presentation.ts", [["../features/knowledge-core/coreModel", "../generation-core/coreModel"]]],
  ["./listPreferences.ts", "features/redesign/listPreferences.ts"],
  ["./courseIdentity.ts", "design/courseIdentity.ts"],
  ["./calendarPresentation.ts", "features/redesign/calendarPresentation.ts"],
  ["../features/day-clock/dayClock.ts", "features/redesign/dayClock.ts"],
  ["./reviewerNavigation.ts", "features/reviewer/reviewerNavigation.ts"],
  ["./announcementPresentation.ts", "features/announcements/announcementPresentation.ts"],
];
const read = (path: string) =>
  readFileSync(fileURLToPath(new URL(path, import.meta.url)), "utf8").replace(/\r\n/g, "\n");

it.each(mirrors)("%s matches the app's %s", (web, mobile, rewrites = []) => {
  let copy = read(web).replace(/^\/\/ Mirrors .*\n/, "");
  for (const [from, to] of rewrites) copy = copy.replaceAll(from, to);
  expect(copy).toBe(read(`../../../mobile/src/${mobile}`));
});
