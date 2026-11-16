import { createRequire } from "node:module";
import { resolve } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const { chromium } = createRequire(resolve(process.argv[2] || ".", "package.json"))("playwright");
const origin = "http://127.0.0.1:5173", out = resolve("outputs/qa-club"); await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true }), admin = await browser.newContext({ viewport: { width: 1440, height: 900 }, colorScheme: "dark" }), guest = await browser.newContext({ viewport: { width: 375, height: 812 }, colorScheme: "light" });
const host = await admin.newPage(), player = await guest.newPage(), errors = [], measurements = [];
await admin.addInitScript(() => { window.__firstThemes = []; let frames = 0; function sample() { if (document.querySelector('main')) window.__firstThemes.push(document.documentElement.dataset.theme); if (++frames < 60) requestAnimationFrame(sample); } requestAnimationFrame(sample); });
for (const page of [host, player]) { page.on("pageerror", e => errors.push(e.message)); page.on("console", m => { if (m.type() === "error") errors.push(m.text()); }); }
const post = async (path, data = {}) => { const r = await admin.request.post(`${origin}/api/${path}`, { data, headers: { Origin: origin } }); assert.ok(r.ok(), await r.text()); return r.json(); };
async function theme(page, value) { await page.getByRole('button', { name: 'Giao diện', exact: true }).click(); assert.equal(await page.getByRole('menuitemradio').count(), 3); await page.getByRole('menuitemradio', { name: { light: 'Sáng', dark: 'Tối', system: 'Hệ thống' }[value], exact: true }).click(); await page.waitForFunction(value => localStorage.getItem('star-duck-theme') === value, value); }
async function fit(page, name, controls = []) { const state = await page.evaluate(selectors => ({ width: innerWidth, height: innerHeight, scroll: document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight || scrollY > 0, theme: document.documentElement.dataset.theme, controls: selectors.map(selector => { const e = document.querySelector(selector), r = e?.getBoundingClientRect(); return { selector, width: r?.width, height: r?.height, y: r?.y, bottom: r?.bottom, right: r?.right, x: r?.x }; }) }), controls); assert.equal(state.scroll, false, `${name}: page overflow`); for (const r of state.controls) assert.ok(r.width > 0 && r.height > 0 && r.x >= -1 && r.y >= -1 && r.right <= state.width + 1 && r.bottom <= state.height + 1, `${name}: control clipped ${JSON.stringify(r)}`); measurements.push({ name, ...state }); }
let pin;
try {
  await host.goto(origin); await host.locator('.home-harbor').waitFor(); assert.equal(await host.locator('html').getAttribute('data-theme'), 'dark'); await host.waitForTimeout(500);
  assert.ok((await host.evaluate(() => window.__firstThemes)).every(t => t === 'dark'), 'System dark has no light page frame');
  for (const mode of ['light', 'dark']) {
    await theme(host, mode);
    for (const size of [{ width: 1440, height: 900 }, { width: 1920, height: 1080 }, { width: 768, height: 800 }, { width: 375, height: 812 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) {
      await host.setViewportSize(size); await host.waitForTimeout(250); await fit(host, `home-${mode}-${size.width}`, ['.join-form button[type=submit]', '#pin', '#name', '.theme-toggle']); await host.screenshot({ path: `${out}/home-${mode}-${size.width}.png`, fullPage: true });
    }
    await host.reload(); await host.locator('.home-harbor').waitFor(); assert.equal(await host.locator('html').getAttribute('data-theme'), mode);
  }
  await host.setViewportSize({ width: 1440, height: 900 }); await theme(host, 'system'); assert.equal(await host.locator('html').getAttribute('data-theme'), 'dark'); await host.emulateMedia({ colorScheme: 'light' }); await host.waitForFunction(() => document.documentElement.dataset.theme === 'light'); await host.emulateMedia({ colorScheme: 'dark' }); await host.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
  await host.goto(`${origin}/signin-with-chatgpt?return_to=/%3Fview%3Dadmin`); await host.locator('.create-room').waitFor();
  const created = await post('rooms', { title: 'Thứ Sáu · Cùng STAR về đích', duration: 10, testCount: 28 }); pin = created.pin;
  await host.goto(`${origin}/?room=${pin}&host=1`); await host.locator('.big-pin').waitFor();
  await player.goto(`${origin}/?room=${pin}`); await player.getByLabel('Tên của bạn').fill('Nguyễn Thị Phương Thảo'); await player.getByRole('button', { name: 'Vào phòng chờ', exact: true }).click(); await player.locator('.player-wait-card').waitFor();
  for (const mode of ['light', 'dark']) {
    await theme(host, mode); await theme(player, mode);
    for (const size of [{ width: 1440, height: 900 }, { width: 375, height: 812 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) {
      await host.setViewportSize(size); await player.setViewportSize(size); await host.waitForTimeout(300); await fit(host, `lobby-admin-${mode}-${size.width}`, ['.start-btn', '.participants-card', '.room-settings-button']); await fit(player, `lobby-player-${mode}-${size.width}`, ['.own-profile-select']);
      await host.screenshot({ path: `${out}/lobby-${mode}-${size.width}.png`, fullPage: true }); await player.screenshot({ path: `${out}/waiting-player-${mode}-${size.width}.png`, fullPage: true });
    }
  }
  await host.setViewportSize({ width: 1440, height: 900 }); await host.getByRole('button', { name: 'Cài đặt phòng', exact: true }).click(); await host.getByRole('dialog').waitFor(); assert.equal(await host.getByRole('dialog').evaluate(e => getComputedStyle(e).backgroundColor), 'rgb(30, 46, 69)'); await host.screenshot({ path: `${out}/settings-dark.png` }); await host.getByRole('dialog').getByRole('button', { name: 'Đóng', exact: true }).click();
  await host.emulateMedia({ reducedMotion: 'reduce' }); const motion = await host.locator('.harbor-duck').first().evaluate(e => getComputedStyle(e).animationName); assert.equal(motion, 'none'); await host.emulateMedia({ reducedMotion: 'no-preference' });
  const stream = await post(`rooms/${pin}/prepare`); await host.locator('.race-ready-controls').waitFor(); await theme(host, 'light'); await theme(host, 'dark'); assert.equal((await (await admin.request.get(`${origin}/api/rooms/${pin}`)).json()).race.id, stream.race.id); await fit(host, 'race-dark', ['.scene-wrap', '.race-ready-controls']); await host.screenshot({ path: `${out}/race-dark.png` });
  await host.getByRole('button', { name: 'Bắt đầu cuộc đua', exact: true }).click(); await host.locator('.start-overlay').waitFor({ state: 'hidden' });
  await host.getByRole('button', { name: 'Giao diện', exact: true }).click(); await host.getByRole('menuitemradio', { name: 'Sáng', exact: true }).focus(); await host.keyboard.press('Space'); await host.waitForTimeout(250);
  assert.equal((await (await admin.request.get(`${origin}/api/rooms/${pin}`)).json()).race.pausedAt, null, 'Space in the appearance menu must not pause the race'); await theme(host, 'dark');
  await host.getByRole('dialog', { name: 'Kết quả cuộc đua' }).waitFor({ timeout: 23000 }); await host.screenshot({ path: `${out}/results-dark.png` });
  assert.deepEqual(errors, []); await writeFile(`${out}/report.json`, JSON.stringify({ passed: true, measurements, errors }, null, 2)); console.log('PASS System/light/dark preferences, no light frame, persistence, live OS changes, six screen sizes, waiting room, reduced motion, settings and race/results');
} catch (e) { await host.screenshot({ path: `${out}/failure.png`, fullPage: true }); console.log(errors); throw e; }
finally { if (pin) await post(`rooms/${pin}/close`).catch(() => {}); await browser.close(); }
