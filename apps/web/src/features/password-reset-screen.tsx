"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { LogoMark } from "../components/brand";
import { LegalLinks } from "../components/legal-links";
import { useAuth } from "../components/providers";
import { Notice } from "../components/ui";
import { useAction } from "../lib/hooks";
import { EXPIRED_RESET, resetPageState, updateWebPassword } from "./password-reset";

export function PasswordResetScreen() {
  const { client, session, loading, recoveryRequired, completePasswordRecovery } = useAuth();
  const router = useRouter(), action = useAction();
  const [password, setPassword] = useState(""), [confirmation, setConfirmation] = useState("");
  const [updated, setUpdated] = useState(false);
  const state = resetPageState(loading, recoveryRequired, Boolean(session));

  function submit(event: FormEvent) {
    event.preventDefault();
    void action.run(async () => {
      if (!client || state !== "ready") throw new Error(EXPIRED_RESET);
      await updateWebPassword(client, password, confirmation);
      setPassword("");
      setConfirmation("");
      setUpdated(true);
      action.setMessage("Password updated.");
      completePasswordRecovery();
      router.replace("/today");
    });
  }

  return <main className="auth-page">
    <div className="auth-card">
      <Link className="brand" href="/sign-in"><LogoMark size={28} /><span>Stay Focused</span></Link>
      <h1>Choose a new password</h1>
      {updated ? <Notice>Password updated.</Notice> : state === "loading" ? <Notice>Checking reset link…</Notice> : state === "expired" ? <Notice error>{EXPIRED_RESET}</Notice> : <form className="stack" onSubmit={submit} noValidate>
        <label>New password<input type="password" autoComplete="new-password" minLength={8} required value={password} onChange={event => setPassword(event.target.value)} /></label>
        <label>Confirm password<input type="password" autoComplete="new-password" minLength={8} required value={confirmation} onChange={event => setConfirmation(event.target.value)} /></label>
        {action.message && <Notice>{action.message}</Notice>}
        <button className="primary" disabled={action.busy || !client}>{action.busy ? "Please wait…" : "Save password"}</button>
      </form>}
      <p className="meta"><Link href="/sign-in">Sign in</Link></p>
      <LegalLinks />
    </div>
  </main>;
}
