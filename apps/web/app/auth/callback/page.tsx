"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../src/components/providers";
import { sharedReturnPath } from '@stay-focused/shared';
import { hasRecoveryIntent } from '../../../src/features/password-reset';
export default function Page() {
  const { session, loading, recoveryRequired } = useAuth(),
    router = useRouter();
  useEffect(() => {
    // Even malformed/expired recovery links belong on the reset error screen,
    // rather than reusing an unrelated signed-in session to enter the app.
    if (recoveryRequired || hasRecoveryIntent(location.search, location.hash)) {
      router.replace(`/auth/reset${location.search}${location.hash}`);
      return;
    }
    if (loading) return;
    // Google or Microsoft report a cancelled or refused sign-in in the URL.
    const params = new URLSearchParams(
      `${location.search.slice(1)}&${location.hash.slice(1)}`,
    );
    router.replace(
      session
        ? sharedReturnPath(params.get('next'))
        : params.has("error")
          ? `/sign-in?oauth=failed&next=${encodeURIComponent(sharedReturnPath(params.get('next')))}`
          : `/sign-in?next=${encodeURIComponent(sharedReturnPath(params.get('next')))}`,
    );
  }, [session, loading, recoveryRequired, router]);
  return (
    <main className="auth-page">
      <p role="status">Completing sign in…</p>
    </main>
  );
}
