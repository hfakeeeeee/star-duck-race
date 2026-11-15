import { createRequire } from "node:module";
import { resolve } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const { chromium } = createRequire(resolve(process.argv[2] || ".", "package.json"))("playwright");
const origin = "http://127.0.0.1:5173", out = resolve("outputs/qa-viewport"); await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true }), context = await browser.newContext(), page = await context.newPage();
const errors = [], measurements = [], pins = [];
page.on("pageerror", e => errors.push(e.message)); page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
const post = async (path, data = {}) => { const r = await context.request.post(`${origin}/api/${path}`, { data, headers: { Origin: origin } }); assert.ok(r.ok(), await r.text()); return r.json(); };
async function fit(label, controls = []) {
  const data = await page.evaluate(selectors => {
    const rect = selector => { const e = document.querySelector(selector); if (!e) return null; const r = e.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height, right: r.right, bottom: r.bottom }; };
    return { width: innerWidth, height: innerHeight, scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight, scrollY, controls: selectors.map(s => [s, rect(s)]), arena: rect(".race-arena") };
  }, controls);
  assert.ok(data.scrollWidth <= data.width + 1, `${label}: horizontal overflow`); assert.ok(data.scrollHeight <= data.height + 1, `${label}: page scroll`); assert.equal(data.scrollY, 0);
  for (const [s, r] of data.controls) { assert.ok(r && r.width > 0 && r.height > 0, `${label}: ${s} missing`); assert.ok(r.y >= -1 && r.bottom <= data.height + 1 && r.x >= -1 && r.right <= data.width + 1, `${label}: ${s} clipped: ${JSON.stringify(r)}`); }
  measurements.push({ label, ...data }); await page.screenshot({ path: `${out}/${label}.png`, fullPage: true }); return data;
}
try {
  for (const viewport of [{ width:1366,height:768 },{ width:1280,height:720 },{ width:375,height:667 },{ width:320,height:568 },{ width:844,height:390 }].filter(v => (!process.argv.includes("--mobile") || v.width < 400) && (!process.argv.includes("--landscape") || v.height < 480))) {
    const id = `${viewport.width}x${viewport.height}`; await page.setViewportSize(viewport); await page.goto(origin); await page.getByLabel("Tên của bạn").waitFor();
    await fit(`join-${id}`, ['.join-form', '.join-form button[type="submit"]']);
    await page.locator(".skin-picker-trigger").click(); await page.getByRole("dialog", { name: "Chọn kiểu vịt" }).waitFor(); await fit(`skins-${id}`, ['[role="dialog"]']); await page.getByRole("button", { name: "Chọn vịt Thuyền trưởng", exact:true }).click();
    await page.goto(`${origin}/signin-with-chatgpt?return_to=/%3Fview%3Dadmin`); await page.getByLabel("Tên phòng").waitFor();
    await fit(`create-${id}`, ['.create-room', '.create-room button[type="submit"]']);
    await page.getByLabel("Tên phòng").fill(`STAR · Thử màn hình ${id}`); await page.getByLabel("Vịt thử nghiệm", { exact:true }).fill("12"); await page.getByLabel("Thời lượng cuộc đua", { exact:true }).fill("10");
    await page.getByRole("button", { name:"Tạo phòng đua",exact:true }).click(); await page.locator(".big-pin").waitFor(); const pin = (await page.locator(".big-pin").textContent()).trim(); pins.push(pin);
    assert.equal(await page.locator(".test-player-tag").count(), 12); await fit(`lobby-${id}`, ['.start-btn','.participants-card','.invite-card']);
    const qr = await page.locator(".qr-wrap img").boundingBox(); assert.ok(Math.abs(qr.width - qr.height) < 1,"QR must remain square");
    const list = await page.locator(".player-grid").boundingBox(); assert.ok(list.height >= 64,"Participant list needs usable visible space");
    await page.getByRole("button",{name:"Phóng to mã QR",exact:true}).click(); await fit(`qr-${id}`,['[role="dialog"]']); await page.getByRole("dialog").getByRole("button",{name:"Đóng",exact:true}).click();
    await page.getByRole("button", { name:"Cài đặt phòng",exact:true }).click(); await page.getByLabel("Số vịt thử nghiệm", { exact:true }).fill("50"); await page.getByRole("button", { name:"Lưu cài đặt",exact:true }).click(); await page.getByRole("dialog").waitFor({ state:"hidden" }); assert.equal(await page.locator(".test-player-tag").count(),50);
    await fit(`lobby-50-${id}`, ['.start-btn','.participants-card']);
    await page.getByRole("button", { name:"Bắt đầu cuộc đua",exact:true }).click(); await page.locator('.race-scene[data-renderer="webgl"]').waitFor();
    const before = await fit(`race-${id}`, ['.scene-wrap','.race-command-bar','.race-control-buttons']); assert.ok(before.arena.height > viewport.height * .55, "Race should occupy most of the screen");
    await page.mouse.wheel(0,1800); await page.waitForTimeout(100); assert.equal(await page.evaluate(() => scrollY),0);
    await page.getByRole("button", { name:"Bảng hạng",exact:true }).click(); await page.getByRole("button", { name:"Đóng bảng hạng",exact:true }).waitFor(); const board = await fit(`standings-${id}`, ['.live-standings']); assert.equal(board.arena.width,before.arena.width); await page.getByRole("button", { name:"Đóng bảng hạng",exact:true }).click();
    await page.getByRole("button", { name:"Cài đặt cuộc đua",exact:true }).click(); await fit(`settings-${id}`, ['[role="dialog"]']); await page.getByLabel("Chất lượng đồ họa",{exact:true}).selectOption("low"); await page.getByRole("dialog").getByRole("button",{name:"Đóng",exact:true}).click();
    await page.getByRole("button", { name:"Chế độ trình chiếu",exact:true }).click(); const stream = await fit(`presentation-${id}`, ['.scene-wrap']); assert.ok(stream.arena.height >= viewport.height - 1); await page.keyboard.press("Escape"); await page.getByRole("button", { name:"Chế độ trình chiếu",exact:true }).waitFor();
    await post(`rooms/${pin}/finish`); await page.getByRole("dialog",{name:"Kết quả cuộc đua"}).waitFor(); await fit(`results-${id}`, ['[role="dialog"]']);
    await page.getByRole("button",{name:"Xem lại về đích",exact:true}).click(); await page.getByLabel("Vị trí xem lại",{exact:true}).fill("0"); await fit(`replay-${id}`, ['.scene-wrap','.replay-controls']);
    await page.getByRole("button",{name:"Đóng xem lại",exact:true}).click(); await page.getByRole("button",{name:"Đua lại",exact:true}).click(); await page.locator(".big-pin").waitFor();
    await post(`rooms/${pin}/close`); console.log(`PASS ${id}: join, create, 50-duck waiting room, race, standings, settings, stream, results and replay fit one viewport`);
  }
  const test = await post("rooms",{title:"STAR · People and test ducks",duration:10,testCount:20}); pins.push(test.pin);
  const guest = await browser.newContext({viewport:{width:375,height:667}}), phone = await guest.newPage();
  await phone.goto(`${origin}/?room=${test.pin}`); await phone.getByLabel("Tên của bạn").fill("Người chơi thật"); await phone.getByRole("button",{name:"Vào phòng chờ",exact:true}).click(); await phone.getByText("Vịt đã vào vị trí!").waitFor();
  const participant = await (await context.request.get(`${origin}/api/rooms/${test.pin}`)).json(); assert.equal(participant.count,21);
  const denied = await guest.request.post(`${origin}/api/rooms/${test.pin}/test-ducks`,{data:{count:0},headers:{Origin:origin}}); assert.equal(denied.status(),401);
  const cleared = await post(`rooms/${test.pin}/test-ducks`,{count:0}); assert.equal(cleared.count,1); assert.equal(cleared.players[0].name,"Người chơi thật");
  await phone.waitForTimeout(800); assert.equal(await phone.evaluate(()=>document.documentElement.scrollHeight > innerHeight),false); await phone.screenshot({path:`${out}/player-waiting.png`,fullPage:true});
  const full = await post(`rooms/${test.pin}/test-ducks`,{count:199}); assert.equal(full.count,200);
  const tooMany = await context.request.post(`${origin}/api/rooms/${test.pin}/test-ducks`,{data:{count:200},headers:{Origin:origin}}); assert.equal(tooMany.status(),409);
  await post(`rooms/${test.pin}/close`); await guest.close(); assert.deepEqual(errors,[]);
  const suffix = process.argv.includes("--mobile") ? "-mobile" : process.argv.includes("--landscape") ? "-landscape" : "";
  await writeFile(`${out}/report${suffix}.json`,JSON.stringify({passed:true,measurements,errors},null,2)); console.log("PASS Admin-only test ducks, preserve real players, remove test ducks, 200 participant limit and participant waiting layout");
} catch(e) { await page.screenshot({path:`${out}/failure.png`,fullPage:true}); console.log(errors); throw e; }
finally { for (const pin of pins) await context.request.post(`${origin}/api/rooms/${pin}/close`,{data:{},headers:{Origin:origin}}).catch(()=>{}); await browser.close(); }
