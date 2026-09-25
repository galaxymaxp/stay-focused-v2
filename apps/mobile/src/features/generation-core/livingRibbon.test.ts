import { Mesh, ShaderMaterial } from "three";
import { describe, expect, it, vi } from "vitest";

import { createLivingRibbon } from "./livingRibbon";

describe("living ribbon resources", () => {
  it("shares the motion clock between body and glow and disposes both passes", () => {
    const ribbon = createLivingRibbon(1);
    const [body, glow] = ribbon.mesh.children as Mesh[];
    const bodyMaterial = body!.material as ShaderMaterial;
    const glowMaterial = glow!.material as ShaderMaterial;
    expect(bodyMaterial.uniforms.uTime).toBe(glowMaterial.uniforms.uTime);
    expect(bodyMaterial.uniforms.uLife).toBe(glowMaterial.uniforms.uLife);
    expect(bodyMaterial.uniforms.uHalo!.value).toBe(0);
    expect(glowMaterial.uniforms.uHalo!.value).toBe(1);
    expect(bodyMaterial.transparent).toBe(false);
    expect(glowMaterial.depthWrite).toBe(false);
    expect(body!.geometry).toBe(glow!.geometry);
    const geometryDispose = vi.spyOn(body!.geometry, "dispose");
    const bodyDispose = vi.spyOn(bodyMaterial, "dispose");
    const glowDispose = vi.spyOn(glowMaterial, "dispose");
    ribbon.dispose();
    expect(geometryDispose).toHaveBeenCalledOnce();
    expect(bodyDispose).toHaveBeenCalledOnce();
    expect(glowDispose).toHaveBeenCalledOnce();
  });
});
