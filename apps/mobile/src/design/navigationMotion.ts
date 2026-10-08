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
 *
 * Every scene is painted with the app background, so nothing lighter than the
 * page can show through while a screen is moving.
 */
export function hierarchyMotion(reducedMotion: boolean, background: string): NativeStackNavigationOptions {
  return {
    headerShown: false,
    contentStyle: { backgroundColor: background },
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

/**
 * A dismissible sheet over the current screen: the screen underneath stays
 * visible behind a dimmed backdrop, so tapping outside, Android back and the
 * close control all lead straight back to it.
 */
export function sheetMotion(): NativeStackNavigationOptions {
  return {
    presentation: "transparentModal",
    // The screen animates its own tint and sheet; the route itself just appears.
    animation: "none",
    gestureEnabled: true,
    contentStyle: { backgroundColor: "transparent" },
  };
}

export function tabMotion(reducedMotion: boolean, background: string): Pick<BottomTabNavigationOptions, "animation" | "sceneStyle" | "transitionSpec"> {
  return {
    animation: reducedMotion ? "none" : "fade",
    // Short and eased: siblings swap quickly without a visible dip.
    transitionSpec: { animation: "timing", config: { duration: 140 } },
    sceneStyle: { backgroundColor: background },
  };
}
