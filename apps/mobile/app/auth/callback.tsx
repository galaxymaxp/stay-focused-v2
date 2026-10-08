import { useEffect, useMemo, useState } from "react";
import { Redirect, router, useLocalSearchParams } from "expo-router";
import { Text } from "react-native";
import { useAuth } from "../../src/auth";
import { authCallbackUrlFromParams } from "../../src/auth/authCallback";
import { completeAuthCallback, updateRecoveredPassword } from "../../src/auth/providerAuth";
import { Button } from "../../src/components/Button";
import { Screen } from "../../src/components/Screen";
import { TextField } from "../../src/components/TextField";
import { APP_ROUTES, POST_SIGN_IN_ROUTE } from "../../src/navigation/appRoutes";
import { useLegacyTheme } from "../../src/design/theme";

export default function AuthCallbackScreen() {
  const colors = useLegacyTheme();
  const { session } = useAuth();
  // Route params are bound to this deep link on both cold and warm returns.
  const params = useLocalSearchParams();
  const url = useMemo(() => authCallbackUrlFromParams(params), [params]);
  const [message, setMessage] = useState("Completing sign in…");
  const [recovery, setRecovery] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let mounted = true;
    setCompleted(false);
    // completeAuthCallback is keyed by code, so a re-render or a second
    // delivery of the same callback never exchanges twice.
    void completeAuthCallback(url).then((result) => {
      if (!mounted) return;
      if (!result.ok) setMessage(result.error.message);
      else if (result.data.recovery) { setRecovery(true); setMessage("Choose a new password."); }
      else setCompleted(true);
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
  // Wait for the auth listener to publish the session so the signed-in stack
  // does not bounce back to sign-in before it sees it.
  if (completed && session) return <Redirect href={POST_SIGN_IN_ROUTE} />;
  return <Screen centered>
    <Text accessibilityRole="alert" style={{ color: colors.textPrimary }}>{message}</Text>
    {recovery ? <>
      <TextField label="New password" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" autoComplete="new-password" />
      <Button loading={busy} onPress={update}>Save password</Button>
    </> : null}
    <Button variant="ghost" onPress={() => router.replace(APP_ROUTES.signIn)}>Return to sign in</Button>
  </Screen>;
}
