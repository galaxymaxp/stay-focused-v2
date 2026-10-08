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
