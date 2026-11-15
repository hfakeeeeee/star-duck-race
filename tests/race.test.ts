import { test } from "node:test";
import assert from "node:assert/strict";
import { addPlayer, buildRace, cleanName, currentDistance, durationValue, endRace, finishTime, pauseRace, publicRoom, raceElapsed, raceProgress, resumeRace, setTestDucks, startRace, stateOf, standings, SKINS, type Room } from "../lib/race.ts";
import { parseDelimited, validateNames } from "../lib/import-names.ts";
const room = (): Room => ({ pin: "123456", owner: "admin", title: "STAR", duration: 60, locked: false, closed: false, players: [], race: null, createdAt: 0 });
const player = (i: number) => ({ id: String(i), name: `Người ${i}`, tokenHash: `token-${i}`, joinedAt: i, skin: SKINS[i % SKINS.length].id });
test("200 slots, repeated joins, locks, duplicates and input bounds", () => {
  const r = room(); for (let i = 0; i < 200; i++) addPlayer(r, player(i));
  assert.equal(r.players.length, 200); assert.throws(() => addPlayer(r, player(200)), /200/); assert.equal(addPlayer(r, player(5)).id, "5");
  const other = room(); other.locked = true; assert.throws(() => addPlayer(other, player(1)), /khóa/); other.locked = false; addPlayer(other, player(1));
  assert.throws(() => addPlayer(other, { ...player(2), name: "người 1" }), /Tên/);
  assert.equal(cleanName("  Nguyễn   Minh\u200b  "), "Nguyễn Minh");
  for (const n of [0, 9, 1801, 1.5, NaN, "60"]) assert.throws(() => durationValue(n));
  assert.equal(durationValue(10), 10); assert.equal(durationValue(1800), 1800);
});
test("all 200 ducks move forward and individually cross at their recorded finish time", () => {
  const players = Array.from({ length: 200 }, (_, i) => player(i)); const race = buildRace(players, 10, 1000);
  assert.equal(new Set(race.order).size, 200); assert.equal(new Set(Object.values(race.seeds)).size, 200);
  const times = race.order.map(id => finishTime(race, id)); assert.equal(times[0], 10); assert.ok(times.at(-1)! <= 18.000001);
  for (const p of players) {
    const end = finishTime(race, p.id); let previous = raceProgress(race, p.id, 0);
    for (let t = .025; t < end; t += .025) { const progress = raceProgress(race, p.id, t); assert.ok(progress >= previous - 1e-10, `Duck ${p.id} moved backwards`); assert.ok(progress < 1); previous = progress; }
    assert.ok(raceProgress(race, p.id, end - .000001) < 1); assert.ok(raceProgress(race, p.id, end) >= 1);
  }
  assert.deepEqual([...times].sort((a, b) => a - b), times);
});
test("same simulation gives the same live standings and exact results on every device", () => {
  const r = room(); for (let i = 0; i < 24; i++) addPlayer(r, player(i)); startRace(r, 1000);
  const a = publicRoom(r, 16000), b = JSON.parse(JSON.stringify(a));
  for (const elapsed of [0, 1.5, 17.7, 59.9, 60, 67]) assert.deepEqual(standings(a, elapsed), standings(b, elapsed));
  const final = standings(a, 70).map(p => p.id); assert.deepEqual(final, r.race!.order);
  assert.equal(a.race!.order.length, 0); assert.equal(Object.keys(a.race!.finishes).length, 0);
  const done = publicRoom(r, 80000); assert.equal(done.race!.order.length, 24); assert.equal(Object.keys(done.race!.finishes).length, 24);
  assert.ok(!JSON.stringify(done).includes("tokenHash")); assert.ok(!JSON.stringify(done).includes('"owner"'));
  // Labels and appearance cannot alter the trajectory or ordering.
  a.players.reverse(); a.players.forEach(p => { p.name = "Đổi tên"; p.skin = "ninja"; });
  assert.deepEqual(standings(a, 70).map(p => p.id), final);
});

test("every duck starts on the same line and sustains cruising speed through smooth passes", () => {
  const race = buildRace(Array.from({ length: 200 }, (_, i) => player(i)), 60);
  for (const id of race.order) {
    for (const t of [-4, -2, -.01, 0]) assert.equal(raceProgress(race, id, t), 0);
    const speed = (t: number) => (raceProgress(race, id, t + 1 / 120) - raceProgress(race, id, t)) * 120 * 60 * race.normalizer;
    assert.ok(speed(0) < .025, "Launch should accelerate from rest");
    let previous = speed(2);
    for (let t = 2; t < 59.9; t += 1 / 60) {
      const v = speed(t);
      assert.ok(v > .66 && v < 1.35, `Cruising speed out of bounds: ${v}`);
      assert.ok(Math.abs(v - previous) < .004, "No abrupt acceleration between frames"); previous = v;
    }
  }
});

test("stored races without a model keep their previous winners and finish times", () => {
  const race = buildRace(Array.from({ length: 24 }, (_, i) => player(i)), 20); delete race.model;
  const totals = Object.entries(race.seeds).map(([id, seed]) => ({ id, total: currentDistance(1, seed, 2) })).sort((a, b) => b.total - a.total);
  race.normalizer = totals[0].total; race.slowest = totals.at(-1)!.total / race.normalizer;
  assert.equal(finishTime(race, totals[0].id), 20);
  for (const { id, total } of totals) {
    const expected = 20 + race.tail * (1 - total / race.normalizer) / (1 - race.slowest);
    assert.equal(finishTime(race, id), expected);
    assert.ok(Math.abs(raceProgress(race, id, 10) - currentDistance(.5, race.seeds[id], 2) / race.normalizer) < 1e-12);
  }
});
test("countdown, paused clocks and finish phase survive serialized reconnects", () => {
  const r = room(); addPlayer(r, player(1)); assert.throws(() => startRace(r), /2 người/); addPlayer(r, player(2)); startRace(r, 1000);
  assert.equal(stateOf(r, 2000), "countdown"); assert.equal(stateOf(r, 5000), "racing");
  pauseRace(r, 20000); const paused = raceElapsed(r.race!, 90000); assert.equal(paused, 15); assert.equal(stateOf(r, 90000), "paused");
  const restored = JSON.parse(JSON.stringify(r)) as Room; assert.equal(raceElapsed(restored.race!, 90000), 15);
  resumeRace(restored, 30000); assert.equal(raceElapsed(restored.race!, 35000), 20);
  assert.equal(stateOf(restored, 75000), "settling"); assert.equal(stateOf(restored, 85000), "finished");
  assert.throws(() => resumeRace(restored), /chưa tạm dừng/);
});
test("ending early preserves the simulation result and allows a consistent final replay", () => {
  const r = room(); for (let i = 0; i < 12; i++) addPlayer(r, player(i)); startRace(r, 1000);
  const order = [...r.race!.order]; endRace(r); assert.equal(stateOf(r, 5500), "finished");
  assert.deepEqual(publicRoom(r, 5500).race!.order, order); assert.throws(() => endRace(r), /kết thúc/);
  assert.deepEqual(standings(publicRoom(r), raceElapsed(r.race!)).map(p => p.id), order);
});
test("lead changes are present without reversing ducks or forcing a last-second ranking", () => {
  const r = room(); for (let i = 0; i < 200; i++) addPlayer(r, player(i)); startRace(r);
  const leaders = new Set<string>(); for (let t = .5; t < 60; t += .5) leaders.add(standings(publicRoom(r), t)[0].id);
  assert.ok(leaders.size > 1, "The race needs observable lead changes");
});
test("CSV import keeps quoted names, chosen columns, Unicode and detects invalid batches", () => {
  assert.deepEqual(parseDelimited('\uFEFFLớp,Họ tên\r\n10A,"Nguyễn, Minh Anh"\r\n10B,"Tên ""đặc biệt"""'), [["Lớp", "Họ tên"], ["10A", "Nguyễn, Minh Anh"], ["10B", 'Tên "đặc biệt"']]);
  assert.deepEqual(parseDelimited("Tên;Lớp\nAn;10A"), [["Tên", "Lớp"], ["An", "10A"]]);
  assert.deepEqual(parseDelimited("An\t10A\nBình\t10B"), [["An", "10A"], ["Bình", "10B"]]);
  assert.throws(() => parseDelimited('"unclosed'), /ngoặc kép/);
  assert.throws(() => validateNames(["An", "an"]), /trùng/); assert.throws(() => validateNames(Array.from({ length: 201 }, (_, i) => `Tên ${i}`)), /200/);
  assert.deepEqual(validateNames([" Nguyễn   An ", "Bình"]), ["Nguyễn An", "Bình"]);
});

test("test duck settings preserve real participants, stable bot identities and the 200 slot limit", () => {
  const r = room(); addPlayer(r, player(1)); addPlayer(r, { ...player(2), name: "Vịt thử 001" });
  setTestDucks(r, 50); assert.equal(r.players.length, 52); assert.equal(r.players.filter(p => p.isTest).length, 50);
  assert.equal(new Set(r.players.map(p => p.name)).size, 52);
  const ids = r.players.map(p => p.id); setTestDucks(r, 50); assert.deepEqual(r.players.map(p => p.id), ids);
  setTestDucks(r, 198); assert.equal(r.players.length, 200);
  const full = JSON.stringify(r); assert.throws(() => setTestDucks(r, 199), /198/); assert.equal(JSON.stringify(r), full);
  for (const count of [-1, 201, 2.5, "20", NaN]) assert.throws(() => setTestDucks(r, count));
  setTestDucks(r, 0); assert.deepEqual(r.players.map(p => p.id), ["1", "2"]);
  r.locked = true; setTestDucks(r, 2); assert.equal(r.players.length, 4);
  startRace(r); assert.throws(() => setTestDucks(r, 0), /phòng chờ/);
  const exposed = publicRoom(r); assert.equal(exposed.players.filter(p => p.isTest).length, 2); assert.ok(!JSON.stringify(exposed).includes("test:"));
});
