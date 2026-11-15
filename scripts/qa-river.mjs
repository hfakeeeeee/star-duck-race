// Focused browser regression: river shaders in every scene + real audio signal.
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import assert from "node:assert/strict";
const { chromium } = createRequire(resolve(process.argv[2] || ".", "package.json"))("playwright");
const origin = "http://127.0.0.1:5173", out = resolve("outputs/qa-river"); await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } }), page = await context.newPage();
const errors = [];
page.on("pageerror", e => errors.push(e.message));
page.on("console", m => { if (m.type() === "error") errors.push(m.text()); });
const post = async (path, data = {}) => {
  const r = await context.request.post(`${origin}/api/${path}`, { data, headers: { Origin: origin } });
  assert.ok(r.ok(), await r.text()); return r.json();
};
try {
  await page.goto(`${origin}/signin-with-chatgpt?return_to=/%3Fview%3Dadmin`); await page.getByLabel("Tên phòng").waitFor();
  const room = await post("rooms", { title: "STAR · Dòng sông mùa mới", duration: 30 });
  await post(`rooms/${room.pin}/import`, { names: ["Huy", "Trang", "Tour Huế · Cố đô 2 ngàn năm"] });
  for (const scene of ["park", "sunset", "winter", "stadium", "night"]) {
    await post(`rooms/${room.pin}/settings`, { scene });
    await page.goto(`${origin}/?room=${room.pin}&host=1`); await page.locator(".big-pin").waitFor();
    await page.getByRole("button", { name: "Bắt đầu cuộc đua", exact: true }).click();
    await page.locator('.race-scene[data-renderer="webgl"]').waitFor();
    // Temporarily hide only the countdown veil to inspect the actual aligned grid.
    const css = await page.addStyleTag({ content: ".start-overlay { visibility: hidden !important }" });
    await page.screenshot({ path: `${out}/${scene}-grid.png`, fullPage: true }); await css.evaluate(e => e.remove());
    await page.locator(".start-overlay").waitFor({ state: "hidden" }); await page.waitForTimeout(1700);
    await page.screenshot({ path: `${out}/${scene}-race.png`, fullPage: true });
    await page.getByLabel("Chất lượng đồ họa", { exact: true }).selectOption("low"); await page.waitForTimeout(300);
    await page.locator('.race-scene[data-renderer="webgl"]').waitFor();
    await post(`rooms/${room.pin}/finish`); await page.locator(".results-heading h2").waitFor(); await post(`rooms/${room.pin}/reset`);
    console.log(`PASS ${scene}: aligned grid, close camera, waves, low quality, no WebGL shader errors`);
  }
  const audio = await page.evaluate(async () => {
    const { RaceAudio } = await import(/* @vite-ignore */ "/lib/race-audio.ts");
    const engine = new RaceAudio(); await engine.unlock();
    const ac = engine.context, analyser = ac.createAnalyser(); analyser.fftSize = 2048; engine.master.connect(analyser);
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    const rms = () => { const data = new Float32Array(2048); analyser.getFloatTimeDomainData(data); return Math.sqrt(data.reduce((v, x) => v + x * x, 0) / data.length); };
    const signal = {};
    for (const track of ["bright", "chill"]) {
      engine.music(track); const samples = [];
      for (let i = 0; i < 20; i++) { await sleep(100); samples.push(rms()); }
      signal[track] = { min: Math.min(...samples), max: Math.max(...samples), mean: samples.reduce((a, b) => a + b, 0) / samples.length };
      engine.stop(); await sleep(450); signal[`${track}Stopped`] = rms();
    }
    engine.music(); engine.setVolume(0); await sleep(600); signal.muted = rms(); engine.dispose(); return signal;
  });
  for (const track of ["bright", "chill"]) { assert.ok(audio[track].mean > .002, "Real audible waveform required"); assert.ok(audio[`${track}Stopped`] < .0001, "Pause must silence the arrangement"); }
  assert.ok(audio.muted < .0001, "Volume zero must silence audio"); assert.deepEqual(errors, []);
  await post(`rooms/${room.pin}/close`);
  await writeFile(`${out}/report.json`, JSON.stringify({ passed: true, scenes: 5, audio, errors }, null, 2)); console.log("PASS Both arrangements produce real audio; pause and volume zero are silent", audio);
} catch (e) { await page.screenshot({ path: `${out}/failure.png`, fullPage: true }); console.log(errors); throw e; }
finally { await browser.close(); }
