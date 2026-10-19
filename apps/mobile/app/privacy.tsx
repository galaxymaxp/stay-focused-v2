import { PRIVACY_POLICY } from '@stay-focused/shared';
import { LegalScreen } from '../src/features/legal/LegalScreen';

export default function PrivacyRoute() {
  return <LegalScreen document={PRIVACY_POLICY} path="/privacy" />;
}
