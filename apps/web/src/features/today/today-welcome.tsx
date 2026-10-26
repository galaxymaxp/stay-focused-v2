"use client";
import { WELCOME_BODY, WELCOME_TITLE } from '@stay-focused/shared';
export function TodayWelcome({ source, dismissed, ready, onDismiss }: { source: string; dismissed: boolean; ready: boolean; onDismiss: () => void }) {
  if (!ready || source !== 'first-run' || dismissed) return null;
  return <aside className="today-welcome" aria-label="Your first free-time window"><div><strong>{WELCOME_TITLE}</strong><p>{WELCOME_BODY}</p></div><button type="button" aria-label="Dismiss welcome note" onClick={onDismiss}>×</button></aside>;
}
