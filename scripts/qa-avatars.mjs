import { createRequire } from "node:module";
import { resolve } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const { chromium } = createRequire(resolve(process.argv[2] || ".", "package.json"))("playwright");
const origin = "http://127.0.0.1:5173", out = resolve("outputs/qa-avatars"); await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const admin = await browser.newContext({ viewport: { width: 1440, height: 900 } }), guest = await browser.newContext({ viewport: { width: 375, height: 812 } });
await guest.addInitScript(() => { window.__starTransitions = 0; new MutationObserver(records => { for (const record of records) for (const node of record.addedNodes) if (node instanceof Element && node.matches('.star-transition')) window.__starTransitions++; }).observe(document, { childList: true, subtree: true }); });
const host = await admin.newPage(), player = await guest.newPage(), errors = [];
for (const page of [host, player]) page.on("pageerror", error => errors.push(error.message));
const post = async (path, data = {}) => { const response = await admin.request.post(`${origin}/api/${path}`, { data, headers: { Origin: origin } }); assert.ok(response.ok(), await response.text()); return response.json(); };
const read = async pin => (await guest.request.get(`${origin}/api/rooms/${pin}`)).json();
const fit = async page => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth || document.documentElement.scrollHeight > innerHeight || scrollY > 0), false);
const upload = (pin, token, data, extra = {}) => guest.request.post(`${origin}/api/rooms/${pin}/avatar`, { data, headers: { Origin: origin, 'X-Player-Token': token, 'Content-Type': 'image/jpeg', ...extra } });
let pin;
try {
  await host.goto(`${origin}/signin-with-chatgpt?return_to=/%3Fview%3Dadmin`); await host.getByLabel("Tên phòng").waitFor();
  const room = await post("rooms", { title: "STAR · Ngôi sao của đường đua", duration: 10, testCount: 2 }); pin = room.pin;
  await player.goto(`${origin}/?room=${pin}`); await player.getByLabel("Tên của bạn").fill("Mai Hương");
  const images = await player.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 300; canvas.height = 200; const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#f3d386'; ctx.fillRect(0, 0, 300, 200); ctx.fillStyle = '#172b63'; ctx.beginPath(); ctx.arc(150, 72, 40, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(150, 205, 85, 75, 0, 0, Math.PI * 2); ctx.fill();
    return { png: canvas.toDataURL('image/png').split(',')[1], jpeg: canvas.toDataURL('image/jpeg').split(',')[1] };
  });
  const file = player.getByLabel('Tải ảnh đại diện');
  await file.setInputFiles({ name: 'not-an-avatar.svg', mimeType: 'image/svg+xml', buffer: Buffer.from('<svg/>') }); await player.getByRole('alert').filter({ hasText: 'Chọn ảnh JPG' }).waitFor();
  await file.setInputFiles({ name: 'large.png', mimeType: 'image/png', buffer: Buffer.alloc(5 * 1024 * 1024 + 1) }); await player.getByRole('alert').filter({ hasText: '5 MB' }).waitFor();
  await file.setInputFiles({ name: 'portrait.png', mimeType: 'image/png', buffer: Buffer.from(images.png, 'base64') });
  await player.locator('.avatar-preview img').waitFor();
  for (const viewport of [{ width: 375, height: 812 }, { width: 320, height: 568 }, { width: 844, height: 390 }]) { await player.setViewportSize(viewport); await fit(player); await player.screenshot({ path: `${out}/join-avatar-${viewport.width}.png`, fullPage: true }); }
  await player.setViewportSize({ width: 375, height: 812 });
  await player.getByRole('button', { name: 'Vào phòng chờ', exact: true }).click();
  await player.locator('.own-profile-select').waitFor(); await player.locator('.star-transition').waitFor({ state: 'hidden' });
  const membership = await player.evaluate(pin => JSON.parse(localStorage.getItem(`star-duck-${pin}`)), pin);
  let current = await read(pin), me = current.players.find(p => p.id === membership.playerId), firstURL = me.avatar;
  assert.ok(firstURL.startsWith(`/api/rooms/${pin}/avatar/`)); assert.equal(JSON.stringify(current).includes('data:image'), false);
  const stored = await guest.request.get(origin + firstURL); assert.equal(stored.status(), 200); assert.match(stored.headers()['content-type'], /image\/jpeg/); assert.ok((await stored.body()).length < 32768);
  await player.reload(); await player.locator('.own-profile-select img').waitFor(); await player.waitForFunction(() => document.querySelector('.own-profile-select img').naturalWidth === 128);
  for (const viewport of [{ width: 320, height: 568 }, { width: 844, height: 390 }]) { await player.setViewportSize(viewport); await fit(player); const edit = await player.getByRole('button', { name: 'Đổi ảnh đại diện', exact: true }).boundingBox(); assert.ok(edit.y >= 0 && edit.y + edit.height <= viewport.height); await player.screenshot({ path: `${out}/lobby-avatar-${viewport.width}.png`, fullPage: true }); }
  await player.setViewportSize({ width: 375, height: 812 });
  await player.waitForTimeout(1600);
  assert.equal((await upload(pin, crypto.randomUUID(), Buffer.from(images.jpeg, 'base64'))).status(), 403, 'Another device cannot replace the avatar');
  assert.equal((await upload(pin, membership.token, Buffer.from('<svg/>'), { 'Content-Type': 'image/svg+xml' })).status(), 415);
  assert.equal((await upload(pin, membership.token, Buffer.alloc(32769))).status(), 413);
  await player.getByRole('button', { name: 'Xóa ảnh đại diện', exact: true }).click(); await player.getByRole('button', { name: 'Chọn ảnh đại diện', exact: true }).waitFor();
  assert.equal((await guest.request.get(origin + firstURL)).status(), 404);
  await player.waitForTimeout(1600); await player.getByLabel('Tải ảnh đại diện').setInputFiles({ name: 'portrait.png', mimeType: 'image/png', buffer: Buffer.from(images.png, 'base64') });
  await player.locator('.own-profile-select img').waitFor(); current = await read(pin); me = current.players.find(p => p.id === membership.playerId); assert.notEqual(me.avatar, firstURL);
  const portraitBox = await player.locator('.player-chip.is-own .player-portrait').boundingBox(); assert.ok(Math.abs(portraitBox.width - portraitBox.height) < 1, 'Lobby avatars stay circular');
  await host.goto(`${origin}/?room=${pin}&host=1`); await host.locator('.player-chip .player-portrait img').waitFor();
  await player.waitForTimeout(1000); const before = await player.evaluate(() => window.__starTransitions);
  await host.getByRole('button', { name: 'Vào đường đua', exact: true }).click();
  for (const page of [host, player]) { await page.locator('.race-scene[data-renderer="webgl"]').waitFor(); assert.equal(await page.locator('.standings-toggle').getAttribute('aria-expanded'), 'false'); assert.equal(await page.locator('.live-standings').isVisible(), false); await fit(page); }
  await player.waitForFunction(before => window.__starTransitions > before, before); await player.locator('.star-transition').waitFor({ state: 'hidden' });
  const transitions = await player.evaluate(() => window.__starTransitions); await player.waitForTimeout(1500); assert.equal(await player.evaluate(() => window.__starTransitions), transitions, 'Polling does not animate the page again');
  assert.equal((await upload(pin, membership.token, Buffer.from(images.jpeg, 'base64'))).status(), 409);
  for (const page of [host, player]) { await page.locator('.standings-toggle').click(); const row = page.locator(`.animated-standings li[data-player-id="${membership.playerId}"]`); await row.locator('img').waitFor(); assert.equal(await row.locator('img').getAttribute('src'), me.avatar); assert.equal(await page.locator('.race-scene [data-slot="avatar"]').count(), 0); }
  await host.screenshot({ path: `${out}/live-avatar-desktop.png`, fullPage: true }); await player.screenshot({ path: `${out}/live-avatar-mobile.png`, fullPage: true });
  await host.getByRole('button', { name: 'Bắt đầu cuộc đua', exact: true }).click(); await host.getByRole('dialog', { name: 'Kết quả cuộc đua' }).waitFor({ timeout: 23000 });
  await player.getByRole('dialog', { name: 'Kết quả cuộc đua' }).waitFor(); assert.equal(await host.locator('.podium-place img').count(), 1); assert.equal(await player.locator('.podium-place img').count(), 1);
  await host.getByRole('button', { name: 'Xem toàn bộ xếp hạng', exact: true }).click(); assert.equal(await host.locator('.final-table img').count(), 1);
  const downloaded = host.waitForEvent('download'); await host.getByRole('button', { name: 'Tải ảnh kết quả', exact: true }).click(); await (await downloaded).saveAs(`${out}/results-avatar-export.png`);
  await host.screenshot({ path: `${out}/results-avatar.png`, fullPage: true }); await fit(player);
  await player.getByRole('dialog').getByRole('button', { name: 'Đóng', exact: true }).click(); await player.emulateMedia({ reducedMotion: 'reduce' });
  await player.getByRole('button', { name: 'Về trang tham gia', exact: true }).click(); await player.getByRole('button', { name: 'Vào phòng chờ', exact: true }).waitFor(); assert.equal(await player.locator('.star-transition').isVisible(), false); await fit(player);
  assert.deepEqual(errors, []); await writeFile(`${out}/report.json`, JSON.stringify({ passed: true, avatarBytes: (await stored.body()).length, transitions, errors }, null, 2));
  console.log('PASS Avatar upload/resize, validation, token ownership, removal, persistence, 2-device rankings/results, hidden default board, star transitions and reduced motion');
} catch (error) { await host.screenshot({ path: `${out}/host-failure.png`, fullPage: true }); await player.screenshot({ path: `${out}/player-failure.png`, fullPage: true }); console.log(errors); throw error; }
finally { if (pin) await post(`rooms/${pin}/close`).catch(() => {}); await browser.close(); }
