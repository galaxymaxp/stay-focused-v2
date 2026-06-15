import * as React from "react";

export interface ScheduleBlockProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "title"> {
  /** Start time label, e.g. "2:00". */
  time?: React.ReactNode;
  /** End time label, shown small under the start. */
  endTime?: React.ReactNode;
  /** Block title. */
  title?: React.ReactNode;
  /** Course / source label, colored with the tone. */
  course?: React.ReactNode;
  /** Course color (the slim bar + course label). @default "neutral" */
  tone?: "accent" | "red" | "amber" | "green" | "blue" | "neutral";
  /** Row state. @default "default" */
  state?: "default" | "now" | "done";
  /** Extra meta text (duration, location). */
  meta?: React.ReactNode;
  /** Trailing node — overrides the auto chevron / NOW pill / check. */
  trailing?: React.ReactNode;
  /** Last row in its group — suppresses the bottom separator. @default false */
  last?: boolean;
}

export interface ScheduleGroupProps {
  /** Optional section header (uppercase-ish, inset). */
  header?: React.ReactNode;
  /** Optional right-aligned header note, e.g. "3 blocks". */
  right?: React.ReactNode;
  children?: React.ReactNode;
  style?: React.CSSProperties;
}

/**
 * One iOS grouped-list row on the Today schedule rail.
 * @startingPoint section="Schedule" subtitle="iOS schedule rows in a grouped list" viewport="700x230"
 */
export function ScheduleBlock(props: ScheduleBlockProps): JSX.Element;
/** Rounded inset container that wraps ScheduleBlock rows (iOS grouped list). */
export function ScheduleGroup(props: ScheduleGroupProps): JSX.Element;
export default ScheduleBlock;
