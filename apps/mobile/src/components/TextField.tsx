import {
  StyleSheet,
  Text,
  TextInput,
  type TextInputProps,
  type TextStyle,
  View,
  type ViewStyle,
} from "react-native";

import { colors, radius, spacing, typography } from "../design/tokens";

interface TextFieldProps extends Omit<TextInputProps, "style"> {
  readonly label: string;
  readonly error?: string | null;
  readonly containerStyle?: ViewStyle;
  readonly inputStyle?: TextStyle;
}

export function TextField({
  label,
  error,
  containerStyle,
  inputStyle,
  ...props
}: TextFieldProps) {
  return (
    <View style={[styles.container, containerStyle]}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        autoCorrect={false}
        placeholderTextColor={colors.textMuted}
        selectionColor={colors.accent}
        style={[styles.input, error ? styles.inputError : null, inputStyle]}
        {...props}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing[2],
  },
  label: {
    color: colors.textMuted,
    fontFamily: typography.fontFamily,
    fontSize: typography.caption,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
  },
  input: {
    backgroundColor: colors.cardElevated,
    borderColor: colors.borderStrong,
    borderRadius: radius.control,
    borderWidth: 1,
    color: colors.textPrimary,
    fontFamily: typography.fontFamily,
    fontSize: typography.body,
    minHeight: 48,
    paddingHorizontal: spacing[4],
    paddingVertical: spacing[3],
  },
  inputError: {
    borderColor: colors.error,
  },
  error: {
    color: colors.error,
    fontFamily: typography.fontFamily,
    fontSize: typography.bodySmall,
    lineHeight: 18,
  },
});
