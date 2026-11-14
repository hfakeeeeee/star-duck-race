export type Player = { id: string; name: string; tokenHash: string; joinedAt: number };
export type Race = { id: string; startAt: number; duration: number; order: string[]; seeds: Record<string, number> };
export type Room = { pin: string; title: string; owner: string; duration: number; locked: boolean; closed: boolean; players: Player[]; race: Race | null; createdAt: number };
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
export function stateOf(room: Room, now = Date.now()) {
  if (room.closed) return "closed";
  if (!room.race) return "waiting";
  if (now < room.race.startAt) return "countdown";
  return now < room.race.startAt + room.race.duration * 1000 ? "racing" : "finished";
}
export function addPlayer(room: Room, player: Player) {
  if (room.closed) throw new RaceError("Phòng đã đóng.", 410);
  const existing = room.players.find(p => p.tokenHash === player.tokenHash);
  if (existing) return existing;
  if (room.race || room.locked) throw new RaceError("Phòng đã khóa hoặc cuộc đua đã bắt đầu.", 409);
  if (room.players.length >= 200) throw new RaceError("Phòng đã đủ 200 người.", 409);
  if (room.players.some(p => p.name.toLocaleLowerCase("vi") === player.name.toLocaleLowerCase("vi"))) throw new RaceError("Tên này đã có người dùng. Hãy thêm lớp hoặc số để phân biệt.", 409);
  room.players.push(player);
  return player;
}
export function startRace(room: Room, now = Date.now()) {
  if (room.closed || room.race) throw new RaceError("Hãy đưa phòng về trạng thái chờ trước khi bắt đầu.", 409);
  if (room.players.length < 2) throw new RaceError("Cần ít nhất 2 người để bắt đầu.", 409);
  room.locked = true;
  room.race = { id: crypto.randomUUID(), startAt: now + 4000, duration: room.duration, order: shuffle(room.players.map(p => p.id)), seeds: Object.fromEntries(room.players.map(p => [p.id, randomInt(1000000)])) };
}
export function publicRoom(room: Room, now = Date.now()) {
  const state = stateOf(room, now);
  const reveal = !!room.race && now >= room.race.startAt + room.race.duration * 1000 - 3000;
  return { pin: room.pin, title: room.title, duration: room.duration, locked: room.locked, state, count: room.players.length, capacity: 200, serverNow: now,
    players: room.players.map(({ id, name, joinedAt }) => ({ id, name, joinedAt })),
    race: room.race ? { id: room.race.id, startAt: room.race.startAt, duration: room.race.duration, seeds: room.race.seeds, order: reveal ? room.race.order : [] } : null };
}
export type PublicRoom = ReturnType<typeof publicRoom>;
export function duckProgress(elapsed: number, duration: number, seed: number, rank = -1, count = 1) {
  const t = Math.max(0, Math.min(1, elapsed / duration));
  const phase = seed % 100 / 10;
  const cruising = Math.max(0, Math.min(.97, t * .88 + Math.sin(t * 15 + phase) * Math.sin(Math.PI * t) * .085));
  if (rank < 0) return cruising;
  const target = rank === 0 ? 1 : .985 - rank / Math.max(count, 1) * .13;
  const blend = Math.max(0, Math.min(1, (elapsed - (duration - 3)) / 3));
  return cruising * (1 - blend) + target * blend;
}
