import { test } from "node:test";
import assert from "node:assert/strict";
import { OrthographicCamera, PerspectiveCamera, Vector3 } from "three";
import { configureOverview, followCameraPose, raceWorldX, TRACK_LENGTH } from "../lib/race-view.ts";

test("the whole duck waits behind every start stripe and its nose still crosses the finish on time", () => {
  const backEdge = -.6 * 4 - .3 / 2;
  for (const size of [.76, 1.05]) {
    const bodyX = raceWorldX(0) - 1.13 * size;
    assert.ok(bodyX + 1.13 * size < backEdge - .5);
    assert.equal(raceWorldX(1) - 1.13 * size + 1.13 * size, TRACK_LENGTH);
  }
  assert.ok(raceWorldX(.01) > raceWorldX(0));
});

test("overview projects the entire course as a rectangle on desktop and portrait screens", () => {
  for (const [w, h] of [[1455, 688], [1088, 668], [355, 510], [900, 400]]) {
    const camera = new OrthographicCamera(); configureOverview(camera, w / h, h);
    const corners = [[-6, -13], [166, -13], [166, 13], [-6, 13]].map(([x, z]) => new Vector3(x, 0, z).project(camera));
    for (let i = 0; i < 4; i++) {
      const p = corners[i], prev = corners[(i + 3) % 4], next = corners[(i + 1) % 4];
      assert.ok(Math.abs(p.x) < .97 && Math.abs(p.y) < .97, "Whole course must fit");
      const dot = (prev.x - p.x) * (next.x - p.x) * w * w + (prev.y - p.y) * (next.y - p.y) * h * h;
      assert.ok(Math.abs(dot) < 1e-7, "All projected course corners must be 90 degrees");
      if (w < h) assert.ok((1 - p.y) * h / 2 > 120 && (1 - p.y) * h / 2 < h - 110, "Portrait course must clear the HUD panels");
    }
  }
});

test("follow views keep both banks horizontal and retain a fixed world up", () => {
  for (const mobile of [false, true]) for (const x of [-3.25, 50, 160]) for (const z of [-8, 0, 8]) {
    const camera = new PerspectiveCamera(44, 1.7, .1, 700), pose = followCameraPose(x, z, mobile);
    camera.position.set(...pose.position); camera.lookAt(...pose.target); camera.updateMatrixWorld();
    for (const bank of [-13, 13]) {
      const left = new Vector3(x - 10, 0, bank).project(camera), right = new Vector3(x + 10, 0, bank).project(camera);
      assert.ok(Math.abs(left.y - right.y) < 1e-10, "Bank must not slope across the image");
    }
    assert.deepEqual(camera.up.toArray(), [0, 1, 0]);
  }
});

test("extending the river under glass preserves positions in the playable viewport", () => {
  for (const [w, h, extraW, extraH] of [[1088, 668, 270, 0], [375, 410, 0, 128]]) {
    const follow = new PerspectiveCamera(44, w / h, .1, 700), pose = followCameraPose(50, 0, w < 600);
    follow.position.set(...pose.position); follow.lookAt(...pose.target); follow.updateMatrixWorld();
    const overview = new OrthographicCamera(); configureOverview(overview, w / h, h);
    for (const camera of [follow, overview]) {
      const points = [new Vector3(50, 0, -8), new Vector3(55, 1, 8)];
      const before = points.map(p => p.clone().project(camera)).map(p => [(p.x + 1) * w / 2, (1 - p.y) * h / 2]);
      camera.setViewOffset(w, h, 0, 0, w + extraW, h + extraH);
      points.forEach((p, i) => {
        const projected = p.clone().project(camera);
        assert.ok(Math.abs((projected.x + 1) * (w + extraW) / 2 - before[i][0]) < 1e-7);
        assert.ok(Math.abs((1 - projected.y) * (h + extraH) / 2 - before[i][1]) < 1e-7);
      });
    }
  }
});
