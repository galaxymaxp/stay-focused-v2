import { afterEach, describe, expect, it, vi } from "vitest";
import { threeContext } from "./threeContext";

afterEach(() => vi.unstubAllGlobals());

describe("Expo WebGL2 / Three context compatibility", () => {
  it("avoids Three's WebGL1 instanceof rejection while retaining native method receivers", () => {
    class WebGL1 { VERSION = 7938; }
    class WebGL2 extends WebGL1 {
      getParameter(key: number) { expect(this).toBe(gl); return key === this.VERSION ? "WebGL 2.0" : null; }
    }
    vi.stubGlobal("WebGLRenderingContext", WebGL1);
    vi.stubGlobal("WebGL2RenderingContext", WebGL2);
    const gl = new WebGL2();
    expect(gl instanceof WebGL1).toBe(true); // The exact SDK 57 / Three mismatch.
    const facade = threeContext(gl as unknown as WebGL2RenderingContext);
    expect(facade instanceof WebGL1).toBe(false);
    expect(facade.getParameter(facade.VERSION)).toBe("WebGL 2.0");
    expect(facade.getParameter).toBe(facade.getParameter);
    expect(Object.getPrototypeOf(gl)).toBe(WebGL2.prototype);
    expect(globalThis.WebGLRenderingContext).toBe(WebGL1);
  });

  it("rejects actual WebGL1 instead of concealing unsupported capabilities", () => {
    class WebGL1 {}
    class WebGL2 extends WebGL1 {}
    vi.stubGlobal("WebGLRenderingContext", WebGL1);
    vi.stubGlobal("WebGL2RenderingContext", WebGL2);
    expect(() => threeContext(new WebGL1() as WebGL2RenderingContext)).toThrow(/requires a WebGL2/);
  });
});
