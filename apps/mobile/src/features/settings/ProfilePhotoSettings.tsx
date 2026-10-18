import { AVATAR_MAX_BYTES } from '@stay-focused/shared';
import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, Platform, View } from 'react-native';
import { useProfileAvatar } from '../../design/ProfileAvatarProvider';
import { Action, Notice } from '../../design/primitives';
import { spacing } from '../../design/tokens';

export function ProfilePhotoSettings() {
  const photo = useProfileAvatar();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function change(remove = false) {
    if (busy) return;
    setBusy(true); setError(null);
    try {
      if (remove) { await photo.change(); return; }
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) { setError('Allow photo access to choose a profile picture.'); return; }
      const picked = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.85 });
      if (picked.canceled) return;
      const asset = picked.assets[0];
      if (!asset) return;
      if (asset.fileSize && asset.fileSize > AVATAR_MAX_BYTES) { setError('Choose a photo under 2 MB.'); return; }
      const mimeType = asset.mimeType ?? (asset.uri.toLowerCase().split('?')[0]?.endsWith('.png') ? 'image/png' : 'image/jpeg');
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(mimeType)) { setError('Choose a JPEG, PNG or WebP photo.'); return; }
      await photo.change({ uri: asset.uri, mimeType, ...(asset.file ? { file: asset.file } : {}) });
    } catch { setError('Could not update your photo. Check your connection and try again.'); }
    finally { setBusy(false); }
  }
  function remove() {
    const message = 'Remove your uploaded photo? Your sign-in photo or initials will appear instead.';
    if (Platform.OS === 'web') { if (window.confirm(message)) void change(true); return; }
    Alert.alert('Remove photo?', message, [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => void change(true) }]);
  }
  return <View style={{ gap: spacing[2], padding: spacing[3] }}>
    <Action secondary disabled={busy} onPress={() => void change()}>{busy ? 'Updating photo…' : 'Change photo'}</Action>
    {photo.hasUpload && <Action secondary disabled={busy} onPress={remove}>Remove photo</Action>}
    {error && <Notice>{error}</Notice>}
  </View>;
}
