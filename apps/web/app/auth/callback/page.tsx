"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../src/components/providers";
export default function Page() {
  const { session, loading } = useAuth(),
    router = useRouter();
  useEffect(() => {
    if (loading) return;
    // Google or Microsoft report a cancelled or refused sign-in in the URL.
    const params = new URLSearchParams(
      `${location.search.slice(1)}&${location.hash.slice(1)}`,
    );
    router.replace(
      session
        ? "/today"
        : params.has("error")
          ? "/sign-in?oauth=failed"
          : "/sign-in",
    );
  }, [session, loading, router]);
  return (
    <main className="auth-page">
      <p role="status">Completing sign in…</p>
    </main>
  );
}
