import Constants from "expo-constants";
import { Platform } from "react-native";

import { resolveApiBaseUrl } from "./apiBaseUrlResolution";

export { resolveApiBaseUrl } from "./apiBaseUrlResolution";

export function getApiBaseUrl(): string | undefined {
  return resolveApiBaseUrl({
    configuredValue: process.env.EXPO_PUBLIC_API_BASE_URL,
    expoHostUri: Constants.expoConfig?.hostUri,
    isDevelopment: __DEV__,
    localApiPort: readConfiguredLocalApiPort(
      process.env.EXPO_PUBLIC_LOCAL_API_PORT,
    ),
    platform: Platform.OS,
  });
}

function readConfiguredLocalApiPort(value: string | undefined): number | undefined {
  const normalized = value?.trim();
  if (!normalized) return undefined;

  const parsed = Number(normalized);
  return Number.isInteger(parsed) ? parsed : Number.NaN;
}
