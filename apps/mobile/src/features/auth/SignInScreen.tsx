import { useMemo , useState } from "react";
import { useLegacyTheme, type LegacyColors } from "../../design/theme";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../../auth";
import { openProviderAuth, requestPasswordReset } from "../../auth/providerAuth";
import type { OAuthProvider } from "../../auth/authTypes";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Screen } from "../../components/Screen";
import { TextField } from "../../components/TextField";
import { spacing, typography } from "../../design/tokens";

interface SignInScreenProps {
  readonly onCreateAccount: () => void;
}

export function SignInScreen({ onCreateAccount }: SignInScreenProps) {
  const colors = useLegacyTheme();
  const styles = useMemo(() => createStyles(colors), [colors]);

  const { clearError, error, isSigningIn, signInWithEmailPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [providerBusy, setProviderBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const handleSignIn = async () => {
    await signInWithEmailPassword(email, password);
    setPassword("");
  };
  async function providerSignIn(provider: OAuthProvider) {
    if (providerBusy || isSigningIn) return;
    setProviderBusy(true);
    setNotice(null);
    const result = await openProviderAuth(provider);
    setProviderBusy(false);
    if (!result.ok) setNotice(result.error.message);
  }
  async function resetPassword() {
    if (providerBusy || isSigningIn) return;
    setProviderBusy(true);
    const result = await requestPasswordReset(email);
    setProviderBusy(false);
    setNotice(result.ok ? "If this account exists, a reset link will arrive by email. Open it on this device." : result.error.message);
  }

  return (
    <Screen centered contentContainerStyle={styles.authContent}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={styles.keyboardAvoiding}
      >
        <View style={styles.header}>
          <Text style={styles.kicker}>Stay Focused V2</Text>
          <Text style={styles.title}>Sign in to continue</Text>
          <Text style={styles.subtitle}>
            Keep your session ready for reviewer generation and saved study work.
          </Text>
        </View>

        <Card elevated style={styles.formCard}>
          <View style={styles.formFields}>
            <TextField
              autoCapitalize="none"
              autoComplete="email"
              inputMode="email"
              keyboardType="email-address"
              label="Email"
              onChangeText={(value) => {
                setEmail(value);
                clearError();
              }}
              placeholder="you@example.com"
              returnKeyType="next"
              testID="auth-email-input"
              textContentType="emailAddress"
              value={email}
            />
            <TextField
              autoCapitalize="none"
              autoComplete="password"
              label="Password"
              onChangeText={(value) => {
                setPassword(value);
                clearError();
              }}
              onSubmitEditing={handleSignIn}
              placeholder="Password"
              returnKeyType="done"
              secureTextEntry
              testID="auth-password-input"
              textContentType="password"
              value={password}
            />
          </View>

          {error ? (
            <View style={styles.errorBox} testID="auth-error-message">
              <Text style={styles.errorText}>{error.message}</Text>
            </View>
          ) : null}

          <Button
            fullWidth
            loading={isSigningIn}
            disabled={providerBusy}
            onPress={handleSignIn}
            testID="auth-submit-button"
            variant="primary"
          >
            Sign in
          </Button>

          <View style={styles.divider} />
          {notice ? <Text accessibilityRole="alert" style={styles.oauthNote}>{notice}</Text> : null}
          <Button fullWidth disabled={providerBusy || isSigningIn} onPress={() => void providerSignIn("google")} testID="auth-google-button" variant="secondary">Continue with Google</Button>
          <Button fullWidth disabled={providerBusy || isSigningIn} onPress={() => void providerSignIn("microsoft")} testID="auth-microsoft-button" variant="secondary">Continue with Microsoft</Button>
          <Button fullWidth disabled={providerBusy || isSigningIn} onPress={() => void resetPassword()} testID="auth-reset-button" variant="ghost">Forgot password?</Button>
          <Button fullWidth onPress={onCreateAccount} variant="ghost">
            Create an account
          </Button>
        </Card>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const createStyles = (colors: LegacyColors) => StyleSheet.create({
  authContent: {
    gap: spacing[6],
  },
  keyboardAvoiding: {
    gap: spacing[6],
  },
  header: {
    gap: spacing[3],
  },
  kicker: {
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
    fontSize: typography.kicker,
    fontWeight: "800",
    letterSpacing: 1.2,
    textTransform: "uppercase",
  },
  title: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.h1,
    fontWeight: "800",
    lineHeight: 30,
  },
  subtitle: {
    color: colors.textSecondary,
    fontFamily: typography.fontFamily,
    fontSize: typography.body,
    lineHeight: 23,
  },
  formCard: {
    gap: spacing[5],
  },
  formFields: {
    gap: spacing[4],
  },
  errorBox: {
    backgroundColor: colors.errorSurface,
    borderColor: colors.error,
    borderRadius: 12,
    borderWidth: 1,
    padding: spacing[3],
  },
  errorText: {
    color: colors.error,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    lineHeight: 19,
  },
  divider: {
    backgroundColor: colors.border,
    height: 1,
  },
  oauthNote: {
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    lineHeight: 19,
    textAlign: "center",
  },
});
