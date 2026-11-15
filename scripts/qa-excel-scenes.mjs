// Additional real-browser checks for XLSX, all five scenes and the low graphics mode.
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { writeFile, mkdir } from "node:fs/promises";
import assert from "node:assert/strict";
const require = createRequire(import.meta.url), { zipSync, strToU8 } = require("fflate");
const { chromium } = createRequire(resolve(process.argv[2] || ".", "package.json"))("playwright");
const origin = "http://127.0.0.1:5173", out = resolve("outputs/qa-upgrade"); await mkdir(out, { recursive: true });
const xml = {
  "[Content_Types].xml": '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
  "_rels/.rels": '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
  "xl/workbook.xml": '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="STAR" sheetId="1" r:id="rId1"/></sheets></workbook>',
  "xl/_rels/workbook.xml.rels": '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
  "xl/worksheets/sheet1.xml": '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><dimension ref="A1:B3"/><sheetData><row r="1"><c r="A1" t="inlineStr"><is><t>Lớp</t></is></c><c r="B1" t="inlineStr"><is><t>Họ tên</t></is></c></row><row r="2"><c r="A2" t="inlineStr"><is><t>10A</t></is></c><c r="B2" t="inlineStr"><is><t>Nguyễn Minh Anh</t></is></c></row><row r="3"><c r="A3" t="inlineStr"><is><t>10B</t></is></c><c r="B3" t="inlineStr"><is><t>Trần Hoàng Nam</t></is></c></row></sheetData></worksheet>',
};
const fixture = zipSync(Object.fromEntries(Object.entries(xml).map(([k, v]) => [k, strToU8(v)])));
await writeFile(`${out}/sample-class.xlsx`, fixture);
const browser = await chromium.launch({ channel: "chrome", headless: true }); const context = await browser.newContext({ viewport: { width: 1280, height: 900 } }); const page = await context.newPage();
const errors = []; page.on("pageerror", e => errors.push(e.message));
const post = async (path, data = {}) => { const r = await context.request.post(`${origin}/api/${path}`, { data, headers: { Origin: origin } }); assert.equal(r.ok(), true, await r.text()); return r.json(); };
try {
  await page.goto(`${origin}/signin-with-chatgpt?return_to=/%3Fview%3Dadmin`); await page.getByLabel("Tên phòng").waitFor();
  const room = await post("rooms", { title: "STAR · Kiểm tra Excel và khung cảnh", duration: 10 });
  await page.goto(`${origin}/?room=${room.pin}&host=1`); await page.locator(".big-pin").waitFor(); await page.getByRole("button", { name: "Thêm danh sách", exact: true }).click();
  await page.locator('input[type="file"]').setInputFiles({ name: "lop-star.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: Buffer.from(fixture) });
  await page.getByRole("button", { name: "Thêm 2 người", exact: true }).click(); await page.getByRole("dialog").waitFor({ state: "hidden" });
  assert.equal((await (await context.request.get(`${origin}/api/rooms/${room.pin}`)).json()).count, 2); console.log("PASS Real XLSX upload, Vietnamese names, detected name column and header");
  for (const scene of ["park", "sunset", "stadium", "winter", "night"]) {
    await post(`rooms/${room.pin}/settings`, { scene }); await post(`rooms/${room.pin}/start`); await page.reload(); await page.locator('.race-scene[data-renderer="webgl"]').waitFor({ timeout: 30000 });
    await page.getByRole("button", { name: "Cài đặt cuộc đua", exact: true }).click(); await page.getByLabel("Chất lượng đồ họa", { exact: true }).selectOption("low"); await page.getByRole("dialog").getByRole("button", { name: "Đóng", exact: true }).click(); await page.waitForTimeout(500); await page.locator('.race-scene[data-renderer="webgl"]').waitFor();
    await page.screenshot({ path: `${out}/scene-${scene}.png`, fullPage: true }); await post(`rooms/${room.pin}/finish`); await page.locator(".results-heading h2").waitFor(); await post(`rooms/${room.pin}/reset`); console.log(`PASS ${scene}: WebGL, low graphics, result, reset`);
  }
  await post(`rooms/${room.pin}/close`); assert.deepEqual(errors, []); await writeFile(`${out}/excel-scenes-report.json`, JSON.stringify({ passed: true, scenes: 5, xlsx: true, errors }, null, 2));
} finally { await browser.close(); }
