import { test } from "node:test";
import assert from "node:assert/strict";
import { addPlayer, cleanName, duckProgress, durationValue, publicRoom, shuffle, startRace, stateOf, type Room } from "../lib/race.ts";
const room = (): Room => ({ pin: "123456", owner: "admin", title: "STAR", duration: 60, locked: false, closed: false, players: [], race: null, createdAt: 0 });
const player = (i: number) => ({ id: String(i), name: `Người ${i}`, tokenHash: `token-${i}`, joinedAt: i });
test("capacity is exactly 200; repeat joins are idempotent at capacity", () => {
  const r = room(); for (let i = 0; i < 200; i++) addPlayer(r, player(i));
  assert.equal(r.players.length, 200); assert.throws(() => addPlayer(r, player(200)), /200/);
  assert.equal(addPlayer(r, player(5)).id, "5"); assert.equal(r.players.length, 200);
});
test("room locking, names and duration are validated", () => {
  const r = room(); r.locked = true; assert.throws(() => addPlayer(r, player(1)), /khóa/);
  r.locked = false; addPlayer(r, player(1)); assert.throws(() => addPlayer(r, { ...player(2), name: "người 1" }), /Tên/);
  assert.equal(cleanName("  Nguyễn   Minh\u200b  "), "Nguyễn Minh");
  for (const n of [0, 9, 1801, 1.5, NaN, "60"]) assert.throws(() => durationValue(n));
  assert.equal(durationValue(10), 10); assert.equal(durationValue(1800), 1800);
});
test("server decides complete ranking and deadline; public data hides secrets", () => {
  const r = room(); assert.throws(() => startRace(r), /2 người/);
  for (let i = 0; i < 200; i++) addPlayer(r, player(i)); startRace(r, 1000);
  assert.equal(stateOf(r, 2000), "countdown"); assert.equal(stateOf(r, 5000), "racing"); assert.equal(stateOf(r, 65000), "finished");
  assert.equal(new Set(r.race!.order).size, 200); assert.equal(r.locked, true);
  assert.equal(publicRoom(r, 5000).race!.order.length, 0); assert.equal(publicRoom(r, 65000).race!.order.length, 200);
  assert.ok(!JSON.stringify(publicRoom(r, 65000)).includes("tokenHash")); assert.ok(!JSON.stringify(publicRoom(r)).includes('"owner"'));
  assert.throws(() => startRace(r), /trạng thái chờ/); assert.throws(() => addPlayer(r, player(201)), /khóa/);
});
test("only the winning duck reaches the line at the deadline on every device", () => {
  for (let seed = 0; seed < 50; seed++) {
    for (const elapsed of [0, 5, 30, 57, 58, 59, 59.99]) assert.ok(duckProgress(elapsed, 60, seed, 0, 200) < 1);
    assert.equal(duckProgress(60, 60, seed, 0, 200), 1);
    for (let rank = 1; rank < 200; rank++) assert.ok(duckProgress(60, 60, seed, rank, 200) < 1);
  }
});
test("random ranking never loses or duplicates a participant", () => {
  const a = Array.from({ length: 200 }, (_, i) => i); const b = shuffle(a);
  assert.deepEqual([...b].sort((a, b) => a - b), a); assert.deepEqual(a, Array.from({ length: 200 }, (_, i) => i));
});
