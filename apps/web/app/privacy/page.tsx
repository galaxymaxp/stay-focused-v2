import { PRIVACY_POLICY } from '@stay-focused/shared';
import { LegalPage } from '../../src/features/legal/LegalPage';

export const metadata = { title: 'Privacy Policy' };

export default function Page() {
  return <LegalPage document={PRIVACY_POLICY} />;
}
