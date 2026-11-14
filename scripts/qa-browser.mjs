// Run with: node scripts/qa-browser.mjs <directory containing node_modules/playwright>
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const require = createRequire(resolve(process.argv[2] || ".", "package.json"));
const { chromium } = require("playwright");
const origin = process.env.QA_ORIGIN || "http://127.0.0.1:5173";
const out = resolve("outputs/qa"); await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const failures = []; const steps = [];
const mark = s => { steps.push(s); console.log("PASS", s); };
const admin = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
const student = await browser.newContext({ viewport: { width: 375, height: 812 }, isMobile: true, hasTouch: true });
const second = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await admin.newPage(); const phone = await student.newPage(); const other = await second.newPage();
for (const p of [page, phone, other]) p.on("pageerror", e => failures.push(e.message));
const post = (context, path, data) => context.request.post(`${origin}/api/${path}`, { data, headers: { Origin: origin } });
try {
  await page.goto(origin); await page.getByRole("heading", { name: "Tham gia cuộc đua" }).waitFor(); await page.screenshot({ path: `${out}/home-desktop.png`, fullPage: true });
  await phone.goto(origin); await phone.getByRole("heading", { name: "Tham gia cuộc đua" }).waitFor(); await phone.screenshot({ path: `${out}/home-mobile.png`, fullPage: true });
  assert.equal(await phone.evaluate(() => document.documentElement.scrollWidth > innerWidth), false); mark("Trang tham gia hiển thị đúng ở 375px và 1440px");
  const forbidden = await post(student, "rooms", { title: "Unauthorized", duration: 10 }); assert.equal(forbidden.status(), 401); mark("API từ chối người chưa đăng nhập tạo phòng");
  await page.goto(`${origin}/?view=admin`); await page.getByRole("link", { name: /Đăng nhập thử nghiệm/ }).click();
  await page.getByLabel("Tên phòng").fill("Thứ Sáu vui cùng STAR"); await page.getByLabel("Thời lượng cuộc đua").fill("10"); await page.getByRole("button", { name: "Tạo phòng đua" }).click();
  await page.locator(".big-pin").waitFor(); const pin = (await page.locator(".big-pin").textContent()).trim(); assert.match(pin, /^\d{6}$/); mark("Đăng nhập mock và tạo phòng với PIN 6 số");
  await phone.goto(`${origin}/?room=${pin}`); await phone.getByLabel("Tên của bạn").fill("Minh Anh · 10A1"); await phone.getByRole("button", { name: /Vào phòng chờ/ }).click(); await phone.getByText("Vịt đã vào vị trí!").waitFor();
  await other.goto(`${origin}/?room=${pin}`); await other.getByLabel("Tên của bạn").fill("Nguyễn Hoàng Nam"); await other.getByRole("button", { name: /Vào phòng chờ/ }).click(); await other.getByText("Vịt đã vào vị trí!").waitFor();
  const names = ["Bảo Ngọc", "Gia Hân", "Quốc Huy", "Thảo Vy", "Khánh Linh", "Đức Minh", "Tuấn Kiệt", "Phương Anh", "Hà My", "Thiên Phúc", "Đăng Khoa", "Ngọc Ánh", "Trọng Nhân", "Tú Anh"];
  for (const name of names) { const r = await post(second, `rooms/${pin}/join`, { name, token: crypto.randomUUID() }); assert.equal(r.status(), 200); }
  await page.getByText("Tú Anh", { exact: true }).waitFor();
  await page.screenshot({ path: `${out}/lobby-desktop.png`, fullPage: true }); await phone.screenshot({ path: `${out}/lobby-mobile.png`, fullPage: true });
  await page.setViewportSize({ width: 375, height: 812 }); await page.screenshot({ path: `${out}/lobby-admin-mobile.png`, fullPage: true }); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false); await page.setViewportSize({ width: 1440, height: 1000 });
  await phone.reload(); await phone.getByText("Vịt đã vào vị trí!").waitFor(); mark("16 người được đồng bộ, QR hiển thị và tải lại giữ người chơi");
  await page.getByRole("button", { name: "Khóa phòng" }).click(); await page.getByRole("button", { name: "Mở khóa phòng" }).waitFor();
  assert.equal((await post(second, `rooms/${pin}/join`, { name: "Người đến muộn", token: crypto.randomUUID() })).status(), 409);
  await page.getByRole("button", { name: "Mở khóa phòng" }).click(); mark("Khóa phòng được kiểm tra ở máy chủ");
  await page.getByRole("button", { name: "Bắt đầu cuộc đua" }).click(); await page.locator(".countdown-overlay").waitFor(); await phone.locator(".race-section").waitFor();
  await page.waitForTimeout(5500); await page.screenshot({ path: `${out}/race-desktop.png`, fullPage: true }); await phone.screenshot({ path: `${out}/race-mobile.png`, fullPage: true });
  await page.locator(".results-heading h2").waitFor({ timeout: 20000 }); await phone.locator(".results-heading h2").waitFor();
  assert.equal(await page.locator(".results-heading h2").textContent(), await phone.locator(".results-heading h2").textContent());
  await page.screenshot({ path: `${out}/results-desktop.png`, fullPage: true }); await phone.screenshot({ path: `${out}/results-mobile.png`, fullPage: true });
  const winner = await phone.locator(".results-heading h2").textContent(); await phone.reload(); await phone.locator(".results-heading h2").waitFor(); assert.equal(await phone.locator(".results-heading h2").textContent(), winner); mark("Hai thiết bị nhận cùng kết quả, tải lại không đổi người thắng");
  await page.getByRole("button", { name: "Xem toàn bộ xếp hạng" }).click(); assert.equal(await page.locator(".ranking-list li").count(), 16);
  const downloadPromise = page.waitForEvent("download"); await page.getByRole("button", { name: "Tải kết quả CSV" }).click(); const download = await downloadPromise; assert.match(download.suggestedFilename(), /STAR-\d{6}\.csv/); mark("Xếp hạng đầy đủ và tải CSV");
  await page.getByRole("button", { name: "Đua lại", exact: true }).click(); await page.locator(".big-pin").waitFor(); await phone.getByText("Vịt đã vào vị trí!").waitFor();
  assert.equal((await (await admin.request.get(`${origin}/api/rooms/${pin}`)).json()).count, 16); mark("Đua lại giữ danh sách 16 người");
  await page.getByRole("button", { name: "Xóa Nguyễn Hoàng Nam", exact: true }).click(); await page.getByText("Nguyễn Hoàng Nam", { exact: true }).waitFor({ state: "hidden" }); mark("Admin xóa người khỏi phòng");
  await page.getByRole("button", { name: "Đóng phòng", exact: true }).click(); await page.getByRole("dialog").getByRole("button", { name: "Đóng phòng", exact: true }).click(); await phone.getByText("Cuộc vui đã khép lại.").waitFor(); mark("Đóng phòng cập nhật tới người chơi");
  const loadRoom = await (await post(admin, "rooms", { title: "QA · Capacity", duration: 10 })).json();
  const joins = []; for (let i = 0; i < 205; i += 8) {
    const chunk = await Promise.all(Array.from({ length: Math.min(8, 205 - i) }, (_, j) => post(second, `rooms/${loadRoom.pin}/join`, { name: `QA ${i + j + 1}`, token: crypto.randomUUID() })));
    joins.push(...chunk.map(r => r.status()));
  }
  const state = await (await second.request.get(`${origin}/api/rooms/${loadRoom.pin}`)).json(); assert.equal(state.count, 200); assert.equal(joins.filter(s => s === 200).length, 200); assert.equal(joins.filter(s => s === 409).length, 5); mark("205 yêu cầu thật: nhận đúng 200, từ chối 5, không vượt sức chứa");
  const invalidOrigin = await admin.request.post(`${origin}/api/rooms/${loadRoom.pin}/start`, { data: {}, headers: { Origin: "https://another.example" } }); assert.equal(invalidOrigin.status(), 403); mark("Chặn thao tác từ origin khác");
  await post(admin, `rooms/${loadRoom.pin}/close`, {});
  assert.deepEqual(failures, []); mark("Không có lỗi JavaScript trong 3 trình duyệt");
  await writeFile(`${out}/report.json`, JSON.stringify({ passed: true, steps, consoleErrors: failures, time: new Date().toISOString() }, null, 2));
} catch (e) { await page.screenshot({ path: `${out}/failure-admin.png`, fullPage: true }); await phone.screenshot({ path: `${out}/failure-phone.png`, fullPage: true }); throw e; }
finally { await browser.close(); }
