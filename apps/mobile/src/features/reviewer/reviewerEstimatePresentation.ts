export function reviewerReviewLabel(minutes: number | null | undefined): string | null {
  return typeof minutes === 'number' && Number.isSafeInteger(minutes) && minutes > 0
    ? `~${minutes} min review` : null;
}

/** Keep automatic origin and review time together in the existing secondary slot. */
export function reviewerSecondaryLine(automaticLabel: string | null, minutes: number | null | undefined): string | null {
  const parts = [automaticLabel, reviewerReviewLabel(minutes)].filter((part): part is string => part !== null);
  return parts.length ? parts.join(' · ') : null;
}
