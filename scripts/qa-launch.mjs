import { createRequire } from "node:module";
import { resolve } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const { chromium } = createRequire(resolve(process.argv[2] || ".", "package.json"))("playwright");
const origin = "http://127.0.0.1:5173", out = resolve("outputs/qa-launch"); await mkdir(out,{recursive:true});
const browser = await chromium.launch({channel:"chrome",headless:true}), admin = await browser.newContext({viewport:{width:1366,height:768}}), guest = await browser.newContext({viewport:{width:375,height:667}});
const host = await admin.newPage(), phone = await guest.newPage(), errors = [];
for (const p of [host,phone]) p.on("pageerror",e=>errors.push(e.message));
const post = async(path,data={})=>{const r=await admin.request.post(`${origin}/api/${path}`,{data,headers:{Origin:origin}});assert.ok(r.ok(),await r.text());return r.json();};
const read = async pin=>(await admin.request.get(`${origin}/api/rooms/${pin}`)).json();
const fit = async page=>assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight>innerHeight||document.documentElement.scrollWidth>innerWidth),false);
let pin;
try {
  await host.goto(`${origin}/signin-with-chatgpt?return_to=/%3Fview%3Dadmin`); await host.getByLabel("Tên phòng").waitFor();
  const room=await post("rooms",{title:"STAR · Chuẩn bị trước khi stream",duration:10,testCount:23}); pin=room.pin;
  await phone.goto(`${origin}/?room=${pin}`); await phone.getByLabel("Tên của bạn").fill("Người chơi điện thoại"); await phone.getByRole("button",{name:"Vào phòng chờ",exact:true}).click(); await phone.getByText("Vịt đã vào vị trí!").waitFor();
  await host.goto(`${origin}/?room=${pin}&host=1`); await host.getByRole("button",{name:"Vào đường đua",exact:true}).click();
  for(const p of [host,phone]) { await p.locator('.race-scene[data-renderer="webgl"]').waitFor(); await p.locator(".hud-state").filter({hasText:"Chờ xuất phát"}).waitFor(); assert.ok(await p.locator(".live-standings").isVisible()); await fit(p); }
  const ready=await read(pin), before=await host.locator(".hud-timer strong").textContent(); assert.equal(ready.state,"ready"); assert.equal(ready.race.ready,true); assert.equal(await phone.getByRole("button",{name:"Bắt đầu cuộc đua",exact:true}).count(),0);
  const denied=await guest.request.post(`${origin}/api/rooms/${pin}/start`,{data:{},headers:{Origin:origin}}); assert.equal(denied.status(),401);
  await host.getByRole("button",{name:"Chế độ trình chiếu",exact:true}).click(); assert.ok(await host.locator(".live-standings").isVisible()); assert.ok(await host.getByRole("button",{name:"Bắt đầu cuộc đua",exact:true}).isVisible());
  await host.screenshot({path:`${out}/ready-stream.png`,fullPage:true}); await phone.screenshot({path:`${out}/ready-player.png`,fullPage:true});
  await host.waitForTimeout(12500); assert.equal((await read(pin)).state,"ready"); assert.equal(await host.locator(".hud-timer strong").textContent(),before);
  assert.ok((await host.locator(".live-name small").allTextContents()).every(t=>t==="0% đường đua"));
  await phone.reload(); await phone.locator(".race-ready-controls").waitFor(); assert.equal(await phone.locator(".hud-timer strong").textContent(),"00:10");
  await host.getByRole("button",{name:"Bắt đầu cuộc đua",exact:true}).click(); await host.locator(".start-overlay").waitFor(); assert.equal((await read(pin)).race.id,ready.race.id); assert.equal((await read(pin)).race.ready,false);
  assert.ok(await host.locator(".presentation-mode").count()); assert.ok(await host.locator(".live-standings").isVisible());
  await host.locator(".start-overlay").waitFor({state:"hidden"}); await phone.locator(".start-overlay").waitFor({state:"hidden"}); await host.waitForTimeout(1600);
  assert.ok(await phone.locator(".live-standings").isVisible()); await host.screenshot({path:`${out}/live-stream.png`,fullPage:true}); await phone.screenshot({path:`${out}/live-player.png`,fullPage:true});
  await host.keyboard.press("Escape"); await host.getByRole("button",{name:"Tạm dừng",exact:true}).click(); await phone.locator(".pause-overlay").waitFor();
  for(const viewport of [{width:320,height:568},{width:844,height:390}]) {await host.setViewportSize(viewport);await host.waitForTimeout(300);await fit(host);assert.ok(await host.locator(".live-standings").isVisible());await host.screenshot({path:`${out}/paused-${viewport.width}.png`,fullPage:true});}
  await host.getByRole("button",{name:"Tiếp tục đua",exact:true}).click(); await host.getByRole("dialog",{name:"Kết quả cuộc đua"}).waitFor({timeout:20000});
  await phone.getByRole("dialog",{name:"Kết quả cuộc đua"}).waitFor();assert.equal(await host.locator(".results-heading h2").textContent(),await phone.locator(".results-heading h2").textContent());
  await host.getByRole("button",{name:"Đua lại",exact:true}).click();await host.getByRole("button",{name:"Vào đường đua",exact:true}).click();await host.locator(".race-ready-controls").waitFor();
  await host.getByRole("button",{name:"Về phòng chờ",exact:true}).click(); await phone.getByText("Vịt đã vào vị trí!").waitFor(); const returned=await read(pin);assert.equal(returned.state,"waiting");assert.equal(returned.count,24);assert.equal(returned.locked,false);
  assert.deepEqual(errors,[]); await writeFile(`${out}/report.json`,JSON.stringify({passed:true,heldForSeconds:12.5,players:24,errors},null,2));console.log("PASS Prepared room stays frozen beyond race duration; launch inside stream; default live rankings; reload, two devices, mobile, pause, results and return to lobby");
} catch(e) { await host.screenshot({path:`${out}/failure.png`,fullPage:true});console.log(errors);throw e; }
finally {if(pin)await post(`rooms/${pin}/close`).catch(()=>{});await browser.close();}
