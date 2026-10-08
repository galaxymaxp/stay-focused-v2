"use client";
import Link from "next/link";
import { useAuth } from "../components/providers";
import { Heading, Notice, RowLink } from "../components/ui";
import { useAction } from "../lib/hooks";
export function SettingsScreen() {
  const { session, client, theme, setTheme } = useAuth(),
    action = useAction();
  return (
    <>
      <Heading title="Settings" back="/today" />
      <div className="stack reader">
        <section className="surface stack">
          <h2>Account</h2>
          <p>{session?.user.email ?? "Signed-in account"}</p>
          <button
            disabled={action.busy}
            onClick={() =>
              void action.run(async () => {
                const result = await client?.auth.signOut({ scope: "local" });
                if (result?.error)
                  throw new Error("Could not sign out. Please try again.");
              })
            }
          >
            Sign out
          </button>
        </section>
        <section className="surface stack">
          <h2>Appearance</h2>
          <p className="muted">Choose how Stay Focused looks on this device.</p>
          <div className="segments">
            {(["system", "light", "dark"] as const).map((value) => (
              <button
                key={value}
                aria-pressed={theme === value}
                onClick={() => setTheme(value)}
              >
                {value[0].toUpperCase() + value.slice(1)}
              </button>
            ))}
          </div>
        </section>
        <RowLink
          href="/canvas"
          title="Canvas connection and sync"
          icon="globe"
        />
        <RowLink href="/queue" title="Generation Queue" icon="layers" />
        <p className="meta">
          Accepted generations continue on the server when you leave the page.
          Reopen Queue to check progress.
        </p>
        <Link href="/today">Return to Today</Link>
        {action.message && <Notice error>{action.message}</Notice>}
      </div>
    </>
  );
}
