import type { AudioPlayer } from "expo-audio";

import { sessionStore } from "../auth/sessionStore";
import { setHapticsEnabled } from "./haptics";

export type FeedbackPreferences = { sounds: boolean; haptics: boolean };
type Sound = "tick" | "correct" | "wrong" | "complete";
const KEY = "sf.feedback.v1";
const defaults: FeedbackPreferences = { sounds: true, haptics: true };
let preferences = { ...defaults };
let loading: Promise<FeedbackPreferences> | null = null;
let players: Partial<Record<Sound, AudioPlayer>> = {};
let lastPlay = 0;

function sourceFor(sound: Sound): number {
  switch (sound) {
    case "tick": return require("../../assets/sounds/tick.wav") as number;
    case "correct": return require("../../assets/sounds/correct.wav") as number;
    case "wrong": return require("../../assets/sounds/wrong.wav") as number;
    case "complete": return require("../../assets/sounds/complete.wav") as number;
  }
}

export function getFeedbackPreferences(): FeedbackPreferences {
  return { ...preferences };
}

export function loadFeedbackPreferences(): Promise<FeedbackPreferences> {
  if (loading) return loading;
  loading = Promise.resolve(sessionStore.getItem(KEY)).then((raw) => {
    if (raw) {
      const saved: unknown = JSON.parse(raw);
      if (saved && typeof saved === "object") {
        const value = saved as Partial<FeedbackPreferences>;
        preferences = {
          sounds: typeof value.sounds === "boolean" ? value.sounds : defaults.sounds,
          haptics: typeof value.haptics === "boolean" ? value.haptics : defaults.haptics,
        };
      }
    }
    setHapticsEnabled(preferences.haptics);
    return getFeedbackPreferences();
  }).catch(() => getFeedbackPreferences());
  return loading;
}

export async function saveFeedbackPreferences(next: FeedbackPreferences): Promise<void> {
  await sessionStore.setItem(KEY, JSON.stringify(next));
  preferences = { ...next };
  setHapticsEnabled(next.haptics);
}

/** Audio is optional; a playback failure never delays visual feedback. */
export async function playFeedbackSound(sound: Sound): Promise<void> {
  await loadFeedbackPreferences();
  if (!preferences.sounds || Date.now() - lastPlay < 120) return;
  lastPlay = Date.now();
  try {
    const { createAudioPlayer, setAudioModeAsync } = await import("expo-audio");
    await setAudioModeAsync({ playsInSilentMode: false, shouldPlayInBackground: false });
    const existing = players[sound];
    const player = existing ?? createAudioPlayer(sourceFor(sound));
    players[sound] = player;
    player.volume = sound === "tick" ? 0.25 : 0.4;
    if (existing) await player.seekTo(0);
    player.play();
  } catch {
    // The visible answer state remains authoritative.
  }
}
