export interface FixtureSource {
  readonly title: string;
  readonly fileName: string;
}

export interface LoadedFixtureSource extends FixtureSource {
  readonly id: string;
  readonly text: string;
}

export function deriveLiveFixtureSourceId(fileName: string): string {
  const baseName = fileName.replace(/\.[^.]+$/, "");
  const slug = baseName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (!slug) {
    throw new Error(`Unable to derive live fixture source ID from "${fileName}".`);
  }

  return `live-${slug}`;
}
