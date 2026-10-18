"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="auth-page">
      <h1>This page could not be loaded.</h1>
      <button className="button retry-button" onClick={reset}>Try again</button>
    </main>
  );
}
