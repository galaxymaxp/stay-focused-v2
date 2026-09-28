import { useEffect, useState } from "react";
import * as Linking from "expo-linking";
import { router } from "expo-router";
import { Text } from "react-native";
import { completeAuthCallback, updateRecoveredPassword } from "../../src/auth/providerAuth";
import { Button } from "../../src/components/Button";
import { Screen } from "../../src/components/Screen";
import { TextField } from "../../src/components/TextField";
import { APP_ROUTES, POST_SIGN_IN_ROUTE } from "../../src/navigation/appRoutes";
import { useLegacyTheme } from "../../src/design/theme";

export default function AuthCallbackScreen() {
  const colors = useLegacyTheme();
  const url = Linking.useURL();
  const [message, setMessage] = useState("Completing sign in…");
  const [recovery, setRecovery] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!url) return;
    let mounted = true;
    void completeAuthCallback(url).then((result) => {
      if (!mounted) return;
      if (!result.ok) setMessage(result.error.message);
      else if (result.data.recovery) { setRecovery(true); setMessage("Choose a new password."); }
      else router.replace(POST_SIGN_IN_ROUTE);
    });
    return () => { mounted = false; };
  }, [url]);
  async function update() {
    if (busy) return;
    setBusy(true);
    const result = await updateRecoveredPassword(password);
    setPassword("");
    setBusy(false);
    if (result.ok) router.replace(POST_SIGN_IN_ROUTE);
    else setMessage(result.error.message);
  }
  return <Screen centered>
    <Text accessibilityRole="alert" style={{ color: colors.textPrimary }}>{message}</Text>
    {recovery ? <>
      <TextField label="New password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete="new-password" />
      <Button loading={busy} onPress={update}>Save password</Button>
    </> : null}
    <Button variant="ghost" onPress={() => router.replace(APP_ROUTES.signIn)}>Return to sign in</Button>
  </Screen>;
}
