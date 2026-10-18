"use client";

import { useMemo } from 'react';
import qrcode from 'qrcode-generator';

// Byte mode must also preserve non-ASCII asset names in a public APK URL.
qrcode.stringToBytes = value => Array.from(new TextEncoder().encode(value));

export function DownloadQr({ url }: { url: string }) {
  const code = useMemo(() => {
    try {
      const qr = qrcode(0, 'M');
      qr.addData(url, 'Byte');
      qr.make();
      const size = qr.getModuleCount();
      const modules: string[] = [];
      for (let row = 0; row < size; row++) {
        for (let col = 0; col < size; col++) {
          if (qr.isDark(row, col)) modules.push(`M${col + 4} ${row + 4}h1v1h-1z`);
        }
      }
      return { size: size + 8, path: modules.join('') };
    } catch {
      // A URL too large for QR must never hide the working APK link.
      return null;
    }
  }, [url]);
  if (!code) return null;
  return <figure className="stack" style={{ margin: 0, alignItems: 'center' }}>
    <svg role="img" aria-label="Scan to download the Android APK" viewBox={`0 0 ${code.size} ${code.size}`} width="240" height="240" style={{ maxWidth: '100%', height: 'auto' }} shapeRendering="crispEdges">
      <rect width={code.size} height={code.size} fill="white" />
      <path d={code.path} fill="black" />
    </svg>
    <figcaption className="meta">Scan with your Android phone to download.</figcaption>
  </figure>;
}
