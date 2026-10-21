import { useRef } from "react";

// Node boundary only: deterministic worklet execution; not native-thread proof.
export function useSharedValue<T>(initial: T) { return useRef({ value: initial }).current; }
function live<T extends object>(read: () => T): T {
  return new Proxy({} as T, {
    get: (_target, key) => Reflect.get(read(), key),
    ownKeys: () => Reflect.ownKeys(read()),
    getOwnPropertyDescriptor: (_target, key) => Object.hasOwn(read(), key) ? { enumerable: true, configurable: true } : undefined,
  });
}
export function useAnimatedStyle<T extends object>(read: () => T) { return live(read); }
export function useAnimatedProps<T extends object>(read: () => T) { return live(read); }
export function useAnimatedScrollHandler(handlers: Record<string, (event: never) => void>) {
  return (event: { nativeEvent: never; eventName?: string }) => {
    const key = event.eventName ?? "onScroll";
    handlers[key]?.(event.nativeEvent);
  };
}
export function runOnJS<T>(callback: T) { return callback; }
export function cancelAnimation(_value: unknown) {}
export function withTiming<T>(target: T, _config: unknown) { return target; }
export default { View: "ReanimatedView", ScrollView: "ScrollView" };
