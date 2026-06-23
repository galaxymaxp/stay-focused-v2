import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { useAuth } from "../src/auth";
import { Button } from "../src/components/Button";
import { Card } from "../src/components/Card";
import { Screen } from "../src/components/Screen";
import { TextField } from "../src/components/TextField";
import { colors, spacing, typography } from "../src/design/tokens";
import { ReviewerGenerateScreen } from "../src/features/reviewer/ReviewerGenerateScreen";

export default function IndexScreen() {
  const auth = useAuth();

  if (auth.isRestoring) {
    return <RestoringState />;
  }

  if (auth.session) {
    return <ReviewerGenerateScreen />;
  }

  return <LoginScreen />;
}

function RestoringState() {
  return (
    <Screen centered scroll={false}>
      <Card elevated style={styles.restoringCard}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.restoringTitle}>Restoring session</Text>
        <Text style={styles.mutedText}>Checking your saved sign-in state.</Text>
      </Card>
    </Screen>
  );
}

function LoginScreen() {
  const {
    clearError,
    error,
    isSigningIn,
    signInWithEmailPassword,
  } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSignIn = async () => {
    await signInWithEmailPassword(email, password);
  };

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
              textContentType="password"
              value={password}
            />
          </View>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error.message}</Text>
            </View>
          ) : null}

          <Button
            fullWidth
            loading={isSigningIn}
            onPress={handleSignIn}
            variant="primary"
          >
            Sign in
          </Button>

          <View style={styles.divider} />
          <Text style={styles.oauthNote}>
            Microsoft and Google sign-in are coming later.
          </Text>
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
  mutedText: {
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    lineHeight: 19,
    textAlign: "center",
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
  restoringCard: {
    alignItems: "center",
    gap: spacing[3],
  },
  restoringTitle: {
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.h3,
    fontWeight: "800",
  },
});
