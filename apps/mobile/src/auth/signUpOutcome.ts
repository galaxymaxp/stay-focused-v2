/**
 * Supabase reports the two legitimate sign-up outcomes by what it returns, not
 * by an explicit flag:
 *
 * - a session means the account is usable immediately (email confirmation off)
 * - a user with no session means the account exists but must be confirmed
 *
 * The project's confirmation setting is therefore read from the response at
 * runtime instead of being assumed at build time, so the app stays correct
 * whichever way the linked project is configured.
 */
export type SignUpOutcomeKind = "signedIn" | "confirmationRequired" | "unknown";

export function classifySignUpResult(input: {
  readonly hasSession: boolean;
  readonly hasUser: boolean;
}): SignUpOutcomeKind {
  if (input.hasSession) return "signedIn";
  if (input.hasUser) return "confirmationRequired";
  return "unknown";
}
