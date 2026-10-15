import Link from "next/link";

export const metadata = { title: "Release status" };

export default function ReleaseStatusPage() {
  return <main className="stack" style={{ maxWidth: 860, margin: "48px auto", padding: 24 }}>
    <Link href="/">Stay Focused</Link>
    <h1>Showcase release status</h1>
    <p>Version 2.1.0 · Android Expo SDK 57</p>
    <section className="surface stack">
      <h2>Android preview available</h2>
      <p>The signed Android preview is available for showcase testing. Physical-device verification is still in progress.</p>
      <p><a href="https://github.com/galaxymaxp/stay-focused-v2/releases/download/v2.1.0-showcase.4/stay-focused-v2-2.1.0-android-code4.apk">Download Android APK · version 2.1.0</a></p>
      <p>Open the app online, then close and reopen it to receive the latest preview update. Your existing account and saved work stay on the device.</p>
      <p>Student email delivery awaits a verified sending domain. Account preferences remain saved.</p>
    </section>
    <p><a href="https://github.com/galaxymaxp/stay-focused-v2">Source and release evidence</a></p>
  </main>;
}
