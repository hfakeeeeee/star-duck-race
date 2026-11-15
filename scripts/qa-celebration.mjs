import { createRequire } from "node:module";
import { resolve } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const { chromium } = createRequire(resolve(process.argv[2] || ".", "package.json"))("playwright");
const origin="http://127.0.0.1:5173",out=resolve("outputs/qa-celebration");await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:"chrome",headless:true}),context=await browser.newContext({viewport:{width:1440,height:1000}});
await context.addInitScript(()=>{
  const Base=window.AudioContext;window.__audio=[];window.__buffers=[];
  window.AudioContext=class extends Base {constructor(...args){super(...args);window.__audio.push(this);const gain=this.createGain.bind(this),source=this.createBufferSource.bind(this);
    this.createGain=()=>{const g=gain();if(!this.masterProbe){this.masterProbe=g;this.analyser=this.createAnalyser();this.analyser.fftSize=2048;g.connect(this.analyser);}return g;};
    this.createBufferSource=()=>{const s=source(),start=s.start.bind(s);s.start=(...args)=>{window.__buffers.push({duration:s.buffer?.duration,at:performance.now()});return start(...args);};return s;};
  }};
});
const page=await context.newPage(),errors=[];page.on("pageerror",e=>errors.push(e.message));page.on("console",m=>{if(m.type()==="error")errors.push(m.text());});
const post=async(path,data={})=>{const r=await context.request.post(`${origin}/api/${path}`,{data,headers:{Origin:origin}});assert.ok(r.ok(),await r.text());return r.json();};
const energy=()=>page.evaluate(()=>{const a=window.__audio[0].analyser,data=new Float32Array(2048);a.getFloatTimeDomainData(data);return Math.sqrt(data.reduce((sum,x)=>sum+x*x,0)/data.length);});
const noScroll=async()=>assert.equal(await page.evaluate(()=>document.documentElement.scrollHeight>innerHeight||document.documentElement.scrollWidth>innerWidth),false);
let pin;
try{
  await page.goto(`${origin}/signin-with-chatgpt?return_to=/%3Fview%3Dadmin`);await page.getByLabel("Tên phòng").waitFor();
  const audioModule=await page.evaluate(()=>performance.getEntriesByType("resource").map(e=>e.name).find(n=>n.includes("/lib/race-audio")));console.log("Audio module",audioModule);
  await page.evaluate(async url=>{const {RaceAudio}=await import(url||"/lib/race-audio.ts");window.__sounds=[];window.__themes=[];
    const cue=RaceAudio.prototype.cue,music=RaceAudio.prototype.music;
    RaceAudio.prototype.cue=function(kind){window.__sounds.push({kind,at:performance.now()});return cue.call(this,kind);};
    RaceAudio.prototype.music=function(track){window.__themes.push(track);return music.call(this,track);};
  },audioModule);
  await page.getByLabel("Tên phòng").fill("STAR · Quack & khoảnh khắc chiến thắng");await page.getByLabel("Thời lượng cuộc đua",{exact:true}).fill("10");await page.getByLabel("Vịt thử nghiệm",{exact:true}).fill("23");
  await page.getByRole("button",{name:"Tạo phòng đua",exact:true}).click();await page.locator(".big-pin").waitFor();pin=(await page.locator(".big-pin").textContent()).trim();await page.waitForTimeout(600);
  assert.ok(await energy()>.0005,"Lobby must produce real audio");assert.ok(await page.evaluate(()=>window.__themes.includes("lobby")));
  await post(`rooms/${pin}/join`,{name:"Tour Huế · Cố đô 2 ngày 1 đêm",token:crypto.randomUUID(),skin:"captain"});await page.waitForTimeout(900);assert.ok(await page.evaluate(()=>window.__sounds.some(e=>e.kind==="join")));
  await page.screenshot({path:`${out}/lobby-music.png`,fullPage:true});
  await page.getByRole("button",{name:"Vào đường đua",exact:true}).click();await page.locator('.race-scene[data-renderer="webgl"]').waitFor();await page.waitForTimeout(600);
  assert.ok(await energy()>.0005,"Ready room must produce real audio");assert.ok(await page.evaluate(()=>window.__themes.includes("ready")));assert.equal(await page.evaluate(()=>window.__audio.length),1,"One shared AudioContext across phases");
  await page.getByRole("button",{name:"Bắt đầu cuộc đua",exact:true}).click();await page.locator(".start-overlay").waitFor({state:"hidden"});
  await page.locator(".winner-announcement").waitFor({timeout:16000});assert.equal(await page.getByRole("dialog",{name:"Kết quả cuộc đua"}).count(),0,"Show the winner's jump before the results");
  await page.waitForTimeout(350);await page.screenshot({path:`${out}/winner-flight.png`,fullPage:true});
  await page.getByRole("dialog",{name:"Kết quả cuộc đua"}).waitFor();assert.equal(await page.locator(".podium-place").count(),3);
  const glass=await page.locator(".celebration-modal").evaluate(e=>({blur:getComputedStyle(e).backdropFilter,background:getComputedStyle(e).backgroundImage}));assert.match(glass.blur,/blur/);
  const events=await page.evaluate(()=>window.__sounds),win=events.find(e=>e.kind==="win"),podium=events.find(e=>e.kind==="podium");assert.ok(win&&podium);assert.ok(podium.at-win.at>=1200,"Separate finish and podium cues");assert.equal(events.filter(e=>e.kind==="win").length,1);assert.equal(events.filter(e=>e.kind==="podium").length,1);
  assert.ok(events.some(e=>e.kind==="leader"),"Live overtakes must trigger quacks");await noScroll();await page.screenshot({path:`${out}/glass-top3-desktop.png`,fullPage:true});
  for(const viewport of [{width:375,height:812},{width:320,height:568},{width:844,height:390}]){await page.setViewportSize(viewport);await page.waitForTimeout(200);await noScroll();const box=await page.getByRole("dialog").boundingBox();assert.ok(box.y>=0&&box.y+box.height<=viewport.height);await page.screenshot({path:`${out}/glass-top3-${viewport.width}.png`,fullPage:true});}
  await page.getByRole("dialog").getByRole("button",{name:"Đóng",exact:true}).click();await page.getByRole("button",{name:"Tắt âm thanh",exact:true}).click();await page.waitForTimeout(650);assert.ok(await energy()<.0001,"Mute must silence music and effects");
  const quacks=await page.evaluate(async()=>{
    const {RaceAudio}=await import("/lib/race-audio.ts"),engine=new RaceAudio();await engine.unlock();await engine.loadQuacks();const count=engine.quacks.length;
    const start=window.__buffers.length,random=Math.random;let n=0;Math.random=()=>[.1,.1,.9,.1][n++%4];for(let i=0;i<12;i++)engine.cue("leader");Math.random=random;
    const durations=window.__buffers.slice(start).map(e=>e.duration);engine.setVolume(0);engine.dispose();return {count,durations};
  });assert.equal(quacks.count,3);assert.equal(new Set(quacks.durations).size,3);for(let i=1;i<quacks.durations.length;i++)assert.notEqual(quacks.durations[i],quacks.durations[i-1]);
  assert.deepEqual(errors,[]);await writeFile(`${out}/report.json`,JSON.stringify({passed:true,glass,events,quacks,errors},null,2));console.log("PASS Lobby/ready music, join/UI cues, real random quacks, winner jump before top 3, separate victory/fanfare, liquid glass, responsive dialogs and shared mute");
}catch(e){await page.screenshot({path:`${out}/failure.png`,fullPage:true});console.log(errors);throw e;}
finally{if(pin)await post(`rooms/${pin}/close`).catch(()=>{});await browser.close();}
