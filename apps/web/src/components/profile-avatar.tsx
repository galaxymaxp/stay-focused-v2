"use client";
import { AvatarMemory, EMPTY_AVATAR, resolveAvatar, type ProfileAvatar } from '@stay-focused/shared';
import { createContext, useContext, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from 'react';
import { useAuth } from './providers';

const Context = createContext<AvatarMemory | null>(null);
export function ProfileAvatarProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  return <OwnerAvatar key={session?.user.id ?? 'signed-out'}>{children}</OwnerAvatar>;
}
function OwnerAvatar({ children }: { children: ReactNode }) {
  const { api, session } = useAuth();
  const currentApi = useRef(api);
  currentApi.current = api;
  const [store, setStore] = useState<AvatarMemory | null>(null);
  const owner = session?.user.id;
  useEffect(() => {
    if (!owner) return;
    const memory = new AvatarMemory(() => currentApi.current<ProfileAvatar>('/api/profile/avatar'));
    setStore(memory); void memory.refresh();
    const refresh = () => { void memory.refresh(); };
    window.addEventListener('online', refresh);
    window.addEventListener('focus', refresh);
    return () => { memory.dispose(); window.removeEventListener('online', refresh); window.removeEventListener('focus', refresh); };
  }, [owner]);
  return <Context.Provider value={store}>{children}</Context.Provider>;
}
const subscribeEmpty = () => () => {};
export function useProfileAvatar() {
  const store = useContext(Context);
  const { api, session } = useAuth();
  const uploaded = useSyncExternalStore(store?.subscribe ?? subscribeEmpty, store?.getSnapshot ?? (() => EMPTY_AVATAR), () => EMPTY_AVATAR);
  return {
    ...resolveAvatar({ uploadedUrl: uploaded.url, userMetadata: session?.user.user_metadata, email: session?.user.email }),
    hasUpload: !!uploaded.url,
    change: async (photo?: Blob) => {
      if (!store) throw new Error('Photo settings are loading. Try again.');
      await store.change(() => api<ProfileAvatar>('/api/profile/avatar', photo ? { method: 'PUT', binaryBody: photo } : { method: 'DELETE' }));
    },
  };
}
