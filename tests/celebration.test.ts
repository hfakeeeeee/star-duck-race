import { test } from "node:test";
import assert from "node:assert/strict";
import { winnerLift } from "../lib/celebration.ts";
import { raceWorldX, TRACK_LENGTH } from "../lib/race-view.ts";

test("winner jumps only after crossing, rises and lands smoothly without changing finish position", () => {
  assert.deepEqual(winnerLift(-.001), { height: 0, scale: 1, tilt: 0 });
  assert.deepEqual(winnerLift(0), { height: 0, scale: 1, tilt: 0 });
  assert.equal(raceWorldX(1), TRACK_LENGTH);
  assert.ok(winnerLift(.2).height > 0); assert.ok(winnerLift(.65).height > 3.5);
  assert.ok(winnerLift(1.1).height < winnerLift(.65).height);
  assert.deepEqual(winnerLift(1.31), { height: 0, scale: 1, tilt: 0 });
  for (let t=0;t<1.3;t+=.01) { assert.ok(winnerLift(t).height >= 0); assert.ok(winnerLift(t).scale <= 1.18); }
});

test("reduced motion keeps the winner on the water without the jump or scale pulse", () => {
  for (const t of [0,.2,.65,1.1,2]) assert.deepEqual(winnerLift(t,true), { height:0,scale:1,tilt:0 });
});
