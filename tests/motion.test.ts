import { test } from "node:test";
import assert from "node:assert/strict";
import { MotionClock, dampFactor } from "../lib/motion.ts";
test("polling jitter is corrected smoothly without backwards frames or time jumps", () => {
  for (const fps of [30, 60, 144]) {
    const clock = new MotionClock(); clock.sample(0, 1, 0, "live"); let previous = 0;
    for (let i = 1; i < fps * 12; i++) {
      const now = i * 1000 / fps;
      const noise = Math.floor(now / 700) % 2 ? .035 : -.035;
      const value = clock.sample(now / 1000 + noise, 1, now, "live");
      assert.ok(value > previous, `${fps} FPS frame reversed`);
      assert.ok(value - previous < 1.16 / fps, `${fps} FPS frame jumped`);
      assert.ok(Math.abs(value - now / 1000) < .04);
      previous = value;
    }
  }
});
test("pause holds exactly and explicit replay seeks stay immediate", () => {
  const clock = new MotionClock(); clock.sample(5, 1, 0, "live");
  assert.equal(clock.read(500), 5.5); clock.sample(5.45, 0, 500, "live"); assert.equal(clock.read(20000), 5.45);
  clock.sample(5.45, 1, 20000, "live"); assert.equal(clock.read(20500), 5.95);
  clock.sample(10, .25, 20500, "replay:1"); assert.equal(clock.read(22500), 10.5);
  clock.sample(2, 0, 22500, "replay:2"); assert.equal(clock.read(25000), 2);
});
test("camera damping has the same response at 30, 60 and 144 FPS", () => {
  const values = [30, 60, 144].map(fps => { let position = 0; for (let i = 0; i < fps; i++) position += (100 - position) * dampFactor(1 / fps, 6); return position; });
  assert.ok(Math.max(...values) - Math.min(...values) < 1e-10);
});
