"use client";

import { useEffect, useState } from 'react';
import { isLatestRelease, type LatestRelease } from '@stay-focused/shared';
import { DownloadQr } from './DownloadQr';

const allVersions = 'https://github.com/galaxymaxp/stay-focused-releases/releases';

export function DownloadPage() {
  const [release, setRelease] = useState<LatestRelease | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let alive = true;
    const timeout = setTimeout(() => controller.abort(), 10_000);
    async function load() {
      try {
        const response = await fetch('/api/app/latest-release', { signal: controller.signal, credentials: 'omit' });
        if (!response.ok || response.status === 204) return;
        const value: unknown = await response.json();
        if (alive && isLatestRelease(value)) setRelease(value);
      } catch {
        // Public releases remain available even when the metadata request fails.
      } finally {
        clearTimeout(timeout);
        if (alive) setLoading(false);
      }
    }
    void load();
    return () => { alive = false; clearTimeout(timeout); controller.abort(); };
  }, []);

  return (
    <main className="stack" style={{ maxWidth: 640, margin: '48px auto', padding: 24 }}>
      <h1>{release ? `Stay Focused ${release.versionName}` : 'Download Stay Focused'}</h1>
      {release ? (
        <section className="surface stack" aria-label="Android download">
          <p className="meta">Published <time dateTime={release.publishedAt}>{new Date(release.publishedAt).toLocaleDateString('en', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' })}</time></p>
          <a className="button primary" href={release.apkUrl}>Download APK</a>
          <DownloadQr url={release.apkUrl} />
          {release.notes ? <section className="stack" aria-label="What's new">
            <h2>What’s new</h2>
            <p id="release-notes" style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere', ...(expanded ? {} : { display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 3, overflow: 'hidden' }) }}>{release.notes}</p>
            <button className="subtle" aria-expanded={expanded} aria-controls="release-notes" onClick={() => setExpanded(value => !value)}>{expanded ? 'Show fewer notes' : 'Show all notes'}</button>
          </section> : null}
          <section className="stack" aria-label="Install on Android">
            <h2>Install on Android</h2>
            <ol>
              <li>Allow installs from your browser when Android asks.</li>
              <li>Open the downloaded APK to install Stay Focused.</li>
              <li>Installing over the old app keeps your data.</li>
            </ol>
          </section>
        </section>
      ) : <p role="status" className="muted">{loading ? 'Checking the latest Android release…' : 'The latest download is available from our public releases.'}</p>}
      <p><a href={allVersions}>All versions</a></p>
    </main>
  );
}
