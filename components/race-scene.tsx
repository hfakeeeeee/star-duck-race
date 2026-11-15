"use client";
import { useEffect, useRef, useState } from "react";
import type * as T from "three";
import { raceElapsed, raceProgress, SKINS, standings, type PublicRoom } from "../lib/race";
import { MotionClock, dampFactor } from "../lib/motion";
import { createRiverWater, riverHeight } from "../lib/river-water";
import { configureOverview, followCameraPose, raceWorldX, TRACK_LENGTH } from "../lib/race-view";
import { winnerLift } from "../lib/celebration";

export type CameraMode = "follow" | "overview" | "mine";
export type Quality = "auto" | "low";
const LENGTH = TRACK_LENGTH;
type Props = { room: PublicRoom; elapsed: number; ownId?: string; camera: CameraMode; quality: Quality; labels: boolean; rate?: number; replay?: boolean; offset?: number; seek?: number };

export default function RaceScene(props: Props) {
  const mount = useRef<HTMLDivElement>(null); const current = useRef({ ...props, sampledAt: 0 });
  const [fallback, setFallback] = useState(false);
  useEffect(() => {
    const changed = props.elapsed !== current.current.elapsed || props.rate !== current.current.rate || props.seek !== current.current.seek;
    current.current = { ...props, sampledAt: changed ? performance.now() : current.current.sampledAt };
  });
  useEffect(() => {
    const node = mount.current!; if (!node || !props.room.race) return;
    let disposed = false, cleanup = () => {};
    void import("three").then(THREE => {
      if (disposed) return;
      let renderer: T.WebGLRenderer;
      try { renderer = new THREE.WebGLRenderer({ antialias: props.quality !== "low", alpha: false, powerPreference: "high-performance" }); }
      catch { setFallback(true); return; }
      const room = current.current.room, race = room.race!;
      const winter = room.scene === "winter", sunset = room.scene === "sunset", stadium = room.scene === "stadium", night = room.scene === "night";
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, props.quality === "low" ? 1 : 1.5));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = night ? 1.05 : 1.2;
      node.insertBefore(renderer.domElement, node.firstChild); node.dataset.renderer = "webgl";
      const scene = new THREE.Scene();
      const sky = night ? "#0b1533" : sunset ? "#f1c4b4" : winter ? "#b7d5ed" : "#c7e8f5";
      scene.background = new THREE.Color(sky); scene.fog = new THREE.Fog(sky, 180, 480);
      const camera = new THREE.PerspectiveCamera(44, 1, .1, 700);
      const overview = new THREE.OrthographicCamera(-92, 92, 52, -52, .1, 700);
      scene.add(new THREE.HemisphereLight(night ? 0xa2c5fb : sunset ? 0xffede0 : 0xffffff, night ? 0x243953 : 0x6a9a8e, night ? 1.25 : 2.8));
      const sun = new THREE.DirectionalLight(night ? 0xb2ceff : sunset ? 0xffd1a5 : 0xfff3d9, night ? 1.6 : 2.7); sun.position.set(-40, 70, 30); scene.add(sun);
      const geometries = new Set<T.BufferGeometry>(), materials = new Set<T.Material>(), textures = new Set<T.Texture>();
      const geometry = <G extends T.BufferGeometry>(g: G) => { geometries.add(g); return g; };
      const material = (color: string, roughness = .65) => { const m = new THREE.MeshStandardMaterial({ color, roughness }); materials.add(m); return m; };
      const sphere = geometry(new THREE.SphereGeometry(1, 16, 10));
      const box = geometry(new THREE.BoxGeometry(1, 1, 1));
      const cylinder = geometry(new THREE.CylinderGeometry(1, 1, 1, 10));
      const cone = geometry(new THREE.ConeGeometry(1, 1, 8));
      const torus = geometry(new THREE.TorusGeometry(1, .18, 6, 16));
      function mesh(g: T.BufferGeometry, m: T.Material, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1) {
        const o = new THREE.Mesh(g, m); o.position.set(x, y, z); o.scale.set(sx, sy, sz); scene.add(o); return o;
      }
      const grass = material(night ? "#183b42" : winter ? "#edf5fc" : sunset ? "#899c76" : "#8bbe80");
      mesh(box, grass, 80, -.5, -33, 240, 1, 40); mesh(box, grass, 80, -.5, 33, 240, 1, 40);
      const rim = material(night ? "#52687c" : winter ? "#d4e8f5" : "#d2c9a9");
      mesh(box, rim, 80, -.1, -13.8, 240, .5, 1.6); mesh(box, rim, 80, -.1, 13.8, 240, .5, 1.6);
      const waterGeometry = geometry(new THREE.PlaneGeometry(240, 26, props.quality === "low" ? 180 : 360, props.quality === "low" ? 32 : 64)); waterGeometry.rotateX(-Math.PI / 2);
      const river = createRiverWater(THREE, night, sunset, winter); materials.add(river.material);
      mesh(waterGeometry, river.material, 80, -.04, 0);
      const dummy = new THREE.Object3D();
      const bark = material(night ? "#3e414c" : "#94735a"), leaves = material(night ? "#24565d" : winter ? "#3b8475" : "#4e966f"), paleLeaves = material(night ? "#34767a" : winter ? "#ffffff" : "#70ab79");
      if (!stadium) {
        for (let i = 0; i < 36; i++) {
          const x = -20 + (i % 18) * 13.2, z = (i < 18 ? -1 : 1) * (18 + i % 3 * 3);
          const h = 3.5 + i % 4 * .5;
          mesh(cylinder, bark, x, h * .32, z, .28, h * .65, .28);
          mesh(cone, leaves, x, h * .8, z, 1.7, h, 1.7);
          mesh(cone, paleLeaves, x, h * 1.1, z, 1.25, h * .65, 1.25);
        }
        const mountain = material(night ? "#1b2c50" : sunset ? "#b7a49a" : winter ? "#9ebbd2" : "#aacac1");
        for (let i = 0; i < 12; i++) mesh(cone, mountain, -50 + i * 23, 5, -65 - i % 3 * 8, 19, 28 + i % 3 * 10, 16);
      } else {
        const stand = material("#c1cfe0"), seats = [material("#172b63"), material("#d2aa61"), material("#f8fafc")];
        for (const side of [-1, 1]) {
          for (let tier = 0; tier < 3; tier++) {
            mesh(box, stand, 80, tier * 1.3 + .5, side * (18 + tier * 2.3), 215, 1.3, 3);
            for (let i = 0; i < 42; i++) mesh(box, seats[(i + tier) % 3], -20 + i * 5, tier * 1.3 + 1.5, side * (18 + tier * 2.3), 3, .7, 1.2);
          }
          for (let x = 0; x <= 160; x += 40) { mesh(cylinder, material("#8b9cad"), x, 7, side * 27, .15, 14, .15); mesh(box, material("#fff8dc"), x, 14, side * 27, 5, 1, 1.5); }
        }
      }
      const navy = material("#172b63"), gold = material("#d2aa61"), white = material("#fff9ec");
      if (night) {
        const glow = new THREE.MeshBasicMaterial({ color: "#fff0ba" }); materials.add(glow);
        mesh(sphere, glow, 92, 54, -105, 5, 5, 5);
        const starGeometry = geometry(new THREE.BufferGeometry()); const starPositions = new Float32Array(100 * 3);
        for (let i = 0; i < 100; i++) { starPositions[i * 3] = -90 + (i * 73.7) % 360; starPositions[i * 3 + 1] = 25 + (i * 13.3) % 65; starPositions[i * 3 + 2] = -95 - (i * 7.7) % 90; }
        starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
        const starMaterial = new THREE.PointsMaterial({ color: "#dae9ff", size: .4, transparent: true, opacity: .9 }); materials.add(starMaterial); scene.add(new THREE.Points(starGeometry, starMaterial));
        for (let i = 0; i < 6; i++) {
          const x = Math.floor(i / 2) * 80, z = i % 2 ? 16 : -16;
          mesh(cylinder, navy, x, 2.6, z, .13, 5.2, .13); mesh(sphere, glow, x, 5.3, z, .42, .42, .42);
          if (i % 2 === 0) { const light = new THREE.PointLight(0xffd49a, 20, 36, 1.4); light.position.set(x, 5, z); scene.add(light); }
        }
      }
      function banner(text: string, width: number, height: number, color = "#172b63") {
        const c = document.createElement("canvas"); c.width = 1024; c.height = 160;
        const ctx = c.getContext("2d")!; ctx.fillStyle = color; ctx.fillRect(0, 0, c.width, c.height);
        ctx.fillStyle = "#d2aa61"; ctx.fillRect(0, 140, 1024, 20); ctx.fillStyle = "#ffffff";
        ctx.font = "bold 72px sans-serif"; ctx.textAlign = "center"; ctx.fillText(text, 512, 104);
        const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; textures.add(t);
        const m = new THREE.MeshStandardMaterial({ map: t, roughness: .8, side: THREE.DoubleSide }); materials.add(m);
        return new THREE.Mesh(geometry(new THREE.PlaneGeometry(width, height)), m);
      }
      for (let i = 0; i < 5; i++) { const b = banner(i % 2 ? "CÙNG NHAU VỀ ĐÍCH" : "STAR EDUCATION", 16, 2.5); b.position.set(8 + i * 34, 2, -15); scene.add(b); }
      for (const z of [-13, 13]) { mesh(cylinder, navy, LENGTH, 3.5, z, .35, 7, .35); mesh(sphere, gold, LENGTH, 7, z, .6, .6, .6); }
      mesh(box, navy, LENGTH, 6.8, 0, .6, 1.1, 26);
      const gate = banner("VỀ ĐÍCH  ★  STAR", 25, 2); gate.rotation.y = -Math.PI / 2; gate.position.set(LENGTH - .4, 6.5, 0); scene.add(gate);
      for (let i = 0; i < 26; i++) for (let j = 0; j < 2; j++) mesh(box, (i + j) % 2 ? navy : white, LENGTH + j * .55, .14, -12.5 + i, .55, .03, 1);
      for (let i = 0; i < 5; i++) mesh(box, i % 2 ? gold : navy, -.6 * i, .14, 0, .3, .03, 26);

      const duckMats = { colored: material("#ffffff", .3), dark: material("#172b63", .4), orange: material("#ed9950", .35), white: material("#fffdf5"), gold };
      const indexes = new Map(room.players.map((p, i) => [p.id, i]));
      const rootMatrices = room.players.map(() => new THREE.Matrix4());
      type Part = { mesh: T.InstancedMesh; players: number[]; local: T.Matrix4 };
      const parts: Part[] = [];
      function part(g: T.BufferGeometry, m: T.Material, pos: number[], scale: number[], rot: number[] = [0, 0, 0], predicate = (_: typeof room.players[number]) => true, shade = 1) {
        const selected = room.players.map((p, i) => predicate(p) ? i : -1).filter(i => i >= 0); if (!selected.length) return;
        const inst = new THREE.InstancedMesh(g, m, selected.length); inst.instanceMatrix.setUsage(THREE.DynamicDrawUsage); inst.frustumCulled = false;
        const local = new THREE.Matrix4(); const rotation = new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot as [number, number, number]));
        local.compose(new THREE.Vector3(...pos as [number, number, number]), rotation, new THREE.Vector3(...scale as [number, number, number]));
        if (m === duckMats.colored) selected.forEach((idx, j) => { const skin = SKINS.find(s => s.id === room.players[idx].skin) || SKINS[0]; inst.setColorAt(j, new THREE.Color(skin.color).multiplyScalar(shade)); });
        scene.add(inst); parts.push({ mesh: inst, players: selected, local });
      }
      part(sphere, duckMats.colored, [0, .55, 0], [.72, .48, .47]);
      part(sphere, duckMats.colored, [.48, 1.05, 0], [.38, .38, .35]);
      for (const z of [-1, 1]) {
        part(sphere, duckMats.colored, [-.12, .66, z * .43], [.42, .17, .09], [0, 0, -.12], undefined, .82);
        part(sphere, duckMats.dark, [.64, 1.13, z * .283], [.05, .06, .035]);
        part(sphere, duckMats.white, [.655, 1.15, z * .31], [.016, .02, .012]);
      }
      part(cone, duckMats.colored, [-.63, .75, 0], [.26, .65, .25], [0, 0, .9]);
      part(sphere, duckMats.orange, [.85, .97, 0], [.28, .095, .2]);
      const hat = (name: string) => (p: typeof room.players[number]) => (SKINS.find(s => s.id === p.skin) || SKINS[0]).hat === name;
      part(cylinder, gold, [.45, 1.4, 0], [.31, .15, .31], undefined, hat("crown"));
      for (let i = 0; i < 5; i++) part(cone, gold, [.45 + Math.cos(i * Math.PI * .4) * .26, 1.58, Math.sin(i * Math.PI * .4) * .26], [.09, .25, .09], undefined, hat("crown"));
      part(cylinder, duckMats.white, [.48, 1.44, 0], [.32, .24, .32], undefined, hat("captain"));
      part(box, navy, [.73, 1.36, 0], [.4, .06, .5], undefined, hat("captain"));
      const pink = material("#d4568c");
      for (const z of [-1, 1]) part(sphere, pink, [.46, 1.43, z * .15], [.17, .12, .17], undefined, hat("bow"));
      part(sphere, navy, [.44, 1.4, 0], [.34, .19, .34], undefined, hat("cap"));
      part(box, navy, [.72, 1.37, 0], [.4, .05, .5], undefined, hat("cap"));
      part(torus, pink, [.4, 1.43, 0], [.16, .16, .16], [Math.PI / 2, 0, 0], hat("flower"));
      part(sphere, gold, [.4, 1.44, 0], [.09, .09, .09], undefined, hat("flower"));
      part(box, navy, [.59, 1.15, 0], [.22, .15, .7], undefined, hat("ninja"));
      for (let i = 0; i < 3; i++) part(box, navy, [-.4 + i * .25, .86, 0], [.07, .12, .72], [0, 0, -.25], hat("tiger"));
      part(torus, material("#d56367"), [.38, .78, 0], [.29, .29, .29], [Math.PI / 2, 0, 0], hat("scarf"));
      part(cone, pink, [.45, 1.6, 0], [.29, .65, .29], undefined, hat("party"));
      part(cylinder, material("#aa8d58"), [.45, 1.4, 0], [.44, .08, .44], undefined, hat("explorer"));
      part(cylinder, material("#aa8d58"), [.45, 1.5, 0], [.29, .2, .29], undefined, hat("explorer"));
      const wakeMaterial = new THREE.MeshBasicMaterial({ color: night ? "#8ab5ce" : "#d2f2ee", transparent: true, opacity: .27, depthWrite: false, side: THREE.DoubleSide }); materials.add(wakeMaterial);
      const wake = new THREE.InstancedMesh(geometry(new THREE.RingGeometry(.46, .49, 32)), wakeMaterial, room.count * 2); wake.frustumCulled = false; wake.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(wake);
      const ring = mesh(torus, gold, 0, .12, 0, 1.05, 1.05, 1.05); ring.rotation.x = Math.PI / 2;
      const ownRing = mesh(torus, navy, 0, .13, 0, 1, 1, 1); ownRing.rotation.x = Math.PI / 2;
      const labels = room.players.map(p => {
        const el = document.createElement("div"); el.className = "duck-label"; el.style.display = "none";
        const rank = document.createElement("b"), name = document.createElement("span"); name.textContent = p.name;
        el.appendChild(rank); el.appendChild(name); node.appendChild(el); return { el, rank, x: 0, y: 0, placed: false };
      });
      const lookAt = new THREE.Vector3(), smoothLookAt = new THREE.Vector3(), desired = new THREE.Vector3(), projected = new THREE.Vector3(), transform = new THREE.Matrix4();
      const renderClock = new MotionClock(), epoch = Date.now() - performance.now();
      let lastFrame = performance.now();
      let frame = 0, initialized = false, width = 1, height = 1, renderWidth = 1, renderHeight = 1, frames = 0, lastFps = performance.now();
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const resize = () => {
        // Extend the river behind the glass without changing the main framing.
        width = Math.max(1, node.parentElement!.clientWidth); height = Math.max(1, node.parentElement!.clientHeight);
        renderWidth = Math.max(1, node.clientWidth); renderHeight = Math.max(1, node.clientHeight);
        renderer.setSize(renderWidth, renderHeight, false);
        camera.setViewOffset(width, height, 0, 0, renderWidth, renderHeight);
        configureOverview(overview, width / height, height);
        overview.setViewOffset(width, height, 0, 0, renderWidth, renderHeight);
      };
      const observer = new ResizeObserver(resize); observer.observe(node); observer.observe(node.parentElement!); resize();
      const laneIndex = new Map(race.lanes.map((id, i) => [id, i]));
      const zFor = (id: string) => ((laneIndex.get(id) || 0) / Math.max(1, room.count - 1) - .5) * Math.min(20, Math.max(4, (room.count - 1) * 2.2));
      let cachedRank: ReturnType<typeof standings> = [], rankTime = -100;
      function draw() {
        if (disposed) return;
        const now = performance.now(), dt = Math.min(.1, Math.max(0, (now - lastFrame) / 1000)); lastFrame = now;
        const { camera: mode, ownId, labels: showLabels } = current.current;
        const latest = current.current, activeRace = latest.room.race!;
        const rate = latest.rate ?? 1;
        const targetElapsed = latest.replay ? Math.min(activeRace.duration + activeRace.tail, latest.elapsed + (now - latest.sampledAt) / 1000 * rate)
          : Math.min(activeRace.duration + activeRace.tail, raceElapsed(activeRace, epoch + now + (latest.offset || 0)));
        const elapsed = renderClock.sample(targetElapsed, rate, now, `${latest.replay ? "replay" : "live"}:${latest.seek || 0}`);
        const animationTime = reduced ? 0 : elapsed;
        river.time.value = animationTime;
        if (Math.abs(elapsed - rankTime) > .12 || !cachedRank.length) { cachedRank = standings(current.current.room, elapsed); rankTime = elapsed; }
        const lead = cachedRank[0];
        const winnerId = elapsed >= race.duration ? activeRace.order[0] || lead?.id : undefined;
        const flight = winnerLift(elapsed - race.duration, reduced);
        const focalId = mode === "mine" && ownId && indexes.has(ownId) ? ownId : lead?.id;
        const pack = cachedRank.slice(0, 5);
        const leadX = focalId ? raceWorldX(raceProgress(race, focalId, elapsed)) : 0;
        const packX = pack.reduce((sum, p) => sum + raceWorldX(raceProgress(race, p.id, elapsed)), 0) / Math.max(1, pack.length);
        const focalX = mode === "mine" ? leadX : leadX * .55 + packX * .45;
        const focalZ = mode === "mine" && focalId ? zFor(focalId) : 0;
        const leaderX = lead ? raceWorldX(raceProgress(race, lead.id, elapsed)) : 0;
        const pose = followCameraPose(focalX, focalZ, width < 600);
        desired.set(...pose.position); lookAt.set(...pose.target);
        const cameraEase = initialized && !reduced ? dampFactor(dt, 6) : 1;
        camera.position.lerp(desired, cameraEase); smoothLookAt.lerp(lookAt, cameraEase); camera.up.set(0, 1, 0); camera.lookAt(smoothLookAt); initialized = true;
        const activeCamera = mode === "overview" ? overview : camera;
        const zPositions: number[] = [];
        room.players.forEach((p, i) => {
          const size = room.count > 80 ? .76 : 1.05;
          const launch = 1 - Math.exp(-Math.max(0, elapsed) * 2);
          const progress = raceProgress(race, p.id, elapsed), x = raceWorldX(progress) - 1.13 * size, z = zFor(p.id) + Math.sin(elapsed * .6 + (race.seeds[p.id] % 9)) * .1 * launch;
          const swell = riverHeight(x, z, animationTime);
          const lift = p.id === winnerId ? flight.height : 0;
          zPositions[i] = z; dummy.position.set(x, swell + .075 + lift, z);
          dummy.scale.setScalar(size * (p.id === winnerId ? flight.scale : 1));
          const pitch = (riverHeight(x + .3, z, animationTime) - riverHeight(x - .3, z, animationTime)) / .6;
          const roll = (riverHeight(x, z + .3, animationTime) - riverHeight(x, z - .3, animationTime)) / .6;
          dummy.rotation.set(roll * .55 * launch, Math.sin(animationTime * .9 + i) * .025 * launch, pitch * .55 * launch + (p.id === winnerId ? flight.tilt : 0));
          rootMatrices[i].compose(dummy.position, dummy.quaternion, dummy.scale);
          const velocity = (raceProgress(race, p.id, elapsed + .04) - progress) * LENGTH / .04;
          for (let j = 0; j < 2; j++) {
            const wx = x - .8 - j * .75, spread = 1 + j * .65;
            dummy.position.set(wx, riverHeight(wx, z, animationTime) + .045, z);
            dummy.rotation.set(-Math.PI / 2, 0, 0); dummy.scale.set((1.4 + Math.min(1, velocity * .08)) * spread, lift > .2 ? 0 : .85 * spread, 1); dummy.updateMatrix(); wake.setMatrixAt(i * 2 + j, dummy.matrix);
          }
        });
        parts.forEach(p => { p.players.forEach((idx, j) => { transform.multiplyMatrices(rootMatrices[idx], p.local); p.mesh.setMatrixAt(j, transform); }); p.mesh.instanceMatrix.needsUpdate = true; });
        wake.instanceMatrix.needsUpdate = true;
        const noseOffset = 1.13 * (room.count > 80 ? .76 : 1.05);
        ring.position.set(leaderX - noseOffset, .13, lead ? zFor(lead.id) : 0); ring.visible = !!lead && elapsed >= 0;
        ownRing.visible = !!ownId && indexes.has(ownId); if (ownId && ownRing.visible) ownRing.position.set(raceWorldX(raceProgress(race, ownId, elapsed)) - noseOffset, .14, zFor(ownId));
        renderer.render(scene, activeCamera);
        const picked = new Map(cachedRank.slice(0, width < 600 ? 3 : 5).map((p, i) => [p.id, i + 1]));
        if (ownId) { const ownRank = cachedRank.findIndex(p => p.id === ownId); if (ownRank >= 0) picked.set(ownId, ownRank + 1); }
        const boxes: { x: number; y: number }[] = [];
        room.players.forEach((p, i) => {
          const label = labels[i], place = picked.get(p.id); if (!showLabels || !place) { label.el.style.display = "none"; return; }
          projected.set(raceWorldX(raceProgress(race, p.id, elapsed)) - noseOffset, 2.1 + (p.id === winnerId ? flight.height : 0), zPositions[i]).project(activeCamera);
          let x = (projected.x * .5 + .5) * renderWidth, y = (-projected.y * .5 + .5) * renderHeight;
          const topLimit = height < 400 ? 90 : width < 600 ? 120 : 132, bottomLimit = height - (height < 400 ? 74 : 110);
          if (projected.z > 1 || x < 0 || x > width || y < topLimit || y > bottomLimit) { label.el.style.display = "none"; return; }
          const side = width < 600 ? 90 : 110;
          x = Math.max(side, Math.min(width - side, x));
          while (boxes.some(b => Math.abs(b.x - x) < 140 && Math.abs(b.y - y) < 26)) y -= 28;
          boxes.push({ x, y }); const labelEase = label.placed && !reduced ? dampFactor(dt, 14) : 1;
          label.x += (x - label.x) * labelEase; label.y += (Math.max(topLimit, y) - label.y) * labelEase; label.placed = true;
          label.el.style.display = "flex"; label.el.style.transform = `translate(${label.x}px,${label.y}px) translate(-50%,-100%)`;
          label.el.classList.toggle("mine", p.id === ownId); label.rank.textContent = `${place}${p.id === ownId ? " · Bạn" : ""}`;
        });
        frames++; if (now - lastFps > 1000) { node.dataset.fps = String(Math.round(frames * 1000 / (now - lastFps))); frames = 0; lastFps = now; }
        frame = requestAnimationFrame(draw);
      }
      draw();
      cleanup = () => { cancelAnimationFrame(frame); observer.disconnect(); labels.forEach(l => l.el.remove()); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); renderer.dispose(); renderer.domElement.remove(); };
      if (disposed) cleanup();
    }).catch(() => { if (!disposed) setFallback(true); });
    return () => { disposed = true; cleanup(); };
  }, [props.room.race?.id, props.room.scene, props.quality]);
  return <div className={`race-scene ${props.room.scene === "night" ? "night-scene" : ""}`} ref={mount} role="img" aria-label="Đường đua vịt 3D trực tiếp, kết quả và thứ hạng hiển thị trong bảng cạnh bên">{fallback && <FallbackScene {...props} />}</div>;
}

function FallbackScene({ room, elapsed, ownId }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = canvas.current; if (!c || !room.race) return;
    const width = c.clientWidth, height = c.clientHeight; c.width = width * 2; c.height = height * 2;
    const ctx = c.getContext("2d")!; ctx.scale(2, 2); ctx.fillStyle = "#c8e9ed"; ctx.fillRect(0, 0, width, height);
    const ranking = standings(room, elapsed); const positions = room.players.length;
    room.players.forEach((p, i) => {
      const x = 28 + Math.max(0, Math.min(1.1, raceProgress(room.race!, p.id, elapsed))) * (width - 85), y = 25 + (i % 18) * (height - 50) / Math.min(18, positions);
      ctx.fillStyle = (SKINS.find(s => s.id === p.skin) || SKINS[0]).color; ctx.beginPath(); ctx.ellipse(x, y, 10, 7, 0, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(x + 7, y - 6, 6, 0, Math.PI * 2); ctx.fill();
      if (p.id === ownId || ranking[0]?.id === p.id) { ctx.strokeStyle = "#172b63"; ctx.strokeRect(x - 13, y - 16, 31, 28); }
    });
    ctx.fillStyle = "#172b63"; ctx.fillRect(width - 50, 0, 3, height);
  }, [room, elapsed, ownId]);
  return <><canvas ref={canvas} className="fallback-river" /><span className="fallback-note">Chế độ nhẹ · Thiết bị chưa hỗ trợ WebGL</span></>;
}
