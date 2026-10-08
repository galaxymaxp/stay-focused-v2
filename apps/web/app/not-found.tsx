import Link from "next/link";
export default function NotFound() {
  return (
    <main className="auth-page">
      <h1>This page is unavailable.</h1>
      <Link href="/today">Return to Today</Link>
    </main>
  );
}
