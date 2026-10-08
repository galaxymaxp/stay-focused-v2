"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../../src/components/providers";
export default function Page() { const { session, loading } = useAuth(), router = useRouter(); useEffect(() => { if (!loading) router.replace(session ? "/today" : "/sign-in"); }, [session, loading, router]); return <main className="auth-page"><p role="status">Completing sign in…</p></main>; }
