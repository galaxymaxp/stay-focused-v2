import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { hierarchyMotion, modalMotion, sheetMotion, tabMotion } from "../design/navigationMotion";

const app = join(__dirname, "..", "..", "app", "(app)");
const read = (path: string) => readFileSync(join(app, path), "utf8");

/**
 * Back navigation is structural: each hierarchy level is its own entry in a
 * stack owned by the tab, so header back, Android back and swipe all pop one
 * level. These checks fail if a level regresses to in-component state, which
 * is what previously sent Generate's back gesture to Today.
 */
describe("navigation hierarchy", () => {
  it("gives Generate, Tasks and Library their own stacks with one route per level", () => {
    for (const path of [
      "(tabs)/courses/_layout.tsx",
      "(tabs)/courses/index.tsx",
      "(tabs)/courses/[courseId]/index.tsx",
      "(tabs)/courses/[courseId]/material.tsx",
      "(tabs)/work/_layout.tsx",
      "(tabs)/work/index.tsx",
      "(tabs)/work/[courseKey].tsx",
      "(tabs)/library/_layout.tsx",
      "(tabs)/library/index.tsx",
      "(tabs)/library/[courseKey].tsx",
    ]) {
      expect(existsSync(join(app, path)), path).toBe(true);
    }
    for (const layout of ["(tabs)/courses/_layout.tsx", "(tabs)/work/_layout.tsx", "(tabs)/library/_layout.tsx"]) {
      expect(read(layout)).toContain("<Stack screenOptions={hierarchyMotion(reducedMotion, colors.backgroundPrimary)} />");
    }
  });

  it("keeps course and material selection out of component state", () => {
    const generate = readFileSync(join(__dirname, "..", "features", "redesign", "GenerateScreen.tsx"), "utf8");
    expect(generate).not.toMatch(/useState<string \| null>\(null\);\s*\n.*selectedCourse/);
    expect(generate).toContain('pathname: "/courses/[courseId]"');
    expect(generate).toContain('pathname: "/courses/[courseId]/material"');
  });

  it("presents announcement detail as a dismissible sheet over the current screen", () => {
    expect(existsSync(join(app, "announcement.tsx"))).toBe(true);
    expect(read("_layout.tsx")).toContain('<Stack.Screen name="announcement" options={sheetMotion()} />');
    expect(sheetMotion()).toMatchObject({ presentation: "transparentModal", gestureEnabled: true });
  });
});

describe("navigation motion", () => {
  it("slides hierarchy horizontally, raises modals, and cross-fades sibling tabs", () => {
    expect(hierarchyMotion(false, "#000")).toMatchObject({ animation: "slide_from_right", gestureEnabled: true });
    expect(modalMotion(false)).toMatchObject({ presentation: "modal", animation: "slide_from_bottom", gestureEnabled: true });
    expect(tabMotion(false, "#000")).toMatchObject({ animation: "fade" });
  });

  it("paints every moving scene with the app background so transitions never flash", () => {
    expect(hierarchyMotion(false, "#000000").contentStyle).toEqual({ backgroundColor: "#000000" });
    expect(tabMotion(false, "#000000").sceneStyle).toEqual({ backgroundColor: "#000000" });
    const root = readFileSync(join(__dirname, "..", "..", "app", "_layout.tsx"), "utf8");
    expect(root).toContain("NavigationThemeProvider");
    expect(root).toContain("background: colors.backgroundPrimary");
  });

  it("removes travel under Reduced Motion but keeps navigation legible", () => {
    expect(hierarchyMotion(true, "#000").animation).toBe("fade");
    expect(modalMotion(true)).toMatchObject({ presentation: "modal", animation: "fade" });
    expect(tabMotion(true, "#000")).toMatchObject({ animation: "none" });
    expect(hierarchyMotion(true, "#000").gestureEnabled).toBe(true);
  });
});
