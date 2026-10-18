"use client";
import { useAuth } from "../components/providers";
import { Heading, Notice, RowLink } from "../components/ui";
import { useAction } from "../lib/hooks";
import { NotificationSettings } from "./notification-settings";
import { useRef, useState } from 'react';
import { Avatar } from '../components/avatar';
import { useProfileAvatar } from '../components/profile-avatar';
import { cropAvatar } from '../lib/crop-avatar';
export function SettingsScreen() {
  const photo = useProfileAvatar();
  const input = useRef<HTMLInputElement>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);
  async function changePhoto(file?: File) {
    if (photoBusy) return;
    setPhotoBusy(true); setPhotoError(null);
    try { await photo.change(file ? await cropAvatar(file) : undefined); }
    catch (error) { setPhotoError(error instanceof Error ? error.message : 'Could not update your photo. Try again.'); }
    finally { setPhotoBusy(false); }
  }
  const { session, signOut, theme, setTheme } = useAuth(),
    action = useAction();
  return (
    <>
      <Heading title="Settings" back="/today" />
      <div className="settings-grid">
        <section className="surface stack">
          <h2>Account</h2>
          <div className="row">
            <Avatar url={photo.url} initial={photo.initial} className="account-avatar" />
            <p className="grow account-email">{session?.user.email ?? "Signed-in account"}</p>
          </div>
          <input ref={input} type="file" hidden accept="image/jpeg,image/png,image/webp" aria-label="Choose profile photo" onChange={event => {
            const file = event.target.files?.[0]; event.target.value = ''; if (file) void changePhoto(file);
          }} />
          <div className="row wrap">
            <button disabled={photoBusy} onClick={() => input.current?.click()}>{photoBusy ? 'Updating photo…' : 'Change photo'}</button>
            {photo.hasUpload && <button disabled={photoBusy} onClick={() => { if (window.confirm('Remove your uploaded photo? Your sign-in photo or initials will appear instead.')) void changePhoto(); }}>Remove photo</button>}
          </div>
          {photoError && <Notice error>{photoError}</Notice>}
          <button
            disabled={action.busy}
            onClick={() =>
              void action.run(async () => {
                await signOut();
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
        <NotificationSettings />
        <section className="stack settings-links">
          <h2>Connections and work</h2>
          <RowLink
            href="/canvas"
            title="Canvas connection and sync"
            detail="Courses, materials, grades and announcements"
            icon="globe"
          />
          <RowLink
            href="/today?queue=open"
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
