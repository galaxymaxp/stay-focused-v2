export type PlanBlockMeasure =
  | { readonly shape: 'ring'; readonly angleRadians: number; readonly logoRadius: number; readonly thickness: number }
  | { readonly shape: 'linear'; readonly length: number; readonly thickness: number };

/** Actual visible dimensions in display pixels, never logical SVG/viewBox units.
 * Fail closed before rendering any mark; no clipping is used as a fit strategy. */
export function planBlockMarks(measure: PlanBlockMeasure, logoSize: number, kindSize = 0) {
  const length = measure.shape === 'ring'
    ? Math.min(Math.PI * 2, Math.abs(measure.angleRadians)) * measure.logoRadius : measure.length;
  const finite = [length, measure.thickness, logoSize, kindSize].every(value => Number.isFinite(value) && value >= 0);
  if (!finite) return { logo: false, kind: false };
  const logo = logoSize > 0 && length >= logoSize + 8 && measure.thickness >= logoSize;
  const kind = kindSize > 0 && measure.thickness >= kindSize &&
    length >= (logo ? logoSize + 4 + kindSize + 8 : kindSize + 8) && (logoSize === 0 || logo);
  return { logo, kind };
}
