import { createRequire } from "node:module";
import { resolve } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const { chromium } = createRequire(resolve(process.argv[2] || ".", "package.json"))("playwright");
const origin = "http://127.0.0.1:5173", out = resolve("outputs/qa-framing"); await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 1455, height: 1000 } }), page = await context.newPage();
const errors = [], layouts = [];
page.on("pageerror", e => errors.push(e.message)); page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
const post = async (path, data = {}) => { const r = await context.request.post(`${origin}/api/${path}`, { data, headers: { Origin: origin } }); assert.ok(r.ok(), await r.text()); return r.json(); };
async function checkLayout(label) {
  const layout = await page.evaluate(() => {
    const box = s => { const r = document.querySelector(s).getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, right: r.right, bottom: r.bottom }; };
    return { scene: box(".scene-wrap"), timer: box(".hud-timer"), leader: box(".hud-leader"), map: box(".race-minimap"), overflow: document.documentElement.scrollWidth > innerWidth };
  });
  assert.equal(layout.overflow, false); assert.ok(layout.timer.right + 8 <= layout.leader.x, "Top cards need a gap");
  assert.ok(Math.abs(layout.map.x + layout.map.w / 2 - layout.scene.x - layout.scene.w / 2) < 1, "Minimap must be centered");
  for (const b of [layout.timer, layout.leader, layout.map]) { assert.ok(b.x >= layout.scene.x && b.right <= layout.scene.right + 1); assert.ok(b.y >= layout.scene.y && b.bottom <= layout.scene.bottom); }
  assert.ok(layout.map.y > Math.max(layout.timer.bottom, layout.leader.bottom) + 100, "Keep the middle of the race unobstructed");
  layouts.push({ label, ...layout });
}
async function shot(name, camera) {
  await page.getByRole("button", { name: camera, exact: true }).click(); await page.waitForTimeout(250);
  await page.locator(".scene-wrap").screenshot({ path: `${out}/${name}.png` });
}
try {
  await page.goto(`${origin}/signin-with-chatgpt?return_to=/%3Fview%3Dadmin`); await page.getByLabel("Tên phòng").waitFor();
  const room = await post("rooms", { title: "STAR · Góc máy và bố cục mới", duration: 30, distance: 600 });
  await post(`rooms/${room.pin}/import`, { names: ["Trang", "Huy", "Tour Huế · Cố đô 2 ngày 1 đêm"] });
  await page.goto(`${origin}/?room=${room.pin}&host=1`); await page.locator(".big-pin").waitFor(); await page.getByRole("button", { name: "Vào đường đua", exact: true }).click(); await page.getByRole("button", { name: "Bắt đầu cuộc đua", exact: true }).click();
  await page.locator('.race-scene[data-renderer="webgl"]').waitFor();
  const veil = await page.addStyleTag({ content: ".start-overlay,.pause-overlay { visibility:hidden!important }" });
  await shot("start-follow", "Theo dẫn đầu"); await shot("start-overview", "Toàn cảnh"); await checkLayout("desktop-grid");
  await page.waitForFunction(() => !document.querySelector(".start-overlay"));
  await page.waitForTimeout(2200); await shot("race-follow", "Theo dẫn đầu"); await shot("race-overview", "Toàn cảnh");
  await page.getByRole("button", { name: "Tạm dừng", exact: true }).click(); await page.locator(".hud-state").filter({ hasText: "Tạm dừng" }).waitFor();
  const frozen = await page.locator(".hud-timer strong").textContent(); await page.waitForTimeout(350); assert.equal(await page.locator(".hud-timer strong").textContent(), frozen);
  for (const viewport of [{ width: 375, height: 812 }, { width: 844, height: 390 }, { width: 1455, height: 1000 }]) {
    await page.setViewportSize(viewport); await page.waitForTimeout(300); await checkLayout(`${viewport.width}x${viewport.height}`);
    await shot(`paused-${viewport.width}-follow`, "Theo dẫn đầu"); await shot(`paused-${viewport.width}-overview`, "Toàn cảnh");
  }
  await veil.evaluate(e => e.remove()); await post(`rooms/${room.pin}/finish`); await page.locator(".results-heading h2").waitFor();
  await page.getByRole("button", { name: "Xem lại về đích", exact: true }).click(); await page.getByLabel("Vị trí xem lại", { exact: true }).fill("0");
  await page.locator(".hud-state").filter({ hasText: "Xem lại" }).waitFor(); assert.equal(await page.locator(".hud-timer strong").textContent(), "00:00");
  await shot("replay-zero-follow", "Theo dẫn đầu"); await shot("replay-zero-overview", "Toàn cảnh"); await checkLayout("replay-desktop");
  await page.getByLabel("Vị trí xem lại", { exact: true }).fill("30"); await shot("replay-finish-overview", "Toàn cảnh");
  await page.getByRole("button", { name: "Đóng xem lại", exact: true }).click(); await post(`rooms/${room.pin}/reset`); await post(`rooms/${room.pin}/settings`, { scene: "night" });
  await page.locator(".big-pin").waitFor(); await page.getByRole("button", { name: "Vào đường đua", exact: true }).click(); await page.getByRole("button", { name: "Bắt đầu cuộc đua", exact: true }).click(); await page.locator('.race-scene[data-renderer="webgl"]').waitFor();
  const nightVeil = await page.addStyleTag({ content: ".start-overlay { visibility:hidden!important }" });
  await shot("night-follow", "Theo dẫn đầu"); await shot("night-overview", "Toàn cảnh"); await checkLayout("night-desktop"); await nightVeil.evaluate(e => e.remove());
  await post(`rooms/${room.pin}/close`);
  const full = await post("rooms", { title: "STAR · HUD với 200 vịt", duration: 10 });
  await post(`rooms/${full.pin}/import`, { names: Array.from({ length: 200 }, (_, i) => `Người chơi STAR ${i + 1}`) });
  await page.goto(`${origin}/?room=${full.pin}&host=1`); await page.locator(".big-pin").waitFor(); await page.getByRole("button", { name: "Vào đường đua", exact: true }).click(); await page.getByRole("button", { name: "Bắt đầu cuộc đua", exact: true }).click();
  await page.locator('.race-scene[data-renderer="webgl"]').waitFor(); assert.equal(await page.locator(".minimap-duck").count(), 200);
  await page.getByRole("button", { name: "Toàn màn hình", exact: true }).click(); await page.getByRole("button", { name: "Thoát toàn màn hình", exact: true }).waitFor();
  await page.waitForTimeout(400); await checkLayout("fullscreen-200"); await shot("fullscreen-200-overview", "Toàn cảnh");
  await page.getByRole("button", { name: "Thoát toàn màn hình", exact: true }).click(); await post(`rooms/${full.pin}/finish`); await page.locator(".results-heading h2").waitFor();
  assert.equal(await page.locator(".minimap-finish > strong").textContent(), "200/200");
  await page.setViewportSize({ width: 375, height: 812 }); await page.waitForTimeout(300); await checkLayout("mobile-finished-200");
  await page.locator(".scene-wrap").screenshot({ path: `${out}/mobile-finished-200.png` });
  await post(`rooms/${full.pin}/close`); assert.deepEqual(errors, []);
  await writeFile(`${out}/report.json`, JSON.stringify({ passed: true, layouts, errors }, null, 2)); console.log("PASS Grid, orthographic overview, level follow view, balanced HUD, portrait/landscape, pause/replay and night scene");
} catch (e) { await page.screenshot({ path: `${out}/failure.png`, fullPage: true }); console.log(errors); throw e; }
finally { await browser.close(); }
