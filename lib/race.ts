export const SKINS = [
  { id: "sunny", name: "Nắng vàng", color: "#f5ce53", hat: "none" },
  { id: "star", name: "Ngôi sao STAR", color: "#f3d386", hat: "crown" },
  { id: "captain", name: "Thuyền trưởng", color: "#fff3d1", hat: "captain" },
  { id: "rose", name: "Hồng đào", color: "#f19cba", hat: "bow" },
  { id: "mint", name: "Bạc hà", color: "#87d6bd", hat: "none" },
  { id: "sky", name: "Bầu trời", color: "#8dbef0", hat: "cap" },
  { id: "lavender", name: "Oải hương", color: "#b9a0e5", hat: "flower" },
  { id: "ninja", name: "Ninja", color: "#58617b", hat: "ninja" },
  { id: "tiger", name: "Hổ con", color: "#eda55c", hat: "tiger" },
  { id: "snow", name: "Tuyết nhỏ", color: "#e9f4fa", hat: "scarf" },
  { id: "party", name: "Tiệc vui", color: "#f3b5cf", hat: "party" },
  { id: "forest", name: "Nhà thám hiểm", color: "#a6c787", hat: "explorer" },
] as const;
export type SkinId = typeof SKINS[number]["id"];
export const SCENES = [
  { id: "park", name: "Công viên STAR", icon: "🌳" },
  { id: "stadium", name: "Sân vận động", icon: "🏟️" },
  { id: "sunset", name: "Hoàng hôn", icon: "🌅" },
  { id: "winter", name: "Giáng sinh", icon: "🎄" },
  { id: "night", name: "Đêm ánh sao", icon: "🌙" },
] as const;
export type SceneId = typeof SCENES[number]["id"];
export type Player = { id: string; name: string; tokenHash: string; joinedAt: number; skin?: SkinId; lastReactAt?: number; isTest?: boolean };
export type Reaction = { id: string; playerId: string; kind: string; at: number };
export type Race = {
  id: string; startAt: number; duration: number; order: string[]; seeds: Record<string, number>;
  normalizer: number; slowest: number; tail: number; lanes: string[]; model?: number;
  pausedAt: number | null; pausedMs: number; endedEarly: boolean;
};
export type Room = { pin: string; title: string; owner: string; duration: number; locked: boolean; closed: boolean; players: Player[]; race: Race | null; createdAt: number; scene?: SceneId; distance?: number; reactions?: Reaction[] };
export class RaceError extends Error {
  status: number;
  constructor(message: string, status = 400) { super(message); this.status = status; }
}
export function randomInt(max: number) {
  const bound = Math.floor(4294967296 / max) * max;
  const n = new Uint32Array(1);
  do { crypto.getRandomValues(n); } while (n[0] >= bound);
  return n[0] % max;
}
export function shuffle<T>(items: T[]) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) { const j = randomInt(i + 1); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}
export function cleanName(value: unknown, max = 40) {
  if (typeof value !== "string") throw new RaceError("Vui lòng nhập tên.");
  const name = value.normalize("NFC").replace(/[\p{Cc}\p{Cf}]/gu, "").trim().replace(/\s+/g, " ");
  if (!name || name.length > max) throw new RaceError(`Tên cần có từ 1 đến ${max} ký tự.`);
  return name;
}
export function durationValue(value: unknown) {
  if (typeof value !== "number" || !Number.isInteger(value) || value < 10 || value > 1800) throw new RaceError("Thời lượng phải từ 10 đến 1.800 giây.");
  return value;
}
export function skinValue(value: unknown): SkinId { return SKINS.some(s => s.id === value) ? value as SkinId : "sunny"; }
export function sceneValue(value: unknown): SceneId { return SCENES.some(s => s.id === value) ? value as SceneId : "park"; }
export function distanceValue(value: unknown) { if (![100, 300, 600, 900].includes(Number(value))) throw new RaceError("Chọn đường đua 100, 300, 600 hoặc 900 m."); return Number(value); }

// Analytic integral of strictly positive current/surge velocities. Seeds are independent
// of names, skins and lanes; all devices evaluate the same trajectory without a frame loop.
export function currentDistance(t: number, seed: number, model = 3) {
  const p = (seed % 997) / 997 * Math.PI * 2;
  const q = (Math.floor(seed / 997) % 991) / 991 * Math.PI * 2;
  const r = (Math.floor(seed / 988027) % 983) / 983 * Math.PI * 2;
  const f = 5 + seed % 11, g = 19 + seed % 17;
  // Keep the previous kernel for stored races. New races retain at least 66.5%
  // of cruising speed; passing comes from a surge rather than a near-stop.
  const [a, b, c] = model < 3 ? [.55, .25, .15] : [.18, .10, .055];
  return t + a * (Math.cos(p) - Math.cos(p + f * t)) / f + b * (Math.cos(q) - Math.cos(q + g * t)) / g + c * (Math.sin(r + 43 * t) - Math.sin(r)) / 43;
}
export function raceElapsed(race: Pick<Race, "startAt" | "pausedAt" | "pausedMs" | "endedEarly" | "duration" | "tail">, now = Date.now()) {
  return race.endedEarly ? race.duration + race.tail : Math.max(-4, ((race.pausedAt ?? now) - race.startAt - (race.pausedMs || 0)) / 1000);
}
export function finishTime(race: Pick<Race, "duration" | "seeds" | "normalizer" | "slowest" | "tail" | "model">, id: string) {
  const progress = currentDistance(1, race.seeds[id] || 0, race.model ?? 2) / race.normalizer;
  return race.duration + race.tail * Math.max(0, 1 - progress) / Math.max(.000001, 1 - race.slowest);
}
export function raceProgress(race: Pick<Race, "duration" | "seeds" | "normalizer" | "slowest" | "tail" | "model">, id: string, elapsed: number) {
  const seed = race.seeds[id] || 0;
  if (elapsed <= 0) return 0;
  if (elapsed <= race.duration) {
    // Shared, smooth launch from rest; the normalization preserves the exact timer.
    const launch = (s: number) => s - .35 * (1 - Math.exp(-s / .35));
    const t = race.model === 3 ? launch(elapsed) / launch(race.duration) : elapsed / race.duration;
    return currentDistance(t, seed, race.model ?? 2) / race.normalizer;
  }
  const end = finishTime(race, id);
  if (elapsed >= end) return Math.min(1.12, 1 + (elapsed - end) * .018);
  const atDeadline = currentDistance(1, seed, race.model ?? 2) / race.normalizer;
  return atDeadline + (1 - atDeadline) * ((elapsed - race.duration) / Math.max(.000001, end - race.duration));
}
export function buildRace(players: Player[], duration: number, now = Date.now()): Race {
  const used = new Set<number>(); const seeds: Record<string, number> = {};
  for (const p of players) { let s: number; do { s = randomInt(4294967295); } while (used.has(s)); used.add(s); seeds[p.id] = s; }
  const scores = players.map(p => ({ id: p.id, score: currentDistance(1, seeds[p.id]), seed: seeds[p.id] })).sort((a, b) => b.score - a.score || a.seed - b.seed);
  return { id: crypto.randomUUID(), model: 3, startAt: now + 4000, duration, seeds, normalizer: scores[0].score, slowest: scores.at(-1)!.score / scores[0].score,
    order: scores.map(s => s.id), tail: Math.min(8, 2 + players.length * .035), lanes: shuffle(players.map(p => p.id)), pausedAt: null, pausedMs: 0, endedEarly: false };
}
export function normalizeRoom(room: Room): Room {
  room.scene ||= "park"; room.distance ||= 300; room.reactions ||= [];
  room.players.forEach((p, i) => { p.skin ||= SKINS[i % SKINS.length].id; });
  if (room.race && !room.race.normalizer) {
    const old = room.race;
    const totals = Object.values(old.seeds).map(s => currentDistance(1, s, 2));
    const normalizer = Math.max(...totals, 1);
    room.race = { ...old, normalizer, slowest: Math.min(...totals, 1) / normalizer, tail: 3,
      lanes: [...old.order], pausedAt: null, pausedMs: 0, endedEarly: true };
  }
  return room;
}
export function stateOf(room: Room, now = Date.now()) {
  if (room.closed) return "closed";
  if (!room.race) return "waiting";
  const elapsed = raceElapsed(room.race, now);
  if (elapsed < 0) return "countdown";
  if (room.race.pausedAt !== null) return "paused";
  if (elapsed < room.race.duration) return "racing";
  return elapsed < room.race.duration + room.race.tail - .000001 ? "settling" : "finished";
}
export function addPlayer(room: Room, player: Player) {
  if (room.closed) throw new RaceError("Phòng đã đóng.", 410);
  const existing = room.players.find(p => p.tokenHash === player.tokenHash);
  if (existing) return existing;
  if (room.race || room.locked) throw new RaceError("Phòng đã khóa hoặc cuộc đua đã bắt đầu.", 409);
  if (room.players.length >= 200) throw new RaceError("Phòng đã đủ 200 người.", 409);
  if (room.players.some(p => p.name.toLocaleLowerCase("vi") === player.name.toLocaleLowerCase("vi"))) throw new RaceError("Tên này đã có người dùng. Hãy thêm lớp hoặc số để phân biệt.", 409);
  room.players.push({ ...player, skin: skinValue(player.skin) });
  return player;
}
export function startRace(room: Room, now = Date.now()) {
  if (room.closed || room.race) throw new RaceError("Hãy đưa phòng về trạng thái chờ trước khi bắt đầu.", 409);
  if (room.players.length < 2) throw new RaceError("Cần ít nhất 2 người để bắt đầu.", 409);
  room.locked = true; room.race = buildRace(room.players, room.duration, now); room.reactions = [];
}
export function setTestDucks(room: Room, count: unknown) {
  if (room.closed) throw new RaceError("Phòng đã đóng.", 410);
  if (room.race) throw new RaceError("Chỉ thay đổi vịt thử nghiệm trong phòng chờ.", 409);
  if (typeof count !== "number" || !Number.isInteger(count) || count < 0 || count > 200) throw new RaceError("Số vịt thử nghiệm phải là số nguyên từ 0 đến 200.");
  const people = room.players.filter(p => !p.isTest), existing = room.players.filter(p => p.isTest);
  if (people.length + count > 200) throw new RaceError(`Phòng có ${people.length} người thật, chỉ thêm được ${200 - people.length} vịt thử nghiệm.`, 409);
  const bots = existing.slice(0, count), names = new Set([...people, ...bots].map(p => p.name.toLocaleLowerCase("vi")));
  let index = 1;
  while (bots.length < count) {
    const name = `Vịt thử ${String(index++).padStart(3, "0")}`;
    if (names.has(name.toLocaleLowerCase("vi"))) continue;
    names.add(name.toLocaleLowerCase("vi"));
    bots.push({ id: crypto.randomUUID(), name, tokenHash: `test:${crypto.randomUUID()}`, joinedAt: Date.now(), skin: SKINS[bots.length % SKINS.length].id, isTest: true });
  }
  room.players = [...people, ...bots];
}
export function pauseRace(room: Room, now = Date.now()) {
  if (!room.race || !["racing", "settling"].includes(stateOf(room, now))) throw new RaceError("Chỉ tạm dừng khi cuộc đua đang diễn ra.", 409);
  room.race.pausedAt = now;
}
export function resumeRace(room: Room, now = Date.now()) {
  if (!room.race || room.race.pausedAt === null) throw new RaceError("Cuộc đua chưa tạm dừng.", 409);
  room.race.pausedMs += now - room.race.pausedAt; room.race.pausedAt = null;
}
export function endRace(room: Room) {
  if (!room.race || room.race.endedEarly) throw new RaceError("Cuộc đua chưa bắt đầu hoặc đã kết thúc.", 409);
  room.race.pausedAt = null; room.race.endedEarly = true;
}
export function publicRoom(room: Room, now = Date.now()) {
  normalizeRoom(room); const state = stateOf(room, now); const r = room.race;
  const reveal = !!r && raceElapsed(r, now) >= r.duration;
  return { pin: room.pin, title: room.title, duration: room.duration, locked: room.locked, state, count: room.players.length, capacity: 200, serverNow: now, scene: room.scene!, distance: room.distance!,
    players: room.players.map(({ id, name, joinedAt, skin, isTest }) => ({ id, name, joinedAt, skin: skin!, isTest: isTest === true })),
    reactions: (room.reactions || []).filter(v => now - v.at < 6000),
    race: r ? { id: r.id, model: r.model ?? 2, startAt: r.startAt, duration: r.duration, seeds: r.seeds, normalizer: r.normalizer, slowest: r.slowest, tail: r.tail, lanes: r.lanes,
      pausedAt: r.pausedAt, pausedMs: r.pausedMs, endedEarly: r.endedEarly, order: reveal ? r.order : [], finishes: reveal ? Object.fromEntries(r.order.map(id => [id, finishTime(r, id)])) : {} as Record<string, number> } : null };
}
export type PublicRoom = ReturnType<typeof publicRoom>;
export function standings(room: PublicRoom, elapsed: number) {
  if (!room.race) return [];
  const race = room.race;
  return room.players.map(p => ({ ...p, progress: raceProgress(race, p.id, elapsed), finish: finishTime(race, p.id) }))
    .sort((a, b) => a.progress >= 1 && b.progress >= 1 ? a.finish - b.finish : b.progress - a.progress || a.id.localeCompare(b.id));
}
