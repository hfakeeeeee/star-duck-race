"use client";
import { useEffect, useRef, useState } from "react";
import type * as T from "three";
import { raceProgress, SKINS, standings, type PublicRoom } from "../lib/race";

export type CameraMode = "follow" | "overview" | "mine";
export type Quality = "auto" | "low";
const LENGTH = 160;
type Props = { room: PublicRoom; elapsed: number; ownId?: string; camera: CameraMode; quality: Quality; labels: boolean; rate?: number };

export default function RaceScene(props: Props) {
  const mount = useRef<HTMLDivElement>(null); const current = useRef({ ...props, sampledAt: 0 });
  const [fallback, setFallback] = useState(false);
  useEffect(() => { current.current = { ...props, sampledAt: performance.now() }; });
  useEffect(() => {
    const node = mount.current!; if (!node || !props.room.race) return;
    let disposed = false, cleanup = () => {};
    void import("three").then(THREE => {
      if (disposed) return;
      let renderer: T.WebGLRenderer;
      try { renderer = new THREE.WebGLRenderer({ antialias: props.quality !== "low", alpha: false, powerPreference: "high-performance" }); }
      catch { setFallback(true); return; }
      const room = current.current.room, race = room.race!;
      const winter = room.scene === "winter", sunset = room.scene === "sunset", stadium = room.scene === "stadium";
      renderer.setPixelRatio(Math.min(devicePixelRatio || 1, props.quality === "low" ? 1 : 1.5));
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.2;
      node.insertBefore(renderer.domElement, node.firstChild); node.dataset.renderer = "webgl";
      const scene = new THREE.Scene();
      const sky = sunset ? "#f1c4b4" : winter ? "#b7d5ed" : "#c7e8f5";
      scene.background = new THREE.Color(sky); scene.fog = new THREE.Fog(sky, 180, 480);
      const camera = new THREE.PerspectiveCamera(44, 1, .1, 700);
      scene.add(new THREE.HemisphereLight(sunset ? 0xffede0 : 0xffffff, 0x6a9a8e, 2.8));
      const sun = new THREE.DirectionalLight(sunset ? 0xffd1a5 : 0xfff3d9, 2.7); sun.position.set(-40, 70, 30); scene.add(sun);
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
      const grass = material(winter ? "#edf5fc" : sunset ? "#899c76" : "#8bbe80");
      mesh(box, grass, 80, -.5, -33, 240, 1, 40); mesh(box, grass, 80, -.5, 33, 240, 1, 40);
      const rim = material(winter ? "#d4e8f5" : "#d2c9a9");
      mesh(box, rim, 80, -.1, -13.8, 240, .5, 1.6); mesh(box, rim, 80, -.1, 13.8, 240, .5, 1.6);
      const waterGeometry = geometry(new THREE.PlaneGeometry(240, 26, 100, 16)); waterGeometry.rotateX(-Math.PI / 2);
      const water = material(sunset ? "#49a8ba" : winter ? "#5bb7d6" : "#39aebb", .27);
      let timeUniform: { value: number } | undefined;
      water.onBeforeCompile = shader => {
        timeUniform = { value: 0 }; shader.uniforms.uRaceTime = timeUniform;
        shader.vertexShader = "uniform float uRaceTime;\n" + shader.vertexShader.replace("#include <begin_vertex>", "#include <begin_vertex>\ntransformed.y += sin(position.x * 0.8 + uRaceTime * 1.3) * 0.055 + cos(position.z * 1.2 + uRaceTime) * 0.04;");
      };
      mesh(waterGeometry, water, 80, -.04, 0);
      const dummy = new THREE.Object3D();
      const foamMaterial = material("#bce9ed");
      const foam = new THREE.InstancedMesh(box, foamMaterial, 130); foam.instanceMatrix.setUsage(THREE.DynamicDrawUsage); scene.add(foam);
      const bark = material("#94735a"), leaves = material(winter ? "#3b8475" : "#4e966f"), paleLeaves = material(winter ? "#ffffff" : "#70ab79");
      if (!stadium) {
        for (let i = 0; i < 36; i++) {
          const x = -20 + (i % 18) * 13.2, z = (i < 18 ? -1 : 1) * (18 + i % 3 * 3);
          const h = 3.5 + i % 4 * .5;
          mesh(cylinder, bark, x, h * .32, z, .28, h * .65, .28);
          mesh(cone, leaves, x, h * .8, z, 1.7, h, 1.7);
          mesh(cone, paleLeaves, x, h * 1.1, z, 1.25, h * .65, 1.25);
        }
        const mountain = material(sunset ? "#b7a49a" : winter ? "#9ebbd2" : "#aacac1");
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
      for (let i = 0; i < 26; i++) for (let j = 0; j < 2; j++) mesh(box, (i + j) % 2 ? navy : white, LENGTH + j * .55, .08, -12.5 + i, .55, .03, 1);
      for (let i = 0; i < 5; i++) mesh(box, i % 2 ? gold : navy, -.6 * i, .08, -12.5, .3, .03, 25);

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
      const wake = new THREE.InstancedMesh(geometry(new THREE.RingGeometry(.6, .65, 18, 1, 0, Math.PI * 1.3)), material("#b8e7e9"), room.count); wake.frustumCulled = false; scene.add(wake);
      const ring = mesh(torus, gold, 0, .12, 0, 1.05, 1.05, 1.05); ring.rotation.x = Math.PI / 2;
      const ownRing = mesh(torus, navy, 0, .13, 0, 1, 1, 1); ownRing.rotation.x = Math.PI / 2;
      const labels = room.players.map(p => {
        const el = document.createElement("div"); el.className = "duck-label"; el.style.display = "none";
        const rank = document.createElement("b"), name = document.createElement("span"); name.textContent = p.name;
        el.appendChild(rank); el.appendChild(name); node.appendChild(el); return { el, rank };
      });
      const lookAt = new THREE.Vector3(), desired = new THREE.Vector3(), projected = new THREE.Vector3(), transform = new THREE.Matrix4();
      let frame = 0, initialized = false, width = 1, height = 1, frames = 0, lastFps = performance.now();
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const resize = () => { width = node.clientWidth; height = node.clientHeight; renderer.setSize(width, height, false); camera.aspect = width / Math.max(1, height); camera.updateProjectionMatrix(); };
      const observer = new ResizeObserver(resize); observer.observe(node); resize();
      const laneIndex = new Map(race.lanes.map((id, i) => [id, i]));
      const zFor = (id: string) => { const i = laneIndex.get(id) || 0; const lanes = Math.min(18, Math.max(4, room.count)); return ((i % lanes) / Math.max(1, lanes - 1) - .5) * 20 + Math.floor(i / lanes) * .035; };
      let cachedRank: ReturnType<typeof standings> = [], rankTime = -100;
      function draw() {
        if (disposed) return;
        const { camera: mode, ownId, labels: showLabels } = current.current;
        const elapsed = current.current.elapsed + (performance.now() - current.current.sampledAt) / 1000 * (current.current.rate ?? 1);
        const animationTime = reduced ? 0 : elapsed;
        if (timeUniform) timeUniform.value = animationTime;
        if (Math.abs(elapsed - rankTime) > .12 || !cachedRank.length) { cachedRank = standings(current.current.room, elapsed); rankTime = elapsed; }
        const lead = cachedRank[0];
        const focalId = mode === "mine" && ownId && indexes.has(ownId) ? ownId : lead?.id;
        const focalX = focalId ? raceProgress(race, focalId, elapsed) * LENGTH : 0;
        const focalZ = mode === "mine" && focalId ? zFor(focalId) : 0;
        const leaderX = lead ? raceProgress(race, lead.id, elapsed) * LENGTH : 0;
        if (mode === "overview") { desired.set(75, width < 600 ? 155 : 100, width < 600 ? 40 : 104); lookAt.set(80, 0, 0); }
        else { const x = Math.min(LENGTH + 7, Math.max(-1, focalX)); desired.set(x - (width < 600 ? 10 : 16), width < 600 ? 27 : 19, focalZ + (width < 600 ? 34 : 30)); lookAt.set(x + (width < 600 ? 1 : 9), .2, focalZ); }
        camera.position.lerp(desired, initialized && !reduced ? .075 : 1); camera.lookAt(lookAt); initialized = true;
        const zPositions: number[] = [];
        room.players.forEach((p, i) => {
          const size = room.count > 80 ? .76 : 1.05;
          const progress = raceProgress(race, p.id, elapsed), x = progress * LENGTH - 1.13 * size, z = zFor(p.id) + Math.sin(elapsed * .6 + (race.seeds[p.id] % 9)) * .1;
          zPositions[i] = z; dummy.position.set(x, Math.sin(animationTime * 3.5 + i) * .045 + .03, z);
          dummy.scale.setScalar(size);
          dummy.rotation.set(Math.sin(animationTime * 2 + i) * .025, Math.sin(animationTime * .9 + i) * .04, Math.sin(animationTime * 3 + i) * .025);
          rootMatrices[i].compose(dummy.position, dummy.quaternion, dummy.scale);
          dummy.position.set(x - .4, .05, z); dummy.rotation.set(-Math.PI / 2, 0, -.4); dummy.scale.set(1.4, .6, 1); dummy.updateMatrix(); wake.setMatrixAt(i, dummy.matrix);
        });
        parts.forEach(p => { p.players.forEach((idx, j) => { transform.multiplyMatrices(rootMatrices[idx], p.local); p.mesh.setMatrixAt(j, transform); }); p.mesh.instanceMatrix.needsUpdate = true; });
        wake.instanceMatrix.needsUpdate = true;
        for (let i = 0; i < 130; i++) { const x = -35 + ((i * 7.31 - animationTime * 1.2) % 235 + 235) % 235; dummy.position.set(x, .065, -12 + (i * 1.71) % 24); dummy.rotation.set(0, 0, 0); dummy.scale.set(.5 + i % 4 * .25, .012, .035); dummy.updateMatrix(); foam.setMatrixAt(i, dummy.matrix); } foam.instanceMatrix.needsUpdate = true;
        const noseOffset = 1.13 * (room.count > 80 ? .76 : 1.05);
        ring.position.set(leaderX - noseOffset, .13, lead ? zFor(lead.id) : 0); ring.visible = !!lead && elapsed >= 0;
        ownRing.visible = !!ownId && indexes.has(ownId); if (ownId && ownRing.visible) ownRing.position.set(raceProgress(race, ownId, elapsed) * LENGTH - noseOffset, .14, zFor(ownId));
        renderer.render(scene, camera);
        const picked = new Map(cachedRank.slice(0, width < 600 ? 3 : 5).map((p, i) => [p.id, i + 1]));
        if (ownId) { const ownRank = cachedRank.findIndex(p => p.id === ownId); if (ownRank >= 0) picked.set(ownId, ownRank + 1); }
        const boxes: { x: number; y: number }[] = [];
        room.players.forEach((p, i) => {
          const label = labels[i], place = picked.get(p.id); if (!showLabels || !place) { label.el.style.display = "none"; return; }
          projected.set(raceProgress(race, p.id, elapsed) * LENGTH - noseOffset, 2.1, zPositions[i]).project(camera);
          let x = (projected.x * .5 + .5) * width, y = (-projected.y * .5 + .5) * height;
          if (projected.z > 1 || x < 0 || x > width || y < 15 || y > height - 20) { label.el.style.display = "none"; return; }
          x = Math.max(80, Math.min(width - 80, x));
          while (boxes.some(b => Math.abs(b.x - x) < 140 && Math.abs(b.y - y) < 26)) y -= 28;
          boxes.push({ x, y }); label.el.style.display = "flex"; label.el.style.transform = `translate(${x}px,${Math.max(18, y)}px) translate(-50%,-100%)`;
          label.el.classList.toggle("mine", p.id === ownId); label.rank.textContent = `${place}${p.id === ownId ? " · Bạn" : ""}`;
        });
        frames++; if (performance.now() - lastFps > 1000) { node.dataset.fps = String(Math.round(frames * 1000 / (performance.now() - lastFps))); frames = 0; lastFps = performance.now(); }
        frame = requestAnimationFrame(draw);
      }
      draw();
      cleanup = () => { cancelAnimationFrame(frame); observer.disconnect(); labels.forEach(l => l.el.remove()); geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose()); renderer.dispose(); renderer.domElement.remove(); };
      if (disposed) cleanup();
    }).catch(() => { if (!disposed) setFallback(true); });
    return () => { disposed = true; cleanup(); };
  }, [props.room.race?.id, props.room.scene, props.quality]);
  return <div className="race-scene" ref={mount} role="img" aria-label="Đường đua vịt 3D trực tiếp, kết quả và thứ hạng hiển thị trong bảng cạnh bên">{fallback && <FallbackScene {...props} />}</div>;
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
