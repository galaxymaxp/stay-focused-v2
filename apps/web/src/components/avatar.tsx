"use client";
import { useState } from 'react';

export function Avatar({ url, initial, className = 'avatar' }: { url?: string; initial: string; className?: string }) {
  const [failed, setFailed] = useState<string>();
  return <span className={className} aria-hidden="true">
    {url && failed !== url ? (
      // Session provider URLs and short-lived private URLs have dynamic hosts.
      // eslint-disable-next-line @next/next/no-img-element
      <img src={url} alt="" referrerPolicy="no-referrer" onError={() => setFailed(url)} />
    ) : initial}
  </span>;
}
