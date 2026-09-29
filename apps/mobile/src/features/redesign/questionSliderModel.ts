export function sliderQuestionIndex(x: number, width: number, count: number): number {
  if (count <= 1 || width <= 0) return 0;
  return Math.max(0, Math.min(count - 1, Math.round(Math.max(0, Math.min(1, x / width)) * (count - 1))));
}

/** Page coordinates stay stable when a drag starts on the moving thumb. */
export function sliderQuestionIndexFromPageX(pageX: number, trackLeft: number, width: number, count: number): number {
  return sliderQuestionIndex(pageX - trackLeft, width, count);
}

export type SliderIntent = 'pending' | 'horizontal' | 'vertical';

/** Decide once per touch: horizontal ownership survives later thumb wobble. */
export function sliderGestureIntent(intent: SliderIntent, dx: number, dy: number): SliderIntent {
  if (intent !== 'pending') return intent;
  const x = Math.abs(dx), y = Math.abs(dy);
  if (x >= 8 && x >= y * 1.2) return 'horizontal';
  // A small vertical lead is common at touch-down. Keep deciding until the
  // movement is large enough to clearly be a scroll, then yield for this touch.
  if (y >= 16 && y > x * 1.2) return 'vertical';
  return 'pending';
}
