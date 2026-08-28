import { useState } from "react";
import { KeyboardAvoidingView, Platform, StyleSheet, Text, View } from "react-native";

import { useAuth } from "../../auth";
import { Button } from "../../components/Button";
import { Card } from "../../components/Card";
import { Screen } from "../../components/Screen";
import { TextField } from "../../components/TextField";
import { colors, spacing, typography } from "../../design/tokens";

interface SignUpScreenProps {
  readonly onSignInInstead: () => void;
}

/**
 * Account creation through the existing Supabase mobile client.
 *
 * Whether the project requires email confirmation is discovered from the
 * sign-up response rather than assumed: if a session comes back the shell's
 * auth guard routes onward on its own, and if it does not, this screen shows an
 * honest verification state instead of pretending the account is ready.
 *
 * Styling deliberately mirrors the sign-in screen; no new visual language is
 * introduced here.
 */
export function SignUpScreen({ onSignInInstead }: SignUpScreenProps) {
  const { clearError, error, isSigningUp, signUpWithEmailPassword } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [mismatch, setMismatch] = useState(false);
  const [awaitingConfirmation, setAwaitingConfirmation] = useState<string | null>(null);

  const handleSignUp = async () => {
    if (password !== confirmPassword) {
      setMismatch(true);
      return;
    }
    setMismatch(false);
    const result = await signUpWithEmailPassword(email, password);
    if (result.ok && result.data.kind === "confirmationRequired") {
      setAwaitingConfirmation(result.data.email);
    }
  };

  if (awaitingConfirmation) {
    return (
      <Screen centered contentContainerStyle={styles.authContent}>
        <View style={styles.header}>
          <Text style={styles.kicker}>Stay Focused V2</Text>
          <Text style={styles.title}>Confirm your email</Text>
        </View>
        <Card elevated style={styles.formCard} testID="auth-confirmation-state">
          <Text style={styles.subtitle}>
            {`Your account was created for ${awaitingConfirmation}. This project requires email confirmation, so open the link we sent before signing in.`}
          </Text>
          <Button fullWidth onPress={onSignInInstead} variant="primary">
            Back to sign in
          </Button>
        </Card>
      </Screen>
    );
  }

  return (
    <Screen centered contentContainerStyle={styles.authContent}>
      <KeyboardAvoidingView
        behavior={Platform.select({ ios: "padding", android: undefined })}
        style={styles.keyboardAvoiding}
      >
        <View style={styles.header}>
          <Text style={styles.kicker}>Stay Focused V2</Text>
          <Text style={styles.title}>Create your account</Text>
          <Text style={styles.subtitle}>
            You can connect Canvas after signing up, or start with your own tasks.
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
              testID="signup-email-input"
              textContentType="emailAddress"
              value={email}
            />
            <TextField
              autoCapitalize="none"
              autoComplete="password-new"
              label="Password"
              onChangeText={(value) => {
                setPassword(value);
                setMismatch(false);
                clearError();
              }}
              placeholder="Password"
              returnKeyType="next"
              secureTextEntry
              testID="signup-password-input"
              textContentType="newPassword"
              value={password}
            />
            <TextField
              autoCapitalize="none"
              autoComplete="password-new"
              label="Confirm password"
              onChangeText={(value) => {
                setConfirmPassword(value);
                setMismatch(false);
                clearError();
              }}
              onSubmitEditing={handleSignUp}
              placeholder="Repeat password"
              returnKeyType="done"
              secureTextEntry
              testID="signup-confirm-input"
              textContentType="newPassword"
              value={confirmPassword}
            />
          </View>

          {mismatch ? (
            <View style={styles.errorBox} testID="signup-mismatch-message">
              <Text style={styles.errorText}>Both passwords must match.</Text>
            </View>
          ) : null}

          {error && !mismatch ? (
            <View style={styles.errorBox} testID="signup-error-message">
              <Text style={styles.errorText}>{error.message}</Text>
            </View>
          ) : null}

          <Button
            fullWidth
            loading={isSigningUp}
            onPress={handleSignUp}
            testID="signup-submit-button"
            variant="primary"
          >
            Create account
          </Button>

          <View style={styles.divider} />
          <Button fullWidth onPress={onSignInInstead} variant="ghost">
            I already have an account
          </Button>
        </Card>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
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
});
