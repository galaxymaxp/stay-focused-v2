import { createCanvas, loadImage } from '@napi-rs/canvas';
import { AVATAR_MAX_BYTES } from '@stay-focused/shared';

export class AvatarFailure extends Error {
  constructor(readonly status: number, readonly code: string) { super(code); }
}

/** Read binary data with the same wire-byte bound as bounded-body, without text conversion. */
export async function readAvatarBytes(request: Request): Promise<Buffer> {
  const declared = Number(request.headers.get('content-length'));
  if (declared > AVATAR_MAX_BYTES) throw new AvatarFailure(413, 'file_too_large');
  const reader = request.body?.getReader();
  if (!reader) throw new AvatarFailure(400, 'invalid_image');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > AVATAR_MAX_BYTES) {
        try { await reader.cancel(); } catch { /* Rejection already decided. */ }
        throw new AvatarFailure(413, 'file_too_large');
      }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  return Buffer.concat(chunks, size);
}

function imageHeader(bytes: Buffer): { mime: string; width: number; height: number } | null {
  if (bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) && bytes.toString('ascii',12,16) === 'IHDR') {
    return { mime: 'image/png', width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  }
  if (bytes.length >= 4 && bytes[0] === 255 && bytes[1] === 216) {
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset++] !== 255) return null;
      while (bytes[offset] === 255) offset++;
      const marker = bytes[offset++];
      if (marker === 0xda || marker === 0xd9) break;
      if (marker === undefined || offset + 2 > bytes.length) return null;
      const length = bytes.readUInt16BE(offset);
      if (length < 2 || offset + length > bytes.length) return null;
      if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker) && length >= 8) {
        return { mime: 'image/jpeg', width: bytes.readUInt16BE(offset + 5), height: bytes.readUInt16BE(offset + 3) };
      }
      offset += length;
    }
  }
  if (bytes.length >= 30 && bytes.toString('ascii',0,4) === 'RIFF' && bytes.toString('ascii',8,12) === 'WEBP' && bytes.readUInt32LE(4) + 8 === bytes.length) {
    const format = bytes.toString('ascii',12,16);
    if (format === 'VP8X') return { mime: 'image/webp', width: bytes.readUIntLE(24,3) + 1, height: bytes.readUIntLE(27,3) + 1 };
    if (format === 'VP8 ' && bytes.subarray(23,26).equals(Buffer.from([157,1,42]))) return { mime: 'image/webp', width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff };
    if (format === 'VP8L' && bytes[20] === 47) {
      const packed = bytes.readUInt32LE(21);
      return { mime: 'image/webp', width: (packed & 0x3fff) + 1, height: ((packed >>> 14) & 0x3fff) + 1 };
    }
  }
  return null;
}

export async function normalizeAvatar(bytes: Buffer, mime: string): Promise<Buffer> {
  if (bytes.length > AVATAR_MAX_BYTES) throw new AvatarFailure(413, 'file_too_large');
  const header = imageHeader(bytes);
  if (!header || header.mime !== mime || !['image/jpeg','image/png','image/webp'].includes(mime)) throw new AvatarFailure(415, 'invalid_image');
  if (header.width < 1 || header.height < 1 || header.width > 8192 || header.height > 8192 || header.width * header.height > 16_777_216) throw new AvatarFailure(400, 'invalid_image');
  try {
    // Never pass a URL/path to this decoder: input is already bounded local bytes.
    const image = await loadImage(bytes);
    if (!image.width || !image.height || image.width * image.height > 16_777_216) throw new Error('dimensions');
    const side = Math.min(image.width, image.height);
    const size = Math.min(side, 512);
    const canvas = createCanvas(size, size);
    canvas.getContext('2d').drawImage(image, (image.width-side)/2, (image.height-side)/2, side, side, 0, 0, size, size);
    const png = await canvas.encode('png');
    if (png.length > AVATAR_MAX_BYTES) throw new Error('size');
    return png;
  } catch { throw new AvatarFailure(400, 'invalid_image'); }
}
