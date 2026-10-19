import { TERMS_OF_SERVICE } from '@stay-focused/shared';
import { LegalPage } from '../../src/features/legal/LegalPage';

export const metadata = { title: 'Terms of Service' };

export default function Page() {
  return <LegalPage document={TERMS_OF_SERVICE} />;
}
