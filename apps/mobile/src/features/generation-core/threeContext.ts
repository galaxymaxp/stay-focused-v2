/** Expo SDK 57 makes WebGL2 inherit WebGL1; Three r166 rejects that inheritance.
 * Keep the real WebGL2 API and native method receivers behind a prototype-free
 * facade. Never change global constructors or pretend a WebGL1 device is WebGL2.
 */
export function threeContext(gl: WebGL2RenderingContext): WebGL2RenderingContext {
  if (typeof WebGL2RenderingContext === "undefined" || !(gl instanceof WebGL2RenderingContext)) {
    throw new Error("The study orb requires a WebGL2 context.");
  }
  const methods = new Map<PropertyKey, unknown>();
  return new Proxy(Object.create(null) as WebGL2RenderingContext, {
    get(_target, property) {
      const value: unknown = Reflect.get(gl, property, gl);
      if (typeof value !== "function") return value;
      if (!methods.has(property)) methods.set(property, value.bind(gl));
      return methods.get(property);
    },
    set(_target, property, value: unknown) {
      return Reflect.set(gl, property, value, gl);
    },
  });
}
