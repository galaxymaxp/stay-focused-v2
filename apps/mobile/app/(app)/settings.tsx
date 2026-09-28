import { Redirect } from "expo-router";

/** Account now lives at the top of Settings; keep old links working. */
export default function SettingsRoute() {
  return <Redirect href="/appearance" />;
}
