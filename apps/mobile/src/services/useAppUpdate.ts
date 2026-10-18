import Constants from 'expo-constants';
import * as Updates from 'expo-updates';
import { useSyncExternalStore } from 'react';
import { Linking } from 'react-native';
import { sessionStore } from '../auth/sessionStore';
import { getApiBaseUrl } from '../config/apiBaseUrl';
import { appUpdateOnline, loadAppUpdate } from './appUpdateApi';
import { appUpdatePresentation, createAppUpdateStore } from './appUpdateStore';

export const installedApp = {
  version: Constants.expoConfig?.version ?? 'Unknown',
  versionCode: Constants.expoConfig?.android?.versionCode ?? 0,
  runtimeVersion: Updates.runtimeVersion ?? null,
  update: Updates.isEmbeddedLaunch || !Updates.updateId ? 'built-in' : Updates.updateId.slice(0, 8),
};

export const appUpdateStore = createAppUpdateStore({
  storage: sessionStore,
  online: async () => { const url = getApiBaseUrl(); return !!url && await appUpdateOnline(url); },
  load: async () => { const url = getApiBaseUrl(); if (!url) throw new Error('missing_api'); return loadAppUpdate(url); },
});

export function useAppUpdate() {
  const state = useSyncExternalStore(appUpdateStore.subscribe, appUpdateStore.getSnapshot, appUpdateStore.getSnapshot);
  return { ...state, ...appUpdatePresentation(state, installedApp) };
}

export function downloadAppUpdate(url: string) {
  void Linking.openURL(url).catch(() => undefined);
}
