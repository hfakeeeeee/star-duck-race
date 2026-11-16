import { test } from "node:test";
import assert from "node:assert/strict";
import { MAX_AVATAR_BYTES, readAvatarBody, validateAvatar } from "../lib/avatar.ts";
import { publicRoom, type Room } from "../lib/race.ts";

test("avatar uploads reject executable formats, missing bodies and oversized chunked requests", async () => {
  assert.throws(() => validateAvatar(new TextEncoder().encode('<svg onload="alert(1)"></svg>')), /không hợp lệ/);
  await assert.rejects(readAvatarBody(new Request("https://star.test", { method: "POST" })), /Chưa chọn/);
  let cancelled = false;
  const body = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array(MAX_AVATAR_BYTES)); controller.enqueue(new Uint8Array(1)); }, cancel() { cancelled = true; } });
  const request = new Request("https://star.test", { method: "POST", body, duplex: "half" } as RequestInit);
  await assert.rejects(readAvatarBody(request), /quá lớn/); assert.equal(cancelled, true);
});

test("room polling exposes only an avatar URL and keeps old players compatible", () => {
  const room: Room = { pin: "123456", title: "STAR", owner: "admin", duration: 60, createdAt: 0, locked: false, closed: false, race: null, players: [
    { id: "a", name: "Mai", tokenHash: "secret", joinedAt: 0, avatar: "/api/rooms/123456/avatar/a/image", avatarUpdatedAt: 123 },
    { id: "b", name: "Huy", tokenHash: "another-secret", joinedAt: 0 },
  ] };
  const visible = publicRoom(room);
  assert.equal(visible.players[0].avatar, room.players[0].avatar);
  assert.equal(visible.players[1].avatar, undefined);
  assert.equal("tokenHash" in visible.players[0], false);
  assert.equal("avatarUpdatedAt" in visible.players[0], false);
  assert.equal(visible.players[0].skin, "sunny");
});
