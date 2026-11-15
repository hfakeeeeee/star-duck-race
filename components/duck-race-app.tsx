"use client";
import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronRight, Copy, Flag, LockKeyhole, Maximize, Minimize, MonitorPlay, Play, Plus, QrCode, Search, ShieldCheck, SlidersHorizontal, Star, Users, X } from "lucide-react";
import QRCode from "qrcode";
import { SCENES, type PublicRoom, type SceneId, type SkinId } from "../lib/race";
import Duck from "./duck";
import SkinPicker from "./skin-picker";
import ImportPlayers from "./import-players";
import Dialog from "./dialog";
import RaceStage, { formatClock } from "./race-stage";
import RoomSettings from "./room-settings";
import "./viewport-shell.css";

type Membership = { token: string; playerId: string };
async function api<T = PublicRoom>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/${path}`, { method: body === undefined ? "GET" : "POST", headers: body === undefined ? {} : { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store" });
  const value = await res.json() as { error?: string }; if (!res.ok) throw new Error(value.error || "Không thể kết nối máy chủ."); return value as T;
}
function Brand() { return <a className="brand" href="/" aria-label="STAR Duck Race, trang chủ"><span className="brand-symbol"><Star size={25} fill="currentColor" strokeWidth={1.4} /></span><span><strong>STAR<span className="brand-education"> EDUCATION</span></strong><small>Duck Race</small></span></a>; }
function Button({ children, className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) { return <button className={`btn ${className}`} {...props}>{children}</button>; }
function Pill({ children, gold = false }: { children: ReactNode; gold?: boolean }) { return <span className={`pill ${gold ? "gold" : ""}`}>{children}</span>; }
const roomStates: Record<string, string> = { waiting: "Phòng chờ", ready: "Chờ xuất phát", countdown: "Chuẩn bị xuất phát", paused: "Đã tạm dừng", racing: "Cuộc đua đang diễn ra", settling: "Đội vịt đang về đích", finished: "Đã về đích" };

export default function DuckRaceApp() {
  const [view, setView] = useState("loading"), [pin, setPin] = useState(""); const [room, setRoom] = useState<PublicRoom | null>(null);
  const [host, setHost] = useState(false), [admin, setAdmin] = useState<boolean | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null); const [name, setName] = useState(""); const [skin, setSkin] = useState<SkinId>("star");
  const [title, setTitle] = useState(""), [duration, setDuration] = useState(60), [scene, setScene] = useState<SceneId>("park"), [distance, setDistance] = useState(300);
  const [rooms, setRooms] = useState<PublicRoom[]>([]), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [connection, setConnection] = useState(true), [qr, setQr] = useState(""), [copied, setCopied] = useState(false), [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0), [fullscreen, setFullscreen] = useState(false), [confirmClose, setConfirmClose] = useState(false), [importOpen, setImportOpen] = useState(false);
  const [testCount, setTestCount] = useState(0), [settingsOpen, setSettingsOpen] = useState(false), [presentation, setPresentation] = useState(false), [roomsOpen, setRoomsOpen] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const lastReact = useRef(0);
  const readLocation = useCallback(() => {
    const params = new URLSearchParams(location.search), value = params.get("room") || "";
    setError(""); setRoom(null); setPin(value); setHost(params.get("host") === "1"); setView(value ? "room" : params.get("view") === "admin" ? "admin" : "join");
    try { setMembership(value ? JSON.parse(localStorage.getItem(`star-duck-${value}`) || "null") : null); } catch { setMembership(null); }
  }, []);
  function navigate(next: string, nextPin = "", isHost = false) {
    history.pushState({}, "", nextPin ? `/?room=${nextPin}${isHost ? "&host=1" : ""}` : next === "admin" ? "/?view=admin" : "/"); readLocation();
  }
  useEffect(() => { readLocation(); window.addEventListener("popstate", readLocation); api<{ admin: boolean }>("me").then(v => setAdmin(v.admin)).catch(() => setAdmin(false)); return () => window.removeEventListener("popstate", readLocation); }, [readLocation]);
  useEffect(() => { if (view === "admin" && admin) api<{ rooms: PublicRoom[] }>("rooms").then(v => setRooms(v.rooms)).catch(e => setError(e.message)); }, [view, admin]);
  useEffect(() => {
    if (view !== "room" || !/^\d{6}$/.test(pin)) return;
    let alive = true; let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      const started = Date.now();
      try { const value = await api(`rooms/${pin}`); if (!alive) return; setRoom(value); setOffset(value.serverNow - (started + Date.now()) / 2); setConnection(true); }
      catch (e) { if (!alive) return; setConnection(false); setError((e as Error).message); }
      if (alive) timer = setTimeout(poll, 700);
    }
    void poll(); return () => { alive = false; clearTimeout(timer); };
  }, [view, pin]);
  useEffect(() => {
    if (!room) return;
    void QRCode.toDataURL(`${location.origin}/?room=${room.pin}`, { width: 320, margin: 2, color: { dark: "#172b63", light: "#ffffff" }, errorCorrectionLevel: "M" }).then(setQr);
  }, [room?.pin]);
  useEffect(() => { const handle = () => setFullscreen(!!document.fullscreenElement); document.addEventListener("fullscreenchange", handle); return () => document.removeEventListener("fullscreenchange", handle); }, []);
  const active = !!room?.race, isHost = host && admin === true, own = room?.players.find(p => p.id === membership?.playerId);
  useEffect(() => { if (!active) setPresentation(false); }, [active]);
  useEffect(() => { if (!presentation) return; const escape = (e: KeyboardEvent) => { if (e.key === "Escape" && !e.defaultPrevented && !document.querySelector('[role="dialog"]')) setPresentation(false); }; window.addEventListener("keydown", escape); return () => window.removeEventListener("keydown", escape); }, [presentation]);
  async function run(fn: () => Promise<void>) { setBusy(true); setError(""); try { await fn(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }
  async function join(event: FormEvent) {
    event.preventDefault(); await run(async () => {
      if (!/^\d{6}$/.test(pin)) throw new Error("Vui lòng nhập PIN gồm 6 chữ số.");
      const stored = localStorage.getItem(`star-duck-${pin}`), token = stored ? JSON.parse(stored).token : crypto.randomUUID();
      const value = await api<{ room: PublicRoom; playerId: string }>(`rooms/${pin}/join`, { name, token, skin }); const m = { token, playerId: value.playerId };
      localStorage.setItem(`star-duck-${pin}`, JSON.stringify(m)); navigate("room", pin); setMembership(m); setRoom(value.room);
    });
  }
  async function action(kind: string, body: Record<string, unknown> = {}) {
    await run(async () => { const value = await api(`rooms/${pin}/${kind}`, body); setRoom(value); if (kind === "close") { setConfirmClose(false); navigate("admin"); } });
  }
  function react(kind: string) {
    if (!membership || Date.now() - lastReact.current < 1500) return; lastReact.current = Date.now();
    void api(`rooms/${pin}/react`, { token: membership.token, kind }).then(setRoom).catch(e => setError(e.message));
  }
  async function copyLink() { try { await navigator.clipboard.writeText(`${location.origin}/?room=${pin}`); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setError("Hãy sao chép đường dẫn từ thanh địa chỉ và bỏ phần &host=1."); } }
  async function toggleFullscreen() { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch { setError("Trình duyệt chưa hỗ trợ toàn màn hình. Bạn có thể dùng phím F11."); } }
  const joinForm = (inRoom = false) => <form onSubmit={join} className="join-form">
    <div className="form-heading"><h2>{inRoom ? "Sẵn sàng nhập cuộc?" : "Tham gia cuộc đua"}</h2><p>{inRoom ? room?.title : "Nhập PIN, chọn vịt và cùng STAR về đích."}</p></div>
    <div className="join-fields"><div><label htmlFor="pin">Mã PIN phòng <span>*</span></label><input id="pin" name="pin" className="pin-input" inputMode="numeric" autoComplete="off" placeholder="000000" maxLength={6} value={pin} readOnly={inRoom} onChange={e => setPin(e.target.value.replace(/\D/g, ""))} required pattern="[0-9]{6}" /></div>
    <div><label htmlFor="name">Tên của bạn <span>*</span></label><input id="name" name="name" autoComplete="nickname" placeholder="Ví dụ: Minh Anh · 10A1" value={name} onChange={e => setName(e.target.value)} maxLength={40} required /></div></div>
    <SkinPicker value={skin} onChange={setSkin} disabled={busy} />{error && <p className="error" role="alert">{error}</p>}
    <Button className="primary wide" disabled={busy || inRoom && (!!room?.locked || room?.state === "closed")} type="submit">{busy ? "Đang tham gia…" : room?.state === "closed" ? "Phòng đã đóng" : inRoom && room?.locked ? "Phòng đã khóa" : "Vào phòng chờ"}<ArrowRight size={18} /></Button>
    <p className="form-footnote"><Users size={15} /> Tối đa 200 người trong một phòng</p>
  </form>;

  return <div className={`app-shell viewport-app ${active ? "race-mode" : ""} ${presentation ? "presentation-mode" : ""}`}><header className="site-header"><Brand /><div className="header-actions"><span className="mock-tag">Bản thử nghiệm</span>{view === "join" ? <button className="nav-link" onClick={() => navigate("admin")}><ShieldCheck size={17} /><span>Quản trị viên</span><ChevronRight size={15} /></button> : <button className="nav-link" onClick={() => navigate("join")}><ArrowLeft size={16} /><span>Trang tham gia</span></button>}</div></header>
    {view === "loading" && <main className="loading-page"><Duck skin="star" /><p>Đang chuẩn bị dòng sông…</p></main>}
    {view === "join" && <main className="home"><div className="home-intro"><Pill gold><span className="tiny-star">✦</span> Cùng STAR tạo nên khoảnh khắc</Pill><h1>Một đường đua.<br />Hàng trăm <span>bất ngờ.</span></h1><p>Chọn một cái tên, nhận một chú vịt.<br />Cùng bạn bè chờ đón người về đích đầu tiên!</p><div className="intro-meta"><span><Users size={17} /> 200 người cùng chơi</span><span><Flag size={17} /> Cơ hội ngang nhau</span></div><div className="home-river illustrated-river"><div className="river-waves" /><Duck skin="star" className="hero-duck hero-one" /><Duck skin="captain" className="hero-duck hero-two" /><Duck skin="rose" className="hero-duck hero-three" /><span className="river-caption">Cuộc vui sắp bắt đầu.</span><span className="little-spark s1">✦</span><span className="little-spark s2">✧</span></div></div><div className="home-form-wrap">{joinForm()}<div className="how-to"><span>01 <b>Nhập PIN</b></span><i /><span>02 <b>Chọn vịt</b></span><i /><span>03 <b>Cổ vũ!</b></span></div></div></main>}

    {view === "admin" && <main className="admin-page">
      <div className="page-title"><div><h1>Tạo một cuộc vui mới.</h1><p>Chuẩn bị phòng đua và mời mọi người cùng tham gia.</p></div><div className="admin-title-actions">{admin && <><button className="btn rooms-toggle" onClick={() => setRoomsOpen(true)}>Phòng của bạn ({rooms.length})</button><a className="nav-link" href="/signout-with-chatgpt?return_to=/%3Fview%3Dadmin" target="_top">Đăng xuất</a></>}</div></div>
      {admin === null ? <div className="empty-state">Đang kiểm tra phiên đăng nhập…</div> : !admin ? <section className="login-card"><span className="mini-icon"><ShieldCheck size={28} /></span><h2>Admin STAR</h2><p>Dùng phiên đăng nhập thử nghiệm để tạo và điều khiển phòng. Bản này chưa kết nối tài khoản STAR.</p><a className="btn primary" href="/signin-with-chatgpt?return_to=/%3Fview%3Dadmin" target="_top">Đăng nhập thử nghiệm <ArrowRight size={18} /></a></section> : <div className="admin-grid">
        <form className="card create-room" onSubmit={event => { event.preventDefault(); void run(async () => { const value = await api("rooms", { title, duration, scene, distance, testCount }); navigate("room", value.pin, true); setRoom(value); }); }}>
          <div className="section-heading"><h2>Phòng đua mới</h2><Plus size={18} /></div>
          <div className="create-fields"><div className="settings-full"><label htmlFor="title">Tên phòng <span>*</span></label><input id="title" value={title} onChange={e => setTitle(e.target.value)} maxLength={80} placeholder="Ví dụ: Thứ Sáu vui cùng STAR" required /></div>
          <div><label htmlFor="duration">Thời lượng cuộc đua</label><div className="duration-control"><input id="duration" type="number" min={10} max={1800} step={1} value={duration} onChange={e => setDuration(Number(e.target.value))} required /><span>giây</span></div></div>
          <div><label htmlFor="course-distance">Chiều dài đường đua</label><select id="course-distance" value={distance} onChange={e => setDistance(Number(e.target.value))}>{[100,300,600,900].map(d => <option key={d} value={d}>{d} m</option>)}</select></div>
          <div><label htmlFor="create-scene">Khung cảnh</label><select id="create-scene" value={scene} onChange={e => setScene(e.target.value as SceneId)}>{SCENES.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}</select></div>
          <div><label htmlFor="create-test-count">Vịt thử nghiệm</label><input id="create-test-count" type="number" min={0} max={200} step={1} value={testCount} onChange={e => setTestCount(Number(e.target.value))} required /><small className="field-help">0–200 · 0 để chờ người thật</small></div></div>
          {error && <p className="error" role="alert">{error}</p>}
          <Button className="primary wide" disabled={busy} type="submit">{busy ? "Đang tạo…" : "Tạo phòng đua"}<ArrowRight size={17} /></Button>
        </form>
        <section className="card rooms-list"><div className="section-heading"><h2>Phòng của bạn</h2><span className="muted">{rooms.length} phòng</span></div><div className="rooms-scroll">{rooms.length === 0 ? <div className="empty-state"><Duck skin="captain" /><h3>Chú vịt đang đợi bạn!</h3><p>Tạo phòng đầu tiên để nhận mã PIN và QR.</p></div> : rooms.map(r => <button className="room-row" key={r.pin} onClick={() => navigate("room", r.pin, true)}><span className="room-row-icon"><Flag size={20} /></span><span><strong>{r.title}</strong><small>PIN {r.pin} · {r.count}/200 người · {formatClock(r.duration)}</small></span><ChevronRight size={18} /></button>)}</div></section>
      </div>}
    </main>}

    {view === "room" && !room && <main className="loading-page">{error ? <><h1>Chưa vào được phòng</h1><p role="alert">{error}</p><Button onClick={() => navigate("join")}>Nhập lại PIN <ArrowLeft size={16} /></Button></> : <><Duck skin="captain" /><p>Đang tìm phòng đua…</p></>}</main>}
    {view === "room" && room?.state === "closed" && <main className="loading-page"><Flag size={40} /><h1>Cuộc vui đã khép lại.</h1><p>Phòng này đã đóng. Hẹn bạn ở cuộc đua tiếp theo!</p><Button className="primary" onClick={() => navigate("join")}>Về trang tham gia</Button></main>}
    {view === "room" && room && room.state !== "closed" && !isHost && !own && !active && <main className="room-join"><button className="nav-link" onClick={() => navigate("join")}><ArrowLeft size={16} /> Đổi phòng</button>{membership && <p className="error" role="alert">Bạn không còn trong danh sách phòng. Hãy tham gia lại nếu phòng đang mở.</p>}{joinForm(true)}</main>}

    {view === "room" && room && room.state !== "closed" && (isHost || own || active) && <main className="room-page"><div className="room-heading"><div className="room-heading-copy"><div className="room-eyebrow"><Pill>{roomStates[room.state] || "Phòng chờ"}</Pill><span className={`connection ${connection ? "" : "offline"}`}><i />{connection ? "Đã kết nối" : "Đang kết nối lại…"}</span></div><h1 title={room.title}>{room.title}</h1></div><div className="room-tools"><span className="room-pin-small">PIN <strong>{pin}</strong></span>{active ? <><button className="icon-btn" onClick={() => setPresentation(true)} aria-label="Chế độ trình chiếu" title="Chế độ trình chiếu"><MonitorPlay size={19} /></button><button className="icon-btn" aria-label="Về trang tham gia" onClick={() => navigate("join")}><ArrowLeft size={18} /></button></> : isHost && <button className="btn room-settings-button" onClick={() => setSettingsOpen(true)}><SlidersHorizontal size={16} /> Cài đặt phòng</button>}<button className="icon-btn" onClick={toggleFullscreen} aria-label={fullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}>{fullscreen ? <Minimize size={20} /> : <Maximize size={20} />}</button></div></div>{error && <div className="room-error" role="alert"><span>{error}</span><button className="icon-btn" aria-label="Đóng thông báo" onClick={() => setError("")}><X size={16} /></button></div>}

      {!active && <div className={`lobby-grid ${!isHost ? "player-lobby" : ""}`}><section className="card participants-card"><div className="section-heading"><h2>Đội vịt đã sẵn sàng <span className="count-badge">{room.count}<span>/200</span></span></h2><div className="participants-actions">{room.count > 8 && <div className="search"><Search size={16} /><input aria-label="Tìm người chơi" placeholder="Tìm tên…" value={query} onChange={e => setQuery(e.target.value)} /></div>}{isHost && <button className="btn small-btn" disabled={busy || room.locked || room.count === 200} onClick={() => setImportOpen(true)}><Plus size={15} /> Thêm danh sách</button>}</div></div>{own && <div className="own-duck-select"><SkinPicker value={own.skin} disabled={busy} onChange={value => void run(async () => { setRoom(await api(`rooms/${pin}/skin`, { token: membership?.token, skin: value })); })} /></div>}
      {room.count === 0 ? <div className="empty-state lobby-empty"><div className="empty-ducks"><Duck skin="star" /><Duck skin="captain" /></div><h3>Mời những chú vịt đầu tiên</h3><p>Quét QR, nhập PIN hoặc thêm danh sách lớp.<br />Mọi người sẽ xuất hiện tại đây.</p></div> : <div className="player-grid">{room.players.filter(p => p.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())).map(p => <div className={`player-chip ${p.id === own?.id ? "is-own" : ""}`} key={p.id}><Duck skin={p.skin} /><span title={p.name}>{p.name}</span>{p.isTest && <small className="test-player-tag">Thử</small>}{isHost && <button className="remove-player" aria-label={`Xóa ${p.name}`} onClick={() => void action("remove", { playerId: p.id })} disabled={busy}><X size={14} /></button>}</div>)}{query && !room.players.some(p => p.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())) && <p className="muted">Không có tên phù hợp.</p>}</div>}
      <div className="lobby-reactions">{room.reactions.slice(-8).map(r => <span key={r.id}>{r.kind}</span>)}</div><div className="lobby-bottom"><span><span className="status-dot" />{room.locked ? "Phòng đã khóa" : "Đang đón người tham gia"}</span>{isHost ? <button className="nav-link" disabled={busy} onClick={() => void action("lock")}><LockKeyhole size={15} />{room.locked ? "Mở khóa phòng" : "Khóa phòng"}</button> : <button className="nav-link" disabled={busy} onClick={() => void run(async () => { await api(`rooms/${pin}/leave`, { token: membership?.token }); localStorage.removeItem(`star-duck-${pin}`); navigate("join"); })}>Rời phòng</button>}</div></section>
      {isHost ? <aside className="card invite-card">
        <div className="section-heading"><h2>Mời bạn cùng đua</h2><QrCode size={18} /></div>
        <div className="invite-join-code"><div className="qr-wrap">{qr ? <button className="qr-preview" aria-label="Phóng to mã QR" onClick={() => setQrOpen(true)}><img src={qr} alt={`Mã QR tham gia phòng ${pin}`} width={164} height={164} /></button> : <div className="qr-placeholder" />}</div><div className="invite-pin"><p className="pin-label">Nhập PIN hoặc quét QR</p><div className="big-pin">{pin}</div><button className="copy-link" onClick={copyLink}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? "Đã sao chép" : "Sao chép liên kết"}</button></div></div>
        <div className="lobby-race-summary"><span>{formatClock(room.duration)} · {room.distance} m</span><span>{SCENES.find(s => s.id === room.scene)?.name}</span></div>
        <Button className="primary wide start-btn" disabled={busy || room.count < 2 || !connection} onClick={() => void action("prepare")}><Play size={17} />{busy ? "Đang chuẩn bị…" : "Vào đường đua"}</Button><p className="start-help">{room.count < 2 ? "Cần ít nhất 2 người để vào đường đua." : "Chưa xuất phát. Bạn có thể chọn trình chiếu trước."}</p>
      </aside> : <aside className="player-wait-card"><span className="waiting-orbit"><Duck skin={own?.skin} /></span><h2>Vịt đã vào vị trí!</h2><p>Admin sẽ bắt đầu cuộc đua.</p><div className="waiting-duration"><Flag size={16} /><span>{SCENES.find(s => s.id === room.scene)?.name} · <strong>{formatClock(room.duration)}</strong></span></div><div className="cheer-buttons lobby-cheers">{['👏', '🔥', '⭐', '🦆'].map(kind => <button key={kind} aria-label={`Cổ vũ ${kind}`} onClick={() => react(kind)}>{kind}</button>)}</div></aside>}</div>}

      {active && <RaceStage key={room.race!.id} room={room} offset={offset} ownId={own?.id} isHost={isHost} busy={busy} onAction={action} onReact={react} onError={setError} />}
      {isHost && !active && <div className="room-footer"><span>PIN có hiệu lực trong 24 giờ.</span><button className="nav-link" onClick={() => setConfirmClose(true)}>Đóng phòng</button></div>}
    </main>}
    <footer className="site-footer"><span>STAR EDUCATION <span className="footer-separator">/</span> Cùng nhau về đích.</span><span>Made for happy moments <Star size={12} /></span></footer>
    {confirmClose && <Dialog title="Đóng phòng đua?" onClose={() => setConfirmClose(false)}><p>Mọi người sẽ không thể tiếp tục tham gia phòng “{room?.title}”. Bạn có thể tạo phòng mới bất cứ lúc nào.</p><div className="modal-actions"><Button onClick={() => setConfirmClose(false)}>Hủy</Button><Button className="danger" disabled={busy} onClick={() => void action("close")}>Đóng phòng</Button></div></Dialog>}
    {importOpen && room && <ImportPlayers available={200 - room.count} onClose={() => setImportOpen(false)} onImport={async names => { setRoom(await api(`rooms/${pin}/import`, { names })); }} />}
    {settingsOpen && room && isHost && !active && <RoomSettings room={room} onClose={() => setSettingsOpen(false)} onSave={async body => { setRoom(await api(`rooms/${pin}/settings`, body)); }} />}
    {roomsOpen && <Dialog title="Phòng của bạn" onClose={() => setRoomsOpen(false)}>{rooms.length === 0 ? <p>Chưa có phòng nào. Hãy tạo một cuộc đua mới.</p> : rooms.map(r => <button className="room-row" key={r.pin} onClick={() => { setRoomsOpen(false); navigate("room", r.pin, true); }}><span><strong>{r.title}</strong><small>PIN {r.pin} · {r.count}/200 người</small></span><ChevronRight size={16} /></button>)}<a className="nav-link" href="/signout-with-chatgpt?return_to=/%3Fview%3Dadmin" target="_top">Đăng xuất</a></Dialog>}
    {qrOpen && room && <Dialog title="Tham gia cuộc đua" onClose={() => setQrOpen(false)}><div className="qr-enlarged"><img src={qr} alt={`Mã QR phòng ${pin}`} width={260} height={260} /><div className="big-pin">{pin}</div><button className="copy-link" onClick={copyLink}><Copy size={15} />{copied ? "Đã sao chép" : "Sao chép liên kết"}</button></div></Dialog>}
    {presentation && <button className="exit-presentation" onClick={() => setPresentation(false)} title="Esc để thoát trình chiếu"><Minimize size={15} /> Thoát trình chiếu</button>}
  </div>;
}
