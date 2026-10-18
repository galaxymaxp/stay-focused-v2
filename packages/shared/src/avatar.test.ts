import { describe, expect, it } from 'vitest';
import { resolveAvatar } from './avatar';

describe('avatar sources', () => {
  const metadata = { avatar_url: 'https://provider.test/avatar', picture: 'https://provider.test/picture' };
  it('prefers the uploaded photo', () => expect(resolveAvatar({ uploadedUrl: 'https://upload.test/photo', userMetadata: metadata, email: ' a@test' })).toEqual({ kind: 'uploaded', url: 'https://upload.test/photo', initial: 'A' }));
  it('prefers avatar_url over picture', () => expect(resolveAvatar({ userMetadata: metadata }).url).toBe(metadata.avatar_url));
  it('falls back to picture after an invalid avatar_url', () => expect(resolveAvatar({ userMetadata: { ...metadata, avatar_url: 'http://unsafe.test/a' } }).url).toBe(metadata.picture));
  it.each(['http://x.test/a', 'file:///private', 'data:image/png;base64,abc', 'javascript:alert(1)', '/relative', 'https://user:password@x.test/a', '', null, 42])('rejects unsafe URL %s', value => expect(resolveAvatar({ uploadedUrl: typeof value === 'string' ? value : null, userMetadata: { avatar_url: value, picture: value }, email: 'b@test' })).toEqual({ kind: 'initials', initial: 'B' }));
  it.each([undefined, null, '', '  '])('handles empty email %s', email => expect(resolveAvatar({ email })).toEqual({ kind: 'initials', initial: '·' }));
});
