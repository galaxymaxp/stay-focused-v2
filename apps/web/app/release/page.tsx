import Link from "next/link";

export const metadata = { title: "Release status" };

export default function ReleaseStatusPage() {
  return <main className="stack" style={{ maxWidth: 860, margin: "48px auto", padding: 24 }}>
    <Link href="/">Stay Focused</Link>
    <h1>Showcase release status</h1>
    <p>Version 2.1.0 · Android Expo SDK 57</p>
    <section className="surface stack">
      <h2>Release verification in progress</h2>
      <p>Database preparation and visual migrations are applied. The updated Android build and production acceptance checks are still in progress.</p>
      <p>Student email delivery awaits a verified sending domain. Account preferences remain saved.</p>
      <p>An APK download will be listed here after its signed build and download checks pass.</p>
    </section>
    <p><a href="https://github.com/galaxymaxp/stay-focused-v2">Source and release evidence</a></p>
  </main>;
}
