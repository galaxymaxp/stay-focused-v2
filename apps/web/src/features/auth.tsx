"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { useAuth } from "../components/providers";
import { Icon, Notice } from "../components/ui";
import { useAction } from "../lib/hooks";
export function AuthScreen({ signUp = false }: { signUp?: boolean }) {
  const { client, session, loading, error, theme, setTheme } = useAuth(),
    router = useRouter();
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState("");
  const action = useAction();
  useEffect(() => {
    if (!loading && session) router.replace("/today");
  }, [loading, session, router]);
  // Set by the OAuth callback when Google or Microsoft did not finish.
  const [oauthFailed, setOauthFailed] = useState(false);
  useEffect(() => {
    setOauthFailed(
      new URLSearchParams(location.search).get("oauth") === "failed",
    );
  }, []);
  function continueWith(provider: "google" | "azure") {
    void action.run(async () => {
      if (!client)
        throw new Error("Sign-in is not configured for this environment.");
      const { error } = await client.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${location.origin}/auth/callback`,
          // Microsoft only returns an email address when asked for it.
          ...(provider === "azure" ? { scopes: "email" } : {}),
        },
      });
      if (error)
        throw new Error("Could not start that sign-in. Please try again.");
    });
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    void action.run(async () => {
      if (!client)
        throw new Error("Sign-in is not configured for this environment.");
      const result = signUp
        ? await client.auth.signUp({
            email: email.trim(),
            password,
            options: { emailRedirectTo: `${location.origin}/auth/callback` },
          })
        : await client.auth.signInWithPassword({
            email: email.trim(),
            password,
          });
      if (result.error)
        throw new Error(
          signUp
            ? "Could not create your account. Check your details and try again."
            : "Could not sign in. Check your email and password and try again.",
        );
      if (result.data.session) router.replace("/today");
      else {
        setPassword("");
        action.setMessage(
          "Check your email to confirm your account, then sign in.",
        );
      }
    });
  }
  return (
    <main className="auth-page">
      <div className="auth-card">
        <Link className="brand" href="/sign-in">
          <Icon name="layers" />
          <span>Stay Focused</span>
        </Link>
        <h1>{signUp ? "Create your account" : "Welcome back"}</h1>
        <p className="muted">
          {signUp
            ? "Bring your coursework, plans, and study materials together."
            : "Sign in to continue your day."}
        </p>
        {error && <Notice error>{error}</Notice>}
        {oauthFailed && (
          <Notice error>
            That sign-in did not finish. Try again or use your email and
            password.
          </Notice>
        )}
        <div className="stack oauth-buttons">
          <button
            type="button"
            disabled={loading || !client || action.busy}
            onClick={() => continueWith("google")}
          >
            <GoogleMark />
            Continue with Google
          </button>
          <button
            type="button"
            disabled={loading || !client || action.busy}
            onClick={() => continueWith("azure")}
          >
            <MicrosoftMark />
            Continue with Microsoft
          </button>
        </div>
        <p className="or-divider" aria-hidden="true">
          <span>or use your email</span>
        </p>
        <form onSubmit={submit} className="stack">
          <label>
            Email
            <input
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label>
            Password
            <input
              type="password"
              autoComplete={signUp ? "new-password" : "current-password"}
              minLength={signUp ? 8 : 1}
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
          {action.message && <Notice>{action.message}</Notice>}
          <button
            className="primary"
            disabled={loading || !client || action.busy}
          >
            {action.busy
              ? "Please wait…"
              : signUp
                ? "Create account"
                : "Sign in"}
          </button>
        </form>
        <p className="meta">
          {signUp ? "Already have an account? " : "New to Stay Focused? "}
          <Link href={signUp ? "/sign-in" : "/sign-up"}>
            {signUp ? "Sign in" : "Create an account"}
          </Link>
        </p>
        <label className="theme-select">
          Appearance
          <select
            aria-label="Appearance"
            value={theme}
            onChange={(event) => setTheme(event.target.value as typeof theme)}
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
      </div>
    </main>
  );
}
function GoogleMark() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.1H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.6-.4-3.9z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.1H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.6-.4-3.9z"
      />
    </svg>
  );
}
function MicrosoftMark() {
  return (
    <svg width="16" height="16" viewBox="0 0 21 21" aria-hidden="true">
      <path fill="#F25022" d="M1 1h9v9H1z" />
      <path fill="#7FBA00" d="M11 1h9v9h-9z" />
      <path fill="#00A4EF" d="M1 11h9v9H1z" />
      <path fill="#FFB900" d="M11 11h9v9h-9z" />
    </svg>
  );
}
