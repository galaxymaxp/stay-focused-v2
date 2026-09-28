export function sliderQuestionIndex(x: number, width: number, count: number): number {
  if (count <= 1 || width <= 0) return 0;
  return Math.max(0, Math.min(count - 1, Math.round(Math.max(0, Math.min(1, x / width)) * (count - 1))));
}

/** Page coordinates stay stable when a drag starts on the moving thumb. */
export function sliderQuestionIndexFromPageX(pageX: number, trackLeft: number, width: number, count: number): number {
  return sliderQuestionIndex(pageX - trackLeft, width, count);
}
