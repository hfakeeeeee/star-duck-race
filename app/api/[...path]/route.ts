import { env } from "cloudflare:workers";
import { addPlayer, cleanName, distanceValue, durationValue, endRace, normalizeRoom, pauseRace, publicRoom, RaceError, randomInt, resumeRace, sceneValue, setTestDucks, skinValue, startRace, stateOf, SKINS, type Room } from "../../../lib/race";
import { validateNames } from "../../../lib/import-names";
export const dynamic = "force-dynamic";
type DBRow = { pin: string; data: string; version: number; expires_at: number };
function json(body: unknown, status = 200) { return Response.json(body, { status, headers: { "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff" } }); }
function db() { if (!env.DB) throw new RaceError("Cơ sở dữ liệu chưa được cấu hình.", 503); return env.DB; }
function identity(req: Request) {
  const id = req.headers.get("oai-authenticated-user-id");
  if (!id) throw new RaceError("Vui lòng đăng nhập admin thử nghiệm.", 401);
  // Mock remains owner-private; integrate the STAR allowlist before public deployment.
  return id;
}
async function row(pin: string) {
  if (!/^\d{6}$/.test(pin)) throw new RaceError("PIN gồm 6 chữ số.");
  const value = await db().prepare("SELECT * FROM rooms WHERE pin = ? AND expires_at > ?").bind(pin, Date.now()).first<DBRow>();
  if (!value) throw new RaceError("Không tìm thấy phòng. Hãy kiểm tra PIN hoặc liên hệ admin.", 404);
  return value;
}
async function mutate(pin: string, fn: (room: Room) => void) {
  for (let i = 0; i < 24; i++) {
    const old = await row(pin); const room = normalizeRoom(JSON.parse(old.data)); fn(room);
    const updated = await db().prepare("UPDATE rooms SET data = ?, version = version + 1 WHERE pin = ? AND version = ?").bind(JSON.stringify(room), pin, old.version).run();
    if (updated.meta.changes === 1) return room;
    await new Promise(resolve => setTimeout(resolve, 5 + randomInt(35)));
  }
  throw new RaceError("Phòng đang có nhiều người tham gia. Vui lòng thử lại.", 409);
}
async function hash(value: unknown) {
  if (typeof value !== "string" || !/^[a-f0-9-]{36}$/.test(value)) throw new RaceError("Phiên tham gia không hợp lệ. Hãy tải lại trang.");
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
    if (req.method === "GET" && parts.length === 2) return json(publicRoom(JSON.parse((await row(parts[1])).data)));
    if (req.method !== "POST") throw new RaceError("Không tìm thấy đường dẫn.", 404);
    if (Number(req.headers.get("content-length") || 0) > 64000) throw new RaceError("Dữ liệu quá lớn.", 413);
    const text = await req.text(); if (text.length > 64000) throw new RaceError("Dữ liệu quá lớn.", 413);
    let body: Record<string, unknown>; try { body = JSON.parse(text || "{}"); } catch { throw new RaceError("Dữ liệu không hợp lệ."); }
    if (!body || typeof body !== "object" || Array.isArray(body)) throw new RaceError("Dữ liệu không hợp lệ.");
    if (!parts[1]) {
      const owner = identity(req); const title = cleanName(body.title, 80); const duration = durationValue(body.duration);
      for (let i = 0; i < 20; i++) {
        const pin = String(100000 + randomInt(900000));
        const room: Room = { pin, title, duration, owner, players: [], race: null, locked: false, closed: false, createdAt: Date.now(), scene: sceneValue(body.scene), distance: body.distance === undefined ? 300 : distanceValue(body.distance), reactions: [] };
        if (body.testCount !== undefined) setTestDucks(room, body.testCount);
        const created = await db().prepare("INSERT OR IGNORE INTO rooms (pin, data, version, expires_at) VALUES (?, ?, 1, ?)").bind(pin, JSON.stringify(room), Date.now() + 86400000).run();
        if (created.meta.changes === 1) return json(publicRoom(room), 201);
      }
      throw new RaceError("Chưa tạo được PIN. Vui lòng thử lại.", 503);
    }
    const pin = parts[1]; const action = parts[2];
    if (["join", "leave", "skin", "react"].includes(action)) {
      const tokenHash = await hash(body.token);
      let playerId = "";
      const room = await mutate(pin, r => {
        if (r.closed) throw new RaceError("Phòng đã đóng.", 410);
        if (action === "join") {
          const player = addPlayer(r, { id: crypto.randomUUID(), name: cleanName(body.name), tokenHash, skin: skinValue(body.skin), joinedAt: Date.now() }); playerId = player.id;
        } else {
          const player = r.players.find(p => p.tokenHash === tokenHash);
          if (!player) throw new RaceError("Bạn không còn trong phòng này.", 403);
          if (action === "react") {
            if (!["👏", "🔥", "⭐", "🦆"].includes(String(body.kind))) throw new RaceError("Biểu cảm không hợp lệ.");
            const now = Date.now(); if (now - (player.lastReactAt || 0) < 1500) throw new RaceError("Chờ một chút trước khi cổ vũ tiếp nhé.", 429);
            player.lastReactAt = now; r.reactions = [...(r.reactions || []).filter(v => now - v.at < 6000), { id: crypto.randomUUID(), playerId: player.id, kind: String(body.kind), at: now }].slice(-24);
          } else {
            if (r.race) throw new RaceError("Chỉ đổi vịt hoặc rời phòng giữa các lượt đua.", 409);
            if (action === "leave") r.players = r.players.filter(p => p.id !== player.id);
            else player.skin = skinValue(body.skin);
          }
        }
      });
      return json(action === "join" ? { room: publicRoom(room), playerId } : publicRoom(room));
    }
    const owner = identity(req);
    const room = await mutate(pin, r => {
      if (r.owner !== owner) throw new RaceError("Bạn không có quyền điều khiển phòng này.", 403);
      if (r.closed) throw new RaceError("Phòng đã đóng.", 410);
      if (action === "start") startRace(r);
      else if (action === "pause") pauseRace(r);
      else if (action === "resume") resumeRace(r);
      else if (action === "finish") endRace(r);
      else if (action === "test-ducks") setTestDucks(r, body.count);
      else if (action === "settings") {
        if (r.race) throw new RaceError("Chỉ sửa cài đặt trong phòng chờ.", 409);
        if (body.duration !== undefined) r.duration = durationValue(body.duration);
        if (body.scene !== undefined) r.scene = sceneValue(body.scene);
        if (body.distance !== undefined) r.distance = distanceValue(body.distance);
        if (body.testCount !== undefined) setTestDucks(r, body.testCount);
      } else if (action === "import") {
        if (r.race || r.locked) throw new RaceError("Hãy mở phòng chờ trước khi thêm danh sách.", 409);
        if (!Array.isArray(body.names)) throw new RaceError("Danh sách không hợp lệ.");
        const names = validateNames(body.names);
        if (r.players.length + names.length > 200) throw new RaceError(`Phòng chỉ còn ${200 - r.players.length} chỗ.`, 409);
        for (const name of names) addPlayer(r, { id: crypto.randomUUID(), name, tokenHash: crypto.randomUUID(), skin: SKINS[r.players.length % SKINS.length].id, joinedAt: Date.now() });
      } else if (action === "lock") { if (r.race) throw new RaceError("Cuộc đua đã bắt đầu.", 409); r.locked = !r.locked; }
      else if (action === "remove") { if (r.race) throw new RaceError("Không thể xóa người trong cuộc đua.", 409); r.players = r.players.filter(p => p.id !== body.playerId); }
      else if (action === "reset") {
        if (!["finished", "waiting"].includes(stateOf(r))) throw new RaceError("Hãy đợi cuộc đua kết thúc.", 409);
        if (body.removeWinner && r.race) r.players = r.players.filter(p => p.id !== r.race!.order[0]);
        r.race = null; r.locked = false; r.reactions = [];
      } else if (action === "close") r.closed = true;
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
