import { env } from "cloudflare:workers";
import { addPlayer, cleanName, durationValue, publicRoom, RaceError, randomInt, startRace, stateOf, type Room } from "../../../lib/race";
export const dynamic = "force-dynamic";
type DBRow = { pin: string; data: string; version: number; expires_at: number };
function json(body: unknown, status = 200) { return Response.json(body, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } }); }
function db() { if (!env.DB) throw new RaceError("Cơ sở dữ liệu chưa được cấu hình.", 503); return env.DB; }
function identity(req: Request) {
  const id = req.headers.get("oai-authenticated-user-id");
  if (!id) throw new RaceError("Vui lòng đăng nhập admin thử nghiệm.", 401);
  // Mock app is owner-private. Replace with a STAR allowlist before public production use.
  return id;
}
async function row(pin: string) {
  if (!/^\d{6}$/.test(pin)) throw new RaceError("PIN gồm 6 chữ số.");
  const value = await db().prepare("SELECT * FROM rooms WHERE pin = ? AND expires_at > ?").bind(pin, Date.now()).first<DBRow>();
  if (!value) throw new RaceError("Không tìm thấy phòng. Hãy kiểm tra PIN hoặc liên hệ admin.", 404);
  return value;
}
async function mutate(pin: string, fn: (room: Room) => void) {
  for (let i = 0; i < 16; i++) {
    const old = await row(pin); const room: Room = JSON.parse(old.data); fn(room);
    const updated = await db().prepare("UPDATE rooms SET data = ?, version = version + 1 WHERE pin = ? AND version = ?").bind(JSON.stringify(room), pin, old.version).run();
    if (updated.meta.changes === 1) return room;
    await new Promise(resolve => setTimeout(resolve, 5 + randomInt(20)));
  }
  throw new RaceError("Phòng đang có nhiều người tham gia. Vui lòng thử lại.", 409);
}
async function hash(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, "0")).join("");
}
async function handle(req: Request) {
  try {
    const url = new URL(req.url); const parts = url.pathname.split("/").filter(Boolean).slice(1);
    if (req.method !== "GET" && req.headers.get("origin") !== url.origin) throw new RaceError("Yêu cầu không hợp lệ.", 403);
    if (req.method === "GET" && parts[0] === "me") return json({ admin: !!req.headers.get("oai-authenticated-user-id"), mock: true });
    if (parts[0] !== "rooms") return json({ error: "Không tìm thấy đường dẫn." }, 404);
    if (req.method === "GET" && !parts[1]) {
      const owner = identity(req);
      const result = await db().prepare("SELECT data FROM rooms WHERE expires_at > ? ORDER BY expires_at DESC LIMIT 100").bind(Date.now()).all<{ data: string }>();
      return json({ rooms: result.results.map(r => JSON.parse(r.data) as Room).filter(r => r.owner === owner && !r.closed).map(r => publicRoom(r)) });
    }
    if (req.method === "GET") return json(publicRoom(JSON.parse((await row(parts[1])).data)));
    if (Number(req.headers.get("content-length") || 0) > 4096) throw new RaceError("Dữ liệu quá lớn.", 413);
    const text = await req.text(); if (text.length > 4096) throw new RaceError("Dữ liệu quá lớn.", 413);
    let body: Record<string, unknown>; try { body = JSON.parse(text || "{}"); } catch { throw new RaceError("Dữ liệu không hợp lệ."); }
    if (req.method === "POST" && !parts[1]) {
      const owner = identity(req); const title = cleanName(body.title, 80); const duration = durationValue(body.duration);
      for (let i = 0; i < 20; i++) {
        const pin = String(100000 + randomInt(900000));
        const room: Room = { pin, title, duration, owner, players: [], race: null, locked: false, closed: false, createdAt: Date.now() };
        const created = await db().prepare("INSERT OR IGNORE INTO rooms (pin, data, version, expires_at) VALUES (?, ?, 1, ?)").bind(pin, JSON.stringify(room), Date.now() + 86400000).run();
        if (created.meta.changes === 1) return json(publicRoom(room), 201);
      }
      throw new RaceError("Chưa tạo được PIN. Vui lòng thử lại.", 503);
    }
    const pin = parts[1]; const action = parts[2];
    if (req.method === "POST" && action === "join") {
      if (typeof body.token !== "string" || !/^[a-f0-9-]{36}$/.test(body.token)) throw new RaceError("Phiên tham gia không hợp lệ. Hãy tải lại trang.");
      const tokenHash = await hash(body.token); const name = cleanName(body.name); const player = { id: crypto.randomUUID(), name, tokenHash, joinedAt: Date.now() };
      const room = await mutate(pin, r => { addPlayer(r, player); });
      return json({ room: publicRoom(room), playerId: room.players.find(p => p.tokenHash === tokenHash)!.id });
    }
    if (req.method === "POST" && action === "leave") {
      const tokenHash = await hash(String(body.token));
      const room = await mutate(pin, r => { if (r.race) throw new RaceError("Không thể rời khi cuộc đua đang diễn ra.", 409); r.players = r.players.filter(p => p.tokenHash !== tokenHash); });
      return json(publicRoom(room));
    }
    const owner = identity(req);
    const room = await mutate(pin, r => {
      if (r.owner !== owner) throw new RaceError("Bạn không có quyền điều khiển phòng này.", 403);
      if (r.closed) throw new RaceError("Phòng đã đóng.", 410);
      if (action === "start") startRace(r);
      else if (action === "settings") { if (r.race) throw new RaceError("Chỉ sửa cài đặt trong phòng chờ.", 409); r.duration = durationValue(body.duration); }
      else if (action === "lock") { if (r.race) throw new RaceError("Cuộc đua đã bắt đầu.", 409); r.locked = !r.locked; }
      else if (action === "remove") { if (r.race) throw new RaceError("Không thể xóa người trong cuộc đua.", 409); r.players = r.players.filter(p => p.id !== body.playerId); }
      else if (action === "reset") { if (!["finished", "waiting"].includes(stateOf(r))) throw new RaceError("Hãy đợi cuộc đua kết thúc.", 409); r.race = null; r.locked = false; }
      else if (action === "close") r.closed = true;
      else throw new RaceError("Thao tác không hợp lệ.", 404);
    });
    return json(publicRoom(room));
  } catch (err) {
    if (err instanceof RaceError) return json({ error: err.message }, err.status);
    console.error("Race API error", err);
    return json({ error: "Máy chủ chưa sẵn sàng. Vui lòng thử lại." }, 503);
  }
}
export const GET = handle;
export const POST = handle;
