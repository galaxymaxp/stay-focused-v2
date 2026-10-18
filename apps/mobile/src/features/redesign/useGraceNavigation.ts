import { router, type Href } from "expo-router";
import { useIsFocused, useNavigation } from "expo-router/react-navigation";
import { useCallback, useEffect, useRef } from "react";
import { AppState } from "react-native";

/** One optional transition, abandoned as soon as the student moves on. */
export function useGraceNavigation(blocked = false) {
  const focused = useIsFocused();
  const navigation = useNavigation();
  const mounted = useRef(false);
  const eligible = useRef(false);
  eligible.current = focused && !blocked;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancel = useCallback(() => {
    if (timer.current !== null) clearTimeout(timer.current);
    timer.current = null;
  }, []);

  useEffect(() => {
    mounted.current = true;
    const appState = AppState.addEventListener("change", (state) => {
      if (state !== "active") cancel();
    });
    // Parent state catches tab changes and navigation elsewhere in the stack,
    // including transitions that do not unmount this screen.
    const removeListeners: (() => void)[] = [];
    let current: typeof navigation | undefined = navigation;
    while (current) {
      removeListeners.push(current.addListener("state", cancel));
      removeListeners.push(current.addListener("blur", cancel));
      current = current.getParent();
    }
    return () => {
      mounted.current = false;
      cancel();
      appState.remove();
      removeListeners.forEach((remove) => remove());
    };
  }, [navigation, cancel]);

  useEffect(() => {
    if (!focused || blocked) cancel();
  }, [focused, blocked, cancel]);

  const schedule = useCallback((target: Href) => {
    cancel();
    if (!mounted.current || !eligible.current || AppState.currentState !== "active") return;
    timer.current = setTimeout(() => {
      timer.current = null;
      if (mounted.current && eligible.current && navigation.isFocused() && AppState.currentState === "active") {
        router.push(target);
      }
    }, 2000);
  }, [cancel, navigation]);

  return { schedule, cancel };
}
