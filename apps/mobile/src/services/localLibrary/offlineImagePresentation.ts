import type { ReviewerImages } from '@stay-focused/shared';
import type { OfflineImageManifest } from './imageManifest';

/** Rebuild display DTOs using private files and the original labels/attribution. */
export function localReviewerImages(manifest: OfflineImageManifest | null, sectionIds: readonly string[]): ReviewerImages | null {
  if (!manifest) return null;
  return { external: { checked: 0, total: 0, running: false }, sections: sectionIds.map(sectionId => {
    const images = manifest.images.filter(i => (i.sectionId === sectionId || i.sectionIds?.includes(sectionId)) && i.status === 'stored' && i.localPath?.startsWith('file://'));
    const snapshot = images.find(i => i.snapshot);
    const external = images.find(i => i.external);
    const figures = images.flatMap(i => i.figure && i.localPath ? [{ ...i.figure, url: i.localPath }] : []);
    return { sectionId, hasFigures: figures.length > 0, figures,
      snapshot: snapshot?.snapshot && snapshot.localPath ? { ...snapshot.snapshot, url: snapshot.localPath } : { available: false as const, reason: 'not_saved' },
      ...(external?.external && external.localPath ? { external: { ...external.external, image: external.localPath } } : {}) };
  }) };
}

export function preferLocalReviewerImages(remote: ReviewerImages | null, local: ReviewerImages | null): ReviewerImages | null {
  if (!local) return remote;
  return { external: remote?.external ?? local.external, sections: local.sections.map(section => {
    const online = remote?.sections.find(s => s.sectionId === section.sectionId);
    if (!online) return section;
    const figures = online.figures.map(figure => section.figures.find(f => f.id === figure.id) ?? figure);
    for (const figure of section.figures) if (!figures.some(f => f.id === figure.id)) figures.push(figure);
    return { ...online, hasFigures: online.hasFigures || section.hasFigures, figures,
      snapshot: section.snapshot.available ? section.snapshot : online.snapshot,
      external: section.external && (!online.external || online.external.id === section.external.id) ? section.external : online.external };
  }) };
}
