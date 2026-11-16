import { RaceError } from "./race.ts";

export const MAX_AVATAR_BYTES = 32 * 1024;
export function validateAvatar(bytes: Uint8Array) {
  if (bytes.length > MAX_AVATAR_BYTES) throw new RaceError("Ảnh đại diện quá lớn. Hãy chọn ảnh khác.", 413);
  if (bytes.length < 12 || bytes[0] !== 255 || bytes[1] !== 216 || bytes.at(-2) !== 255 || bytes.at(-1) !== 217) throw new RaceError("Ảnh đại diện không hợp lệ.");
  let offset = 2;
  while (offset + 4 < bytes.length) {
    if (bytes[offset++] !== 255) break;
    while (bytes[offset] === 255) offset++;
    const marker = bytes[offset++];
    if (marker === 218 || marker === 217) break;
    const length = bytes[offset] * 256 + bytes[offset + 1];
    if (length < 2 || offset + length > bytes.length) break;
    if ([192, 193, 194].includes(marker) && length >= 8) {
      const height = bytes[offset + 3] * 256 + bytes[offset + 4], width = bytes[offset + 5] * 256 + bytes[offset + 6];
      if (width >= 16 && width <= 256 && height >= 16 && height <= 256) return;
      throw new RaceError("Ảnh đại diện cần có kích thước từ 16 đến 256 px.");
    }
    offset += length;
  }
  throw new RaceError("Ảnh đại diện cần là ảnh JPEG hợp lệ.");
}

export async function readAvatarBody(request: Request) {
  if (Number(request.headers.get("content-length") || 0) > MAX_AVATAR_BYTES) throw new RaceError("Ảnh đại diện quá lớn.", 413);
  const reader = request.body?.getReader(); if (!reader) throw new RaceError("Chưa chọn ảnh đại diện.");
  const chunks: Uint8Array[] = []; let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.length;
      if (size > MAX_AVATAR_BYTES) { await reader.cancel(); throw new RaceError("Ảnh đại diện quá lớn.", 413); }
      chunks.push(value);
    }
  } finally { reader.releaseLock(); }
  const bytes = new Uint8Array(size); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  validateAvatar(bytes); return bytes;
}
