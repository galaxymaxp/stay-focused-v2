import type { Metadata } from 'next';
import { SharedReviewerPage } from '../../../src/features/shared-reviewer';
export const metadata: Metadata = { title: 'Shared Reviewer', robots: { index: false, follow: false }, referrer: 'no-referrer' };
export default async function Page({ params }: { params: Promise<{ token: string }> }) {
  return <SharedReviewerPage token={(await params).token} />;
}
