/** Node tests have no native haptics module; the app code only needs these shapes. */
export const AndroidHaptics = new Proxy({}, { get: (_target, name) => String(name) }) as Record<string, string>;
export const ImpactFeedbackStyle = { Light: "light", Medium: "medium", Heavy: "heavy", Soft: "soft", Rigid: "rigid" } as const;
export const NotificationFeedbackType = { Success: "success", Warning: "warning", Error: "error" } as const;
export const impactAsync = async () => {};
export const selectionAsync = async () => {};
export const notificationAsync = async () => {};
export const performAndroidHapticsAsync = async () => {};
