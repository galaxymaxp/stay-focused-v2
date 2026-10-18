import { AvatarMemory, EMPTY_AVATAR, resolveAvatar } from '@stay-focused/shared';
import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../auth';
import { profileAvatarRequest } from '../services/profileAvatarApi';

const Context = createContext<AvatarMemory | null>(null);
export function ProfileAvatarProvider({ children }: { children: ReactNode }) {
  const { session, isSigningOut } = useAuth();
  return <OwnerAvatar key={isSigningOut ? 'signing-out' : session?.user.id ?? 'signed-out'} enabled={!isSigningOut}>{children}</OwnerAvatar>;
}
function OwnerAvatar({ children, enabled }: { children: ReactNode; enabled: boolean }) {
  const { session } = useAuth();
  const current = useRef(session);
  current.current = session;
  const [store, setStore] = useState<AvatarMemory | null>(null);
  const owner = enabled ? session?.user.id : undefined;
  useEffect(() => {
    if (!owner) return;
    const memory = new AvatarMemory(async () => {
      const session = current.current;
      if (!session?.accessToken || session.offline) throw new Error('offline');
      const { getApiBaseUrl } = await import('../config/apiBaseUrl');
      return profileAvatarRequest({ baseUrl: getApiBaseUrl() ?? '', accessToken: session.accessToken });
    });
    setStore(memory); void memory.refresh();
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') void memory.refresh(); });
    // Retry connectivity without blocking UI; no persistent cache.
    const timer = setInterval(() => { if (AppState.currentState === 'active' && !memory.getSnapshot().url) void memory.refresh(); }, 60_000);
    return () => { memory.dispose(); subscription.remove(); clearInterval(timer); };
  }, [owner]);
  return <Context.Provider value={store}>{children}</Context.Provider>;
}
const subscribeEmpty = () => () => {};
export function useProfileAvatar() {
  const store = useContext(Context);
  const { session } = useAuth();
  const uploaded = useSyncExternalStore(store?.subscribe ?? subscribeEmpty, store?.getSnapshot ?? (() => EMPTY_AVATAR), () => EMPTY_AVATAR);
  return {
    ...resolveAvatar({ uploadedUrl: session?.offline ? null : uploaded.url, userMetadata: session?.user.userMetadata, email: session?.user.email }),
    hasUpload: !!uploaded.url,
    change: async (photo?: { uri: string; mimeType: string; file?: Blob }) => {
      if (!store || !session?.accessToken || session.offline) throw new Error('offline');
      const { getApiBaseUrl } = await import('../config/apiBaseUrl');
      await store.change(() => profileAvatarRequest({ baseUrl: getApiBaseUrl() ?? '', accessToken: session.accessToken, method: photo ? 'PUT' : 'DELETE', photo }));
    },
  };
}
