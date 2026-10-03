import { Check, LogOut, Vibrate, Volume2 } from "lucide-react-native";
import { useEffect, useState, type ReactNode } from "react";
import { Pressable, Switch, View } from "react-native";
import Svg, { Path, Rect } from "react-native-svg";

import { useAuth } from "../../auth";
import type { OAuthProvider } from "../../auth/authTypes";
import { openProviderAuth } from "../../auth/providerAuth";
import { getFeedbackPreferences, loadFeedbackPreferences, saveFeedbackPreferences, type FeedbackPreferences } from "../../design/feedback";
import { haptic } from "../../design/haptics";
import { Copy, Notice, Page, SegmentedControl, Surface } from "../../design/primitives";
import { useTheme, type PaletteFamily, type ThemePreference } from "../../design/theme";
import { hitTarget, radius, spacing } from "../../design/tokens";
import { NotificationSettings } from "./NotificationSettings";

const modes: readonly { value: ThemePreference; label: string }[] = [
  { value: "system", label: "Automatic" },
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
];
const families: readonly { value: PaletteFamily; label: string }[] = [
  { value: "standard", label: "Stay Focused" },
  { value: "uc_inspired", label: "UC-inspired" },
];

/**
 * Link pills follow Google's and Microsoft's sign-in guidance: a white Google
 * control with a grey outline and a dark Microsoft control, each beside its mark.
 */
const PROVIDERS: readonly {
  readonly provider: OAuthProvider;
  readonly supabaseName: string;
  readonly name: string;
  readonly background: string;
  readonly border: string;
  readonly text: string;
  readonly Logo: () => ReactNode;
}[] = [
  { provider: "google", supabaseName: "google", name: "Google", background: "#FFFFFF", border: "#747775", text: "#1F1F1F", Logo: GoogleLogo },
  { provider: "microsoft", supabaseName: "azure", name: "Microsoft", background: "#2F2F2F", border: "#2F2F2F", text: "#FFFFFF", Logo: MicrosoftLogo },
];

/**
 * One grouped list in the app's own language: uppercase section labels above
 * surfaces of 32-point icon-chip rows. Account comes first because it is what
 * people open Settings for; Canvas lives under Sync in the profile menu.
 */
export function SettingsScreen() {
  const { colors, preference, setPreference, family, setFamily, reducedMotion } = useTheme();
  const { isSigningOut, session, signOut } = useAuth();
  const [linkBusy, setLinkBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<FeedbackPreferences>(getFeedbackPreferences);
  useEffect(() => { void loadFeedbackPreferences().then(setFeedback); }, []);

  const email = session?.user.email ?? null;
  const linked = readLinkedProviders(session?.user.appMetadata);

  async function link(provider: OAuthProvider) {
    if (linkBusy || isSigningOut) return;
    setLinkBusy(true);
    const result = await openProviderAuth(provider, true);
    setNotice(result.ok ? "Finish linking in your browser. Your saved work stays with this account." : result.error.message);
    setLinkBusy(false);
  }
  const toggle = (key: keyof FeedbackPreferences) => {
    const next = { ...feedback, [key]: !feedback[key] };
    setFeedback(next);
    void saveFeedbackPreferences(next).catch(() => { setFeedback(feedback); setError("Could not save your feedback preference."); });
  };
  const save = (task: Promise<void>) => void task.catch(() => setError("Could not save your appearance preference."));

  return (
    <Page title="Settings" back>
      <Section title="Account">
        <Surface style={{ gap: 0, paddingVertical: spacing[1] }}>
          <Row icon={<Avatar initial={email?.trim()[0]?.toLocaleUpperCase() ?? "·"} />} title={email ?? "Your account"} caption="Signed in to Stay Focused" />
          {PROVIDERS.map(({ provider, supabaseName, name, background, border, text, Logo }) => {
            const isLinked = linked.has(supabaseName);
            return (
              <Row
                key={provider}
                divider
                icon={<Chip background="#FFFFFF" border={colors.separator}><Logo /></Chip>}
                title={name}
                caption={isLinked ? "Linked to this account" : "Not linked"}
                trailing={isLinked ? (
                  <View accessibilityLabel={`${name} linked`} style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                    <Check size={15} color={colors.success} strokeWidth={2.4} />
                    <Copy size="caption" color={colors.success} style={{ fontWeight: "600" }}>Linked</Copy>
                  </View>
                ) : (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Link ${name}`}
                    accessibilityState={{ disabled: linkBusy || isSigningOut }}
                    disabled={linkBusy || isSigningOut}
                    testID={`settings-link-${provider}`}
                    hitSlop={8}
                    onPress={() => { haptic.tap(); void link(provider); }}
                    style={({ pressed }) => ({ minHeight: 32, paddingHorizontal: spacing[4], borderRadius: radius.pill, borderWidth: 1, borderColor: border, backgroundColor: background, alignItems: "center", justifyContent: "center", opacity: linkBusy || isSigningOut ? 0.5 : pressed ? 0.8 : 1 })}
                  >
                    <Copy size="caption" color={text} style={{ fontWeight: "600", fontSize: 13 }}>Link</Copy>
                  </Pressable>
                )}
              />
            );
          })}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign out"
            accessibilityState={{ disabled: isSigningOut }}
            disabled={isSigningOut}
            testID="settings-sign-out"
            onPress={() => { haptic.tap(); void signOut(); }}
            style={({ pressed }) => ({ opacity: isSigningOut ? 0.5 : pressed ? 0.7 : 1 })}
          >
            <Row divider icon={<Chip background={colors.redSoft}><LogOut size={16} color={colors.danger} strokeWidth={1.9} /></Chip>} title={isSigningOut ? "Signing out…" : "Sign out"} titleColor={colors.danger} />
          </Pressable>
        </Surface>
        {PROVIDERS.some(({ supabaseName }) => !linked.has(supabaseName)) ? (
          <Copy muted size="caption" style={{ paddingHorizontal: spacing[1] }}>Link Google or Microsoft to sign in with them later and keep this account’s saved work.</Copy>
        ) : null}
        {notice ? <Notice>{notice}</Notice> : null}
      </Section>

      <NotificationSettings />
      <Section title="Appearance">
        <Surface style={{ gap: spacing[3] }}>
          <View style={{ gap: spacing[2] }}>
            <Copy size="bodySmall">Mode</Copy>
            <SegmentedControl segments={modes} value={preference} onChange={(value) => save(setPreference(value))} />
          </View>
          <View style={{ gap: spacing[2] }}>
            <Copy size="bodySmall">Color theme</Copy>
            <SegmentedControl segments={families} value={family} onChange={(value) => save(setFamily(value))} />
            {family === "uc_inspired" ? (
              <Copy muted size="caption">Inspired by the University of the Cordilleras for evaluation. This is not official UC branding.</Copy>
            ) : null}
          </View>
          <View style={{ height: 1, backgroundColor: colors.separator }} />
          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing[3] }}>
            <Copy size="bodySmall">Reduced motion</Copy>
            <Copy muted size="caption">{reducedMotion ? "On" : "Off"} · follows your device</Copy>
          </View>
        </Surface>
      </Section>

      <Section title="Feedback">
        <Surface style={{ gap: 0, paddingVertical: spacing[1] }}>
          <Row
            icon={<Chip background={colors.blueSoft}><Volume2 size={16} color={colors.accent} strokeWidth={1.8} /></Chip>}
            title="Sounds"
            caption="Short sounds for answers and completions"
            trailing={<Toggle label="Sounds" value={feedback.sounds} onChange={() => toggle("sounds")} />}
          />
          <Row
            divider
            icon={<Chip background={colors.blueSoft}><Vibrate size={16} color={colors.accent} strokeWidth={1.8} /></Chip>}
            title="Haptics"
            caption="Light vibration on taps and selections"
            trailing={<Toggle label="Haptics" value={feedback.haptics} onChange={() => toggle("haptics")} />}
          />
        </Surface>
      </Section>
      {error ? <Notice>{error}</Notice> : null}
    </Page>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ gap: spacing[2] }}>
      <Copy muted size="caption" style={{ fontWeight: "600", letterSpacing: 0.4, textTransform: "uppercase", paddingHorizontal: spacing[1] }}>{title}</Copy>
      {children}
    </View>
  );
}

/** A settings row; dividers start after the icon, as in the system lists. */
function Row({ icon, title, caption, trailing, divider = false, titleColor }: { icon: ReactNode; title: string; caption?: string; trailing?: ReactNode; divider?: boolean; titleColor?: string }) {
  const { colors } = useTheme();
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[3], minHeight: hitTarget.min + 8 }}>
      {icon}
      <View style={{ flex: 1, minWidth: 0, alignSelf: "stretch", flexDirection: "row", alignItems: "center", gap: spacing[3], borderTopWidth: divider ? 1 : 0, borderTopColor: colors.separator }}>
        <View style={{ flex: 1, minWidth: 0, gap: 2, paddingVertical: spacing[2] }}>
          <Copy numberOfLines={1} color={titleColor} style={titleColor ? { fontWeight: "600" } : undefined}>{title}</Copy>
          {caption ? <Copy muted size="caption" numberOfLines={2}>{caption}</Copy> : null}
        </View>
        {trailing}
      </View>
    </View>
  );
}

function Chip({ background, border, children }: { background: string; border?: string; children: ReactNode }) {
  return (
    <View style={{ width: 32, height: 32, borderRadius: radius.control - 4, backgroundColor: background, borderWidth: border ? 1 : 0, borderColor: border, alignItems: "center", justifyContent: "center" }}>
      {children}
    </View>
  );
}

function Avatar({ initial }: { initial: string }) {
  const { colors } = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={{ width: 32, height: 32, borderRadius: 16, backgroundColor: colors.blueSoft, borderWidth: 1, borderColor: colors.separator, alignItems: "center", justifyContent: "center" }}
    >
      <Copy color={colors.blue} style={{ fontSize: 15, lineHeight: 20, fontWeight: "600" }}>{initial}</Copy>
    </View>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: () => void }) {
  const { colors } = useTheme();
  return (
    <Switch
      accessibilityLabel={label}
      value={value}
      onValueChange={() => { haptic.select(); onChange(); }}
      trackColor={{ false: colors.surfaceSecondary, true: colors.success }}
      thumbColor="#FFFFFF"
      ios_backgroundColor={colors.surfaceSecondary}
    />
  );
}

/** Supabase lists every linked identity provider in `app_metadata.providers`. */
function readLinkedProviders(appMetadata: Readonly<Record<string, unknown>> | undefined): ReadonlySet<string> {
  const providers = appMetadata?.providers;
  return new Set(Array.isArray(providers) ? providers.filter((value): value is string => typeof value === "string") : []);
}

function GoogleLogo() {
  return (
    <Svg width={18} height={18} viewBox="0 0 48 48">
      <Path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <Path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <Path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <Path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </Svg>
  );
}

function MicrosoftLogo() {
  return (
    <Svg width={16} height={16} viewBox="0 0 21 21">
      <Rect x={1} y={1} width={9} height={9} fill="#F25022" />
      <Rect x={11} y={1} width={9} height={9} fill="#7FBA00" />
      <Rect x={1} y={11} width={9} height={9} fill="#00A4EF" />
      <Rect x={11} y={11} width={9} height={9} fill="#FFB900" />
    </Svg>
  );
}
