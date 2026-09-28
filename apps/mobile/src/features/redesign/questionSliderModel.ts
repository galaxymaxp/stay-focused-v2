export function sliderQuestionIndex(x: number, width: number, count: number): number {
  if (count <= 1 || width <= 0) return 0;
  return Math.max(0, Math.min(count - 1, Math.round(Math.max(0, Math.min(1, x / width)) * (count - 1))));
}
