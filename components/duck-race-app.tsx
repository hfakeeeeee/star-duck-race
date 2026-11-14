"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronRight, Copy, Flag, LockKeyhole, Maximize, Minimize, Play, Plus, QrCode, RotateCcw, Search, ShieldCheck, Star, Trophy, Users, Volume2, VolumeX, X } from "lucide-react";
import QRCode from "qrcode";
import { duckProgress, type PublicRoom } from "../lib/race";

type Membership = { token: string; playerId: string };
const duckColors = ["#f6cf52", "#ef9d9d", "#9db9ed", "#a3ccae", "#c0ace0", "#efb374"];
const fmt = (seconds: number) => { const n = Math.max(0, Math.ceil(seconds)); return `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`; };
async function api<T = PublicRoom>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api/${path}`, { method: body === undefined ? "GET" : "POST", headers: body === undefined ? {} : { "Content-Type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store" });
  const value = await res.json() as { error?: string };
  if (!res.ok) throw new Error(value.error || "Không thể kết nối máy chủ.");
  return value as T;
}
function Duck({ color = "#f6cf52", className = "", ...props }: { color?: string; className?: string; style?: React.CSSProperties }) {
  return <svg viewBox="0 0 100 86" fill="none" className={`duck ${className}`} aria-hidden="true" {...props}><path d="M13 48c-8 0-10-8-11-12 9 6 17 2 22 1h40c23 0 30 15 20 30-8 13-27 16-45 11C22 73 13 61 13 48Z" fill={color} /><circle cx="64" cy="31" r="25" fill={color} /><path d="m85 32 15 7-16 7" fill="#ec8945" /><path d="M28 49c9-7 23-4 28 3-5 12-22 13-28-3Z" fill="#172b63" fillOpacity=".12" /><circle cx="72" cy="25" r="3.5" fill="#172b63" /><circle cx="73" cy="24" r="1" fill="white" /><path d="M52 10c0-5 4-8 9-7" stroke={color} strokeWidth="6" strokeLinecap="round" /></svg>;
}
function Brand({ compact = false }: { compact?: boolean }) { return <a className="brand" href="/" aria-label="STAR Duck Race, trang chủ"><span className="brand-symbol"><Star size={25} fill="currentColor" strokeWidth={1.4} /></span><span><strong>STAR<span className="brand-education"> EDUCATION</span></strong>{!compact && <small>Duck Race</small>}</span></a>; }
function Button({ children, className = "", ...props }: React.ButtonHTMLAttributes<HTMLButtonElement>) { return <button className={`btn ${className}`} {...props}>{children}</button>; }
function Pill({ children, gold = false }: { children: ReactNode; gold?: boolean }) { return <span className={`pill ${gold ? "gold" : ""}`}>{children}</span>; }

function RiverCanvas({ room, ownId, offset, decorative = false }: { room?: PublicRoom; ownId?: string; offset: number; decorative?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const data = useRef({ room, ownId, offset });
  useEffect(() => { data.current = { room, ownId, offset }; }, [room, ownId, offset]);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    let id = 0; let width = 0; let height = 0;
    const resize = () => { const r = canvas.getBoundingClientRect(); width = r.width; height = r.height; const dpr = Math.min(devicePixelRatio || 1, 2); canvas.width = width * dpr; canvas.height = height * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); };
    const observer = new ResizeObserver(resize); observer.observe(canvas); resize();
    function drawDuck(x: number, y: number, size: number, color: string, highlight: boolean) {
      ctx!.save(); ctx!.translate(x, y); ctx!.scale(size / 100, size / 100);
      if (highlight) { ctx!.beginPath(); ctx!.ellipse(43, 40, 66, 60, 0, 0, Math.PI * 2); ctx!.fillStyle = "#ffffffbb"; ctx!.fill(); ctx!.strokeStyle = "#172b63"; ctx!.lineWidth = 3; ctx!.stroke(); }
      ctx!.fillStyle = "#ffffff55"; ctx!.beginPath(); ctx!.ellipse(40, 84, 60, 7, 0, 0, Math.PI * 2); ctx!.fill();
      ctx!.fillStyle = color; ctx!.beginPath(); ctx!.ellipse(40, 55, 36, 24, .15, 0, Math.PI * 2); ctx!.fill();
      ctx!.beginPath(); ctx!.moveTo(14, 52); ctx!.lineTo(-4, 27); ctx!.lineTo(31, 41); ctx!.fill();
      ctx!.beginPath(); ctx!.arc(64, 27, 24, 0, Math.PI * 2); ctx!.fill();
      ctx!.fillStyle = "#ec8945"; ctx!.beginPath(); ctx!.moveTo(83, 29); ctx!.lineTo(103, 36); ctx!.lineTo(83, 42); ctx!.fill();
      ctx!.fillStyle = "#172b6325"; ctx!.beginPath(); ctx!.ellipse(37, 54, 15, 8, .3, 0, Math.PI * 2); ctx!.fill();
      ctx!.fillStyle = "#172b63"; ctx!.beginPath(); ctx!.arc(72, 24, 3, 0, Math.PI * 2); ctx!.fill();
      ctx!.restore();
    }
    function draw() {
      const { room: r, ownId: mine, offset: off } = data.current;
      const time = (Date.now() + off) / 1000;
      ctx!.fillStyle = "#dfeff1"; ctx!.fillRect(0, 0, width, height);
      for (let lane = 0; lane < 12; lane++) {
        const y = (lane + .5) * height / 12;
        ctx!.strokeStyle = lane % 2 ? "#a3cfd23b" : "#ffffff7a"; ctx!.lineWidth = 2; ctx!.beginPath();
        for (let x = -80; x < width + 80; x += 8) { const yy = y + Math.sin(x / 70 - time * .65 + lane) * 5; if (x === -80) ctx!.moveTo(x, yy); else ctx!.lineTo(x, yy); } ctx!.stroke();
        for (let k = 0; k < 5; k++) { const x = ((k * 231 + lane * 67 - time * 22) % (width + 80) + width + 80) % (width + 80) - 40; ctx!.strokeStyle = "#ffffff8a"; ctx!.beginPath(); ctx!.moveTo(x, y + 10); ctx!.lineTo(x + 22, y + 10); ctx!.stroke(); }
      }
      if (decorative || !r) {
        const samples = [{ x: .2, y: .5, s: 85 }, { x: .58, y: .33, s: 110 }, { x: .78, y: .64, s: 60 }];
        samples.forEach((d, i) => drawDuck(width * d.x + Math.sin(time + i) * 6, height * d.y + Math.sin(time * 1.5 + i) * 4, d.s, duckColors[i], false));
      } else {
        const margin = width < 600 ? 28 : 60; const finish = width - margin - 30;
        ctx!.fillStyle = "#172b6315"; ctx!.fillRect(finish, 0, 16, height);
        for (let y = 0; y < height; y += 16) { ctx!.fillStyle = Math.floor(y / 16) % 2 ? "#ffffff" : "#172b63"; ctx!.fillRect(finish, y, 8, 8); ctx!.fillRect(finish + 8, y + 8, 8, 8); }
        const elapsed = r.race ? time - r.race.startAt / 1000 : 0;
        const rows = r.count <= 24 ? Math.max(r.count, 3) : width < 600 ? 12 : 16;
        const rowHeight = (height - 65) / rows;
        const size = Math.min(r.players.length > 60 ? (width < 600 ? 18 : 24) : (width < 600 ? 30 : 40), rowHeight * .85);
        const players = [...r.players].sort((a, b) => Number(a.id === mine) - Number(b.id === mine));
        players.forEach(p => {
          const idx = r.players.findIndex(v => v.id === p.id); const seed = r.race?.seeds[p.id] || idx * 3571;
          const rank = r.race?.order.indexOf(p.id) ?? -1;
          const progress = r.race ? duckProgress(elapsed, r.race.duration, seed, rank, r.count) : 0;
          const x = margin + progress * (finish - margin - size * .85) + (r.race ? 0 : idx % 4 * 10);
          const y = 22 + (idx % rows + .5) * rowHeight + Math.sin(time * 2 + idx) * 2;
          drawDuck(x, y - size / 2, size, duckColors[idx % duckColors.length], p.id === mine);
          if (r.count <= 24 || p.id === mine || rank === 0 && elapsed >= r.duration) {
            ctx!.font = `${p.id === mine ? 700 : 500} 12px system-ui`; ctx!.textAlign = "left";
            const label = p.name.length > 18 ? p.name.slice(0, 16) + "…" : p.name;
            const tw = ctx!.measureText(label).width;
            const lx = x + size + tw + 12 < width - 22 ? x + size + 6 : Math.max(6, x - tw - 12);
            ctx!.fillStyle = "#ffffffdc"; ctx!.beginPath(); ctx!.roundRect(lx - 4, y - 9, tw + 8, 19, 5); ctx!.fill();
            ctx!.fillStyle = "#172b63"; ctx!.fillText(label, lx, y + 5);
          }
        });
      }
      id = requestAnimationFrame(draw);
    }
    draw(); return () => { cancelAnimationFrame(id); observer.disconnect(); };
  }, [decorative]);
  return <canvas ref={ref} className={`river-canvas ${decorative ? "decorative" : ""}`} role="img" aria-label={decorative ? "Những chú vịt đang bơi trên dòng sông" : "Đường đua vịt trực tiếp. Kết quả được công bố bên dưới khi hết giờ."} />;
}

export default function DuckRaceApp() {
  const [view, setView] = useState("loading"); const [pin, setPin] = useState(""); const [room, setRoom] = useState<PublicRoom | null>(null);
  const [host, setHost] = useState(false); const [admin, setAdmin] = useState<boolean | null>(null);
  const [membership, setMembership] = useState<Membership | null>(null); const [name, setName] = useState("");
  const [title, setTitle] = useState(""); const [duration, setDuration] = useState(60); const [rooms, setRooms] = useState<PublicRoom[]>([]);
  const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const [connection, setConnection] = useState(true);
  const [qr, setQr] = useState(""); const [copied, setCopied] = useState(false); const [query, setQuery] = useState("");
  const [offset, setOffset] = useState(0); const [now, setNow] = useState(Date.now()); const [fullscreen, setFullscreen] = useState(false);
  const [sound, setSound] = useState(false); const [confirmClose, setConfirmClose] = useState(false);
  const [showRanking, setShowRanking] = useState(false); const audio = useRef<AudioContext | null>(null); const lastCue = useRef("");

  function navigate(next: string, nextPin = "", isHost = false) {
    const url = nextPin ? `/?room=${nextPin}${isHost ? "&host=1" : ""}` : next === "admin" ? "/?view=admin" : "/";
    history.pushState({}, "", url); readLocation();
  }
  const readLocation = useCallback(() => {
    const p = new URLSearchParams(location.search); const value = p.get("room") || "";
    setError(""); setRoom(null); setPin(value); setHost(p.get("host") === "1"); setView(value ? "room" : p.get("view") === "admin" ? "admin" : "join");
    try { setMembership(value ? JSON.parse(localStorage.getItem(`star-duck-${value}`) || "null") : null); } catch { setMembership(null); }
  }, []);
  useEffect(() => { readLocation(); window.addEventListener("popstate", readLocation); api<{ admin: boolean }>("me").then(v => setAdmin(v.admin)).catch(() => setAdmin(false)); return () => window.removeEventListener("popstate", readLocation); }, [readLocation]);
  useEffect(() => {
    if (view !== "admin" || !admin) return;
    api<{ rooms: PublicRoom[] }>("rooms").then(v => setRooms(v.rooms)).catch(e => setError(e.message));
  }, [view, admin]);
  useEffect(() => {
    if (view !== "room" || !/^\d{6}$/.test(pin)) return;
    let alive = true; let timer: ReturnType<typeof setTimeout>;
    async function poll() {
      const started = Date.now();
      try { const value = await api(`rooms/${pin}`); if (!alive) return; setRoom(value); setOffset(value.serverNow - (started + Date.now()) / 2); setConnection(true); }
      catch (e) { if (!alive) return; setConnection(false); setError((e as Error).message); }
      if (alive) timer = setTimeout(poll, 800);
    }
    poll(); return () => { alive = false; clearTimeout(timer); };
  }, [view, pin]);
  useEffect(() => { if (!room) return; const timer = setInterval(() => setNow(Date.now() + offset), 100); return () => clearInterval(timer); }, [!!room, offset]);
  useEffect(() => {
    if (!room) return;
    const link = `${location.origin}/?room=${room.pin}`;
    QRCode.toDataURL(link, { width: 320, margin: 2, color: { dark: "#172b63", light: "#ffffff" }, errorCorrectionLevel: "M" }).then(setQr);
  }, [room?.pin]);
  useEffect(() => { const handler = () => setFullscreen(!!document.fullscreenElement); document.addEventListener("fullscreenchange", handler); return () => document.removeEventListener("fullscreenchange", handler); }, []);
  const race = room?.race; const remaining = race ? Math.max(0, (race.startAt + race.duration * 1000 - now) / 1000) : room?.duration || 0;
  const countdown = race ? Math.ceil((race.startAt - now) / 1000) : 0;
  const finished = !!race && remaining === 0;
  const active = !!race;
  const isHost = host && admin === true;
  const own = room?.players.find(p => p.id === membership?.playerId);
  useEffect(() => {
    if (!sound || !race) return;
    const key = countdown > 0 ? `${race.id}-${countdown}` : finished ? `${race.id}-end` : "";
    if (!key || key === lastCue.current) return; lastCue.current = key;
    const ac = audio.current; if (!ac) return;
    const oscillator = ac.createOscillator(); const gain = ac.createGain(); oscillator.connect(gain); gain.connect(ac.destination);
    oscillator.frequency.value = finished ? 880 : 440; gain.gain.setValueAtTime(.08, ac.currentTime); gain.gain.exponentialRampToValueAtTime(.001, ac.currentTime + .25);
    oscillator.start(); oscillator.stop(ac.currentTime + .3);
  }, [countdown, finished, sound, race?.id]);
  async function run(fn: () => Promise<void>) { setBusy(true); setError(""); try { await fn(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }
  async function join(event: FormEvent) {
    event.preventDefault(); await run(async () => {
      if (!/^\d{6}$/.test(pin)) throw new Error("Vui lòng nhập PIN gồm 6 chữ số.");
      const stored = localStorage.getItem(`star-duck-${pin}`); const token = stored ? JSON.parse(stored).token : crypto.randomUUID();
      const value = await api<{ room: PublicRoom; playerId: string }>(`rooms/${pin}/join`, { name, token }); const m = { token, playerId: value.playerId };
      localStorage.setItem(`star-duck-${pin}`, JSON.stringify(m)); navigate("room", pin); setMembership(m); setRoom(value.room);
    });
  }
  async function action(kind: string, body = {}) { await run(async () => { const value = await api(`rooms/${pin}/${kind}`, body); setRoom(value); if (kind === "close") { setConfirmClose(false); navigate("admin"); } if (kind === "reset") { setShowRanking(false); } }); }
  async function copyLink() { try { await navigator.clipboard.writeText(`${location.origin}/?room=${pin}`); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { setError("Hãy sao chép đường dẫn từ thanh địa chỉ và bỏ phần &host=1."); } }
  async function toggleFullscreen() { try { if (document.fullscreenElement) await document.exitFullscreen(); else await document.documentElement.requestFullscreen(); } catch { setError("Trình duyệt chưa hỗ trợ toàn màn hình. Bạn có thể dùng phím F11."); } }
  function toggleSound() { if (!sound) { audio.current ||= new AudioContext(); void audio.current.resume(); } setSound(!sound); }
  function exportResults() {
    if (!room?.race) return;
    const csv = "\uFEFFHạng,Tên\r\n" + room.race.order.map((id, i) => `${i + 1},"${(room.players.find(p => p.id === id)?.name || "").replace(/"/g, '""').replace(/^[=+@-]/, "'$&")}"`).join("\r\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" })); const a = document.createElement("a"); a.href = url; a.download = `STAR-${pin}.csv`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  const joinForm = (inRoom = false) => <form onSubmit={join} className="join-form">
    <div className="form-heading"><span className="mini-icon"><Flag size={22} /></span><h2>{inRoom ? "Sẵn sàng nhập cuộc?" : "Tham gia cuộc đua"}</h2><p>{inRoom ? room?.title : "Một chiếc PIN. Một chú vịt. Biết đâu bạn thắng!"}</p></div>
    <label htmlFor="pin">Mã PIN phòng <span>*</span></label><input id="pin" name="pin" className="pin-input" inputMode="numeric" autoComplete="off" placeholder="000000" maxLength={6} value={pin} readOnly={inRoom} onChange={e => setPin(e.target.value.replace(/\D/g, ""))} required pattern="[0-9]{6}" />
    <label htmlFor="name">Tên của bạn <span>*</span></label><input id="name" name="name" autoComplete="nickname" placeholder="Ví dụ: Minh Anh · 10A1" value={name} onChange={e => setName(e.target.value)} maxLength={40} required />
    <small className="input-help">Tên này sẽ xuất hiện trên chú vịt của bạn.</small>
    {error && <p className="error" role="alert">{error}</p>}
    <Button className="primary wide" disabled={busy || inRoom && (!!room?.locked || room?.state === "closed")} type="submit">{busy ? "Đang tham gia…" : room?.state === "closed" ? "Phòng đã đóng" : inRoom && room?.locked ? "Phòng đã khóa" : "Vào phòng chờ"}<ArrowRight size={18} /></Button>
    <p className="form-footnote"><Users size={15} /> Tối đa 200 người trong một phòng</p>
  </form>;

  return <div className={`app-shell ${active ? "race-mode" : ""}`}>
    <header className="site-header"><Brand /><div className="header-actions"><span className="mock-tag">Bản thử nghiệm</span>{view === "join" ? <button className="nav-link" onClick={() => navigate("admin")}><ShieldCheck size={17} /><span>Quản trị viên</span><ChevronRight size={15} /></button> : <button className="nav-link" onClick={() => navigate("join")}><ArrowLeft size={16} /><span>Trang tham gia</span></button>}</div></header>

    {view === "join" && <main className="home"><div className="home-intro"><Pill gold><span className="tiny-star">✦</span> Cùng STAR tạo nên khoảnh khắc</Pill><h1>Một đường đua.<br />Hàng trăm <span>bất ngờ.</span></h1><p>Chọn một cái tên, nhận một chú vịt.<br />Cùng bạn bè chờ đón người về đích đầu tiên!</p><div className="intro-meta"><span><Users size={17} /> 200 người cùng chơi</span><span><Flag size={17} /> Cơ hội ngang nhau</span></div><div className="home-river"><RiverCanvas offset={0} decorative /><span className="river-caption">Cuộc vui sắp bắt đầu.</span><span className="little-spark s1">✦</span><span className="little-spark s2">✧</span></div></div><div className="home-form-wrap">{joinForm()}<div className="how-to"><span>01 <b>Nhập PIN</b></span><i /><span>02 <b>Vào phòng</b></span><i /><span>03 <b>Cổ vũ!</b></span></div></div></main>}

    {view === "admin" && <main className="admin-page"><div className="page-title"><div><Pill><ShieldCheck size={14} /> Khu vực quản trị</Pill><h1>Tạo một cuộc vui mới.</h1><p>Chuẩn bị phòng đua, mời mọi người và cùng đếm ngược.</p></div>{admin && <a className="nav-link" href="/signout-with-chatgpt?return_to=/%3Fview%3Dadmin" target="_top">Đăng xuất</a>}</div>
      {admin === null ? <div className="empty-state">Đang kiểm tra phiên đăng nhập…</div> : !admin ? <section className="login-card"><span className="mini-icon"><ShieldCheck size={28} /></span><h2>Admin STAR</h2><p>Dùng phiên đăng nhập thử nghiệm để tạo và điều khiển phòng. Bản này chưa kết nối tài khoản STAR.</p><a className="btn primary" href="/signin-with-chatgpt?return_to=/%3Fview%3Dadmin" target="_top">Đăng nhập thử nghiệm <ArrowRight size={18} /></a></section> : <div className="admin-grid"><form className="card create-room" onSubmit={event => { event.preventDefault(); run(async () => { const value = await api("rooms", { title, duration }); navigate("room", value.pin, true); setRoom(value); }); }}><div className="section-heading"><h2>Phòng đua mới</h2><span className="mini-icon"><Plus size={20} /></span></div><label htmlFor="title">Tên phòng <span>*</span></label><input id="title" value={title} onChange={e => setTitle(e.target.value)} maxLength={80} placeholder="Ví dụ: Thứ Sáu vui cùng STAR" required /><label htmlFor="duration">Thời lượng cuộc đua</label><div className="duration-control"><input id="duration" type="number" min={10} max={1800} step={1} value={duration} onChange={e => setDuration(Number(e.target.value))} required /><span>giây</span></div><div className="preset-buttons">{[30, 60, 120, 300].map(s => <button type="button" aria-pressed={duration === s} className={duration === s ? "selected" : ""} key={s} onClick={() => setDuration(s)}>{s < 60 ? `${s} giây` : `${s / 60} phút`}</button>)}</div><p className="muted">Từ 10 giây đến 30 phút. Vịt thắng chạm đích khi hết giờ.</p><div className="capacity-note"><Users size={18} /><span>Sức chứa tối đa <strong>200 người</strong></span></div>{error && <p className="error" role="alert">{error}</p>}<Button className="primary wide" disabled={busy} type="submit">{busy ? "Đang tạo…" : "Tạo phòng đua"}<Plus size={18} /></Button></form><section className="card rooms-list"><div className="section-heading"><h2>Phòng của bạn</h2><span className="muted">{rooms.length} phòng</span></div>{rooms.length === 0 ? <div className="empty-state"><Duck /><h3>Chú vịt đang đợi bạn!</h3><p>Tạo phòng đầu tiên để nhận mã PIN và QR.</p></div> : rooms.map(r => <button className="room-row" key={r.pin} onClick={() => navigate("room", r.pin, true)}><span className="room-row-icon"><Flag size={20} /></span><span><strong>{r.title}</strong><small>PIN {r.pin} · {r.count}/200 người · {fmt(r.duration)}</small></span><ChevronRight size={18} /></button>)}</section></div>}
    </main>}

    {view === "room" && !room && <main className="loading-page">{error ? <><h1>Chưa vào được phòng</h1><p role="alert">{error}</p><Button onClick={() => navigate("join")}>Nhập lại PIN <ArrowLeft size={16} /></Button></> : <><Duck /><p>Đang tìm phòng đua…</p></>}</main>}

    {view === "room" && room && room.state === "closed" && <main className="loading-page"><Flag size={40} /><h1>Cuộc vui đã khép lại.</h1><p>Phòng này đã đóng. Hẹn bạn ở cuộc đua tiếp theo!</p><Button className="primary" onClick={() => navigate("join")}>Về trang tham gia</Button></main>}

    {view === "room" && room && room.state !== "closed" && !isHost && !own && !active && <main className="room-join"><button className="nav-link" onClick={() => navigate("join")}><ArrowLeft size={16} /> Đổi phòng</button>{membership && <p className="error" role="alert">Bạn không còn trong danh sách phòng. Hãy tham gia lại nếu phòng đang mở.</p>}{joinForm(true)}</main>}

    {view === "room" && room && room.state !== "closed" && (isHost || own || active) && <main className="room-page">
      <div className="room-heading"><div><div className="room-eyebrow"><Pill>{active ? finished ? "Đã về đích" : countdown > 0 ? "Chuẩn bị xuất phát" : "Cuộc đua đang diễn ra" : "Phòng chờ"}</Pill><span className={`connection ${connection ? "" : "offline"}`}><i />{connection ? "Đã kết nối" : "Đang kết nối lại…"}</span></div><h1>{room.title}</h1></div><div className="room-tools"><span className="room-pin-small">PIN <strong>{pin}</strong></span><button className="icon-btn" onClick={toggleSound} aria-label={sound ? "Tắt âm thanh" : "Bật âm thanh"}>{sound ? <Volume2 size={20} /> : <VolumeX size={20} />}</button><button className="icon-btn" onClick={toggleFullscreen} aria-label={fullscreen ? "Thoát toàn màn hình" : "Toàn màn hình"}>{fullscreen ? <Minimize size={20} /> : <Maximize size={20} />}</button></div></div>
      {error && <div className="room-error" role="alert"><span>{error}</span><button className="icon-btn" aria-label="Đóng thông báo" onClick={() => setError("")}><X size={16} /></button></div>}

      {!active && <div className={`lobby-grid ${!isHost ? "player-lobby" : ""}`}><section className="card participants-card"><div className="section-heading"><h2>Đội vịt đã sẵn sàng <span className="count-badge">{room.count}<span>/200</span></span></h2>{room.count > 8 && <div className="search"><Search size={16} /><input aria-label="Tìm người chơi" placeholder="Tìm tên…" value={query} onChange={e => setQuery(e.target.value)} /></div>}</div>
        {own && <div className="own-duck"><Duck color={duckColors[room.players.findIndex(p => p.id === own.id) % 6]} /><div><small>Chú vịt của bạn</small><strong>{own.name}</strong></div><Check size={20} /></div>}
        {room.count === 0 ? <div className="empty-state lobby-empty"><div className="empty-ducks"><Duck /><Duck color="#9db9ed" /></div><h3>Mời những chú vịt đầu tiên</h3><p>Quét QR hoặc nhập PIN để tham gia.<br />Mọi người sẽ xuất hiện tại đây.</p></div> : <div className="player-grid">{room.players.filter(p => p.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())).map(p => <div className={`player-chip ${p.id === own?.id ? "is-own" : ""}`} key={p.id}><Duck color={duckColors[room.players.findIndex(v => v.id === p.id) % 6]} /><span title={p.name}>{p.name}</span>{isHost && <button className="remove-player" aria-label={`Xóa ${p.name}`} onClick={() => action("remove", { playerId: p.id })} disabled={busy}><X size={14} /></button>}</div>)}{query && !room.players.some(p => p.name.toLocaleLowerCase().includes(query.toLocaleLowerCase())) && <p className="muted">Không có tên phù hợp.</p>}</div>}
        <div className="lobby-bottom"><span><span className="status-dot" />{room.locked ? "Phòng đã khóa" : "Đang đón người tham gia"}</span>{isHost ? <button className="nav-link" disabled={busy} onClick={() => action("lock")}><LockKeyhole size={15} />{room.locked ? "Mở khóa phòng" : "Khóa phòng"}</button> : <button className="nav-link" disabled={busy} onClick={() => run(async () => { await api(`rooms/${pin}/leave`, { token: membership?.token }); localStorage.removeItem(`star-duck-${pin}`); navigate("join"); })}>Rời phòng</button>}</div>
      </section>
      {isHost ? <aside className="card invite-card"><div className="section-heading"><h2>Mời bạn cùng đua</h2><QrCode size={20} /></div><p className="muted">Quét mã QR bằng camera điện thoại</p><div className="qr-wrap">{qr ? <img src={qr} alt={`Mã QR tham gia phòng ${pin}`} width={204} height={204} /> : <div className="qr-placeholder" />}</div><p className="pin-label">hoặc nhập mã PIN</p><div className="big-pin">{pin}</div><button className="copy-link" onClick={copyLink}>{copied ? <Check size={15} /> : <Copy size={15} />}{copied ? "Đã sao chép" : "Sao chép liên kết"}</button><div className="invite-divider" /><label htmlFor="lobby-duration">Thời lượng đua</label><div className="lobby-duration"><input id="lobby-duration" type="number" min={10} max={1800} defaultValue={room.duration} key={room.pin} disabled={busy} onBlur={e => { const value = Number(e.target.value); if (value !== room.duration) action("settings", { duration: value }); }} /><span>giây</span></div><Button className="primary wide start-btn" disabled={busy || room.count < 2 || !connection} onClick={() => action("start")}><Play size={18} fill="currentColor" />{busy ? "Đang chuẩn bị…" : "Bắt đầu cuộc đua"}</Button><p className="start-help">{room.count < 2 ? "Cần ít nhất 2 người để bắt đầu." : "Phòng sẽ tự khóa khi bắt đầu."}</p></aside> : <aside className="player-wait-card"><span className="waiting-orbit"><Duck /></span><h2>Vịt đã vào vị trí!</h2><p>Admin sẽ bắt đầu cuộc đua.<br />Bạn cứ thư giãn và chờ tín hiệu nhé.</p><div className="waiting-duration"><Flag size={18} /><span>Cuộc đua kéo dài <strong>{fmt(room.duration)}</strong></span></div></aside>}
      </div>}

      {active && <section className="race-section"><div className="race-topline"><div className="race-stats"><Users size={18} /><strong>{room.count}</strong><span>chú vịt</span></div><div className={`race-clock ${finished ? "done" : ""}`}><small>{finished ? "Hoàn thành" : countdown > 0 ? "Xuất phát sau" : "Thời gian còn lại"}</small><strong>{countdown > 0 ? countdown : fmt(remaining)}</strong></div><span className="finish-label"><Flag size={19} /> Về đích</span></div><div className="race-river"><RiverCanvas room={room} ownId={own?.id} offset={offset} />{countdown > 0 && <div className="countdown-overlay"><strong>{countdown}</strong><span>Sẵn sàng…</span></div>}{finished && room.race?.order.length === 0 && <div className="countdown-overlay"><span>Đang xác nhận kết quả…</span></div>}</div><div className="race-caption"><span>{own ? <><Duck color={duckColors[room.players.findIndex(p => p.id === own.id) % 6]} /> Vịt của bạn: <strong>{own.name}</strong></> : <><Flag size={15} /> Cùng cổ vũ cho đội vịt STAR!</>}</span><span>{finished ? "Kết quả đã được xác nhận" : "Mỗi chú vịt · Một cơ hội như nhau"}</span></div>
        {finished && room.race!.order.length > 0 && <div className="results"><div className="results-heading"><Pill gold><Trophy size={15} /> Khoảnh khắc về đích</Pill><h2>Xin chúc mừng, {room.players.find(p => p.id === room.race!.order[0])?.name}!</h2><p>Chiếc cúp hôm nay đã tìm được chủ nhân.</p></div><div className="podium">{room.race!.order.slice(0, 3).map((id, i) => <div className={`podium-place place-${i + 1}`} key={id}><span className="podium-number">{i === 0 ? <Trophy size={24} /> : `0${i + 1}`}</span><Duck color={duckColors[room.players.findIndex(p => p.id === id) % 6]} /><strong>{room.players.find(p => p.id === id)?.name}</strong><span>Hạng {i + 1}{id === own?.id ? " · Bạn" : ""}</span></div>)}</div><div className="results-actions"><Button onClick={() => setShowRanking(!showRanking)}>{showRanking ? "Thu gọn bảng xếp hạng" : "Xem toàn bộ xếp hạng"}</Button>{isHost && <><Button onClick={exportResults}>Tải kết quả CSV</Button><Button className="primary" disabled={busy} onClick={() => action("reset")}><RotateCcw size={17} /> Đua lại</Button></>}</div>{showRanking && <ol className="ranking-list">{room.race!.order.map((id, i) => <li key={id} className={id === own?.id ? "is-own" : ""}><span>{i + 1}</span><Duck color={duckColors[room.players.findIndex(p => p.id === id) % 6]} /><strong>{room.players.find(p => p.id === id)?.name}</strong>{id === own?.id && <Pill>Bạn</Pill>}</li>)}</ol>}</div>}
      </section>}
      {isHost && !active && <div className="room-footer"><span>PIN có hiệu lực trong 24 giờ.</span><button className="nav-link" onClick={() => setConfirmClose(true)}>Đóng phòng</button></div>}
    </main>}
    <footer className="site-footer"><span>STAR EDUCATION <span className="footer-separator">/</span> Cùng nhau về đích.</span><span>Made for happy moments <Star size={12} /></span></footer>
    {confirmClose && <div className="modal-backdrop" onClick={() => setConfirmClose(false)}><section className="modal" role="dialog" aria-modal="true" aria-labelledby="close-title" onClick={e => e.stopPropagation()}><h2 id="close-title">Đóng phòng đua?</h2><p>Mọi người sẽ không thể tiếp tục tham gia phòng “{room?.title}”. Bạn có thể tạo phòng mới bất cứ lúc nào.</p><div className="modal-actions"><Button onClick={() => setConfirmClose(false)}>Hủy</Button><Button className="danger" disabled={busy} onClick={() => action("close")}>Đóng phòng</Button></div></section></div>}
  </div>;
}
