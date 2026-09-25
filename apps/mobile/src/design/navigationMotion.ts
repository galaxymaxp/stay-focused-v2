import type { BottomTabNavigationOptions } from "@react-navigation/bottom-tabs";
import type { NativeStackNavigationOptions } from "@react-navigation/native-stack";

/**
 * Motion carries meaning, so each kind of navigation has one treatment:
 *
 * - Hierarchy (course → material, course → task, course → output) slides
 *   horizontally: forward enters from the right, back reverses it.
 * - Sibling tabs cross-fade briefly; they are never presented as "deeper".
 * - Contextual detail (an announcement, a quick editor) rises as a modal
 *   sheet, outside the horizontal hierarchy.
 *
 * All of these are native transitions driven by react-native-screens, so the
 * JS thread never blocks a tap and back gestures stay interruptible. Reduced
 * Motion keeps navigation legible with a short fade and no travel.
 */
export function hierarchyMotion(reducedMotion: boolean): NativeStackNavigationOptions {
  return {
    headerShown: false,
    animation: reducedMotion ? "fade" : "slide_from_right",
    animationDuration: reducedMotion ? 150 : 300,
    gestureEnabled: true,
    fullScreenGestureEnabled: true,
  };
}

export function modalMotion(reducedMotion: boolean): NativeStackNavigationOptions {
  return {
    presentation: "modal",
    animation: reducedMotion ? "fade" : "slide_from_bottom",
    animationDuration: reducedMotion ? 150 : 320,
    gestureEnabled: true,
  };
}

export function tabMotion(reducedMotion: boolean): Pick<BottomTabNavigationOptions, "animation"> {
  return { animation: reducedMotion ? "none" : "fade" };
}
