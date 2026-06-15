import * as React from "react";

export interface NowHeroProps {
  /** Eyebrow label. @default "Right now" */
  kicker?: React.ReactNode;
  /** The single next action to take. */
  title?: React.ReactNode;
  /** Course / source label. */
  course?: React.ReactNode;
  /** Tone for the course chip. @default "accent" */
  courseTone?: "accent" | "red" | "amber" | "green" | "blue" | "neutral";
  /** One line on why this surfaced now. */
  reason?: React.ReactNode;
  /** Time context, e.g. "2:00 – 3:30 PM". */
  timeLabel?: React.ReactNode;
  /** Countdown label, e.g. "1h 12m left". */
  timeLeft?: React.ReactNode;
  /** Progress through the block, 0–1, for the iOS progress track. @default 0.32 */
  progress?: number;
  /** Primary CTA label. @default "Start now" */
  primaryLabel?: React.ReactNode;
  onPrimary?: () => void;
  /** Secondary CTA label. @default "Snooze 15m" — pass null to hide. */
  secondaryLabel?: React.ReactNode;
  onSecondary?: () => void;
  /** Icon node for the primary button. */
  startIcon?: React.ReactNode;
  style?: React.CSSProperties;
}

/**
 * The Today screen's hero: the answer to "what should I do right now?"
 * @startingPoint section="Schedule" subtitle="Right-now hero with primary action" viewport="700x320"
 */
export function NowHero(props: NowHeroProps): JSX.Element;
export default NowHero;
