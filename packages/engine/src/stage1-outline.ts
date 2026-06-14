import type { NormalizedSource, SourceOutline } from "./types";

export async function detectOutline(
  _source: NormalizedSource,
): Promise<SourceOutline> {
  throw new Error("detectOutline is not implemented");
}
