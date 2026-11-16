import { createRequire } from "node:module";
import { resolve } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const { chromium } = createRequire(resolve(process.argv[2] || ".", "package.json"))("playwright");
const origin = "http://127.0.0.1:5173", out = resolve("outputs/qa-motion"); await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.addInitScript(() => { const Base = window.AudioContext; window.__raceAudio = []; window.AudioContext = class extends Base { constructor(...args) { super(...args); window.__raceAudio.push(this); } }; });
const page = await context.newPage(), errors = []; page.on("pageerror", e => errors.push(e.message));
const post = async (path, data = {}) => { const r = await context.request.post(`${origin}/api/${path}`, { data, headers: { Origin: origin } }); assert.ok(r.ok(), await r.text()); return r.json(); };
try {
  await page.goto(`${origin}/signin-with-chatgpt?return_to=/%3Fview%3Dadmin`); await page.getByLabel("Tên phòng").waitFor();
  const r = await post("rooms", { title: "STAR · Đêm ánh sao", duration: 20, scene: "night" });
  await post(`rooms/${r.pin}/import`, { names: ["Huy", "Trang", "Tour Huế · Cố đô 2 ngàn năm", ...Array.from({ length: 45 }, (_, i) => `Ngôi sao ${i + 1}`)] });
  await page.goto(`${origin}/?room=${r.pin}&host=1`); await page.locator(".big-pin").waitFor();
  await page.getByRole("button", { name: "Vào đường đua", exact: true }).click(); await page.getByRole("button", { name: "Bắt đầu cuộc đua", exact: true }).click();
  await page.locator('.race-scene[data-renderer="webgl"]').waitFor({ timeout: 30000 });
  await page.getByRole("button", { name: "Tắt âm thanh", exact: true }).waitFor();
  await page.waitForFunction(() => window.__raceAudio?.some(c => c.state === "running"));
  await page.screenshot({ path: `${out}/night-start-desktop.png`, fullPage: true });
  await page.locator(".start-overlay").waitFor({ state: "hidden" });
  assert.equal(await page.getByRole("button", { name: "Bảng hạng", exact: true }).getAttribute("aria-expanded"), "false");
  await page.getByRole("button", { name: "Bảng hạng", exact: true }).click();
  const measurements = await page.evaluate(() => new Promise(resolve => {
    const start = performance.now(), previous = new Map(); let frames = 0, rankChanges = 0, inBetween = 0, worstFrame = 0, last = start;
    function sample(now) {
      worstFrame = Math.max(worstFrame, now - last); last = now; frames++;
      for (const li of document.querySelectorAll('.animated-standings li')) {
        const key = li.dataset.playerId, rank = li.dataset.rank, transform = new DOMMatrixReadOnly(getComputedStyle(li).transform), target = Number(li.style.getPropertyValue('--row')) * 54;
        const old = previous.get(key); if (old && old.rank !== rank) rankChanges++;
        if (Math.abs(transform.m42 - target) > .5 && Math.abs(transform.m42 - target) < 150 && Number(getComputedStyle(li).opacity) > .3) inBetween++;
        previous.set(key, { rank, y: transform.m42 });
      }
      if (now - start < 6000) requestAnimationFrame(sample); else resolve({ frames, rankChanges, inBetween, worstFrame, seconds: (now - start) / 1000 });
    }
    requestAnimationFrame(sample);
  }));
  assert.ok(measurements.rankChanges > 0, "Need real rank changes"); assert.ok(measurements.inBetween > 0, "Cards should pass intermediate animated positions");
  console.log("PASS Default audio runs without toggling it on; live cards animate through intermediate positions", measurements);
  await page.screenshot({ path: `${out}/night-race-desktop.png`, fullPage: true });
  await page.getByRole("button", { name: "Tạm dừng", exact: true }).click(); await page.locator(".pause-overlay").waitFor();
  await page.setViewportSize({ width: 375, height: 812 }); await page.waitForTimeout(500); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  await page.screenshot({ path: `${out}/night-race-mobile.png`, fullPage: true });
  await page.getByRole("button", { name: "Tiếp tục đua", exact: true }).click(); await page.locator(".pause-overlay").waitFor({ state: "hidden" });
  await page.getByRole("button", { name: "Kết thúc ngay", exact: true }).click(); await page.getByRole("dialog").getByRole("button", { name: "Kết thúc cuộc đua", exact: true }).click(); await page.locator(".results-heading h2").waitFor();
  const small = await post("rooms", { title: "STAR · Kiểm tra vạch xuất phát", duration: 10 }); await post(`rooms/${small.pin}/import`, { names: ["Huy", "Trang", "Tour Huế · Cố đô 2 ngàn năm"] });
  await page.setViewportSize({ width: 1280, height: 900 }); await page.goto(`${origin}/?room=${small.pin}&host=1`); await page.locator(".big-pin").waitFor(); await page.getByRole("button", { name: "Vào đường đua", exact: true }).click(); await page.getByRole("button", { name: "Bắt đầu cuộc đua", exact: true }).click(); await page.locator('.race-scene[data-renderer="webgl"]').waitFor();
  await page.screenshot({ path: `${out}/start-line-3-ducks.png`, fullPage: true });
  await post(`rooms/${small.pin}/close`); await post(`rooms/${r.pin}/close`); assert.deepEqual(errors, []);
  await writeFile(`${out}/report.json`, JSON.stringify({ passed: true, measurements, errors }, null, 2)); console.log("PASS Night map, responsive standings, pause/resume and centered start line screenshots");
} catch (e) { await page.screenshot({ path: `${out}/failure.png`, fullPage: true }); console.log(errors); throw e; }
finally { await browser.close(); }
