import { describe, expect, it } from "vitest";

import { COURSE_HUE_COUNT, courseAccent, courseAccents, courseIdentity, presentCourseTitle, stableHash } from "./courseIdentity";
import { palettes, ucInspiredPalettes } from "./themeTokens";

describe("course identity", () => {
  it("leads with the course title and keeps code and section as quiet metadata", () => {
    expect(courseIdentity({ id: "1", name: "CIT6 | CITCS 3N GROUP A | CAPSTONE PROJECT 1", code: "CIT6 | CITCS 3N GROUP A" })).toMatchObject({
      title: "Capstone Project 1",
      code: "CIT6",
      section: "CITCS 3N Group A",
      subtitle: "CIT6 · CITCS 3N Group A",
      monogram: "CIT6",
    });
  });

  it("title-cases shouting titles while keeping acronyms, numerals and small words", () => {
    expect(presentCourseTitle("IT SECURITY")).toBe("IT Security");
    expect(presentCourseTitle("INTRODUCTION TO ERP")).toBe("Introduction to ERP");
    expect(presentCourseTitle("NATIONAL SERVICE TRAINING PROGRAM 2")).toBe("National Service Training Program 2");
    expect(presentCourseTitle("SWITCHING, ROUTING AND WIRELESS ESSENTIALS")).toBe("Switching, Routing and Wireless Essentials");
    expect(presentCourseTitle("Career Center")).toBe("Career Center");
  });

  it("handles names without the institutional pattern and drops a code equal to the title", () => {
    expect(courseIdentity({ id: "2", name: "Registrar", code: "Registrar" })).toMatchObject({ title: "Registrar", subtitle: null });
    expect(courseIdentity({ id: "3", name: "Center for Social Responsibility", code: "CSR" })).toMatchObject({ title: "Center for Social Responsibility", subtitle: "CSR", monogram: "CSR" });
    expect(courseIdentity({ id: "4", name: "", code: null }).title).toBe("Untitled course");
  });

  it("derives the same identity from the same course id on every screen and launch", () => {
    const generate = courseIdentity({ id: "9f2c1a44-0000-4000-8000-000000000001", name: "CIT6 | CITCS 3N GROUP A | CAPSTONE PROJECT 1", code: "CIT6 | CITCS 3N GROUP A" });
    const tasks = courseIdentity({ id: "9f2c1a44-0000-4000-8000-000000000001", name: "CIT6 | CITCS 3N GROUP A | CAPSTONE PROJECT 1", code: "CIT6 | CITCS 3N GROUP A" });
    expect(tasks).toEqual(generate);
    expect(stableHash("9f2c1a44-0000-4000-8000-000000000001")).toBe(stableHash("9f2c1a44-0000-4000-8000-000000000001"));
    expect(generate.hue).toBeGreaterThanOrEqual(0);
    expect(generate.hue).toBeLessThan(COURSE_HUE_COUNT);
  });

  it("uses distinct restrained accents with no red, so courses never read as errors or brand", () => {
    for (const mode of ["light", "dark"] as const) {
      const colors = courseAccents[mode].map((accent) => accent.fg);
      expect(new Set(colors).size).toBe(COURSE_HUE_COUNT);
      expect(colors).not.toContain(ucInspiredPalettes[mode].accent);
      expect(colors).not.toContain(palettes[mode].danger);
    }
    expect(courseAccent({ hue: 3 }, "dark")).toBe(courseAccents.dark[3]);
  });
});
