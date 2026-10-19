import { TERMS_OF_SERVICE } from '@stay-focused/shared';
import { LegalScreen } from '../src/features/legal/LegalScreen';

export default function TermsRoute() {
  return <LegalScreen document={TERMS_OF_SERVICE} path="/terms" />;
}
