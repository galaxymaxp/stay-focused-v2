"use client";
import { useAuth } from "../components/providers";
import { Heading, Notice, RowLink } from "../components/ui";
import { useAction } from "../lib/hooks";
export function SettingsScreen() {
  const { session, client, theme, setTheme } = useAuth(),
    action = useAction();
  return (
    <>
      <Heading title="Settings" back="/today" />
      <div className="settings-grid">
        <section className="surface stack">
          <h2>Account</h2>
          <div className="row">
            <span className="account-avatar" aria-hidden="true">
              {(session?.user.email ?? "S")[0].toUpperCase()}
            </span>
            <p className="grow account-email">{session?.user.email ?? "Signed-in account"}</p>
          </div>
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
        <section className="stack settings-links">
          <h2>Connections and work</h2>
          <RowLink
            href="/canvas"
            title="Canvas connection and sync"
            detail="Courses, materials, grades and announcements"
            icon="globe"
          />
          <RowLink
            href="/queue"
            title="Generation Queue"
            detail="Accepted generations continue on the server when you leave the page."
            icon="layers"
          />
        </section>
        {action.message && <Notice error>{action.message}</Notice>}
      </div>
    </>
  );
}
