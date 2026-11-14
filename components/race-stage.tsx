"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Check, ChevronDown, Download, Eye, Flag, ImageDown, Pause, Play, RotateCcw, SkipForward, Trophy, Volume2, VolumeX, X } from "lucide-react";
import { finishTime, raceElapsed, SKINS, standings, type PublicRoom } from "../lib/race";
import { RaceAudio } from "../lib/race-audio";
import { exportCSV, exportPNG } from "../lib/export-results";
import Duck from "./duck";
import RaceScene, { type CameraMode, type Quality } from "./race-scene";
import Dialog from "./dialog";

type Props = { room: PublicRoom; offset: number; ownId?: string; isHost: boolean; busy: boolean; onAction: (action: string, body?: Record<string, unknown>) => Promise<void>; onReact: (kind: string) => void; onError: (message: string) => void };
export const formatClock = (seconds: number) => { const n = Math.ceil(Math.max(0, seconds)); return `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`; };
const seconds = (s: number) => `${s.toFixed(3)} s`;
export default function RaceStage({ room, offset, ownId, isHost, busy, onAction, onReact, onError }: Props) {
  const race = room.race!;
  const [now, setNow] = useState(Date.now()); const [camera, setCamera] = useState<CameraMode>("follow");
  const [quality, setQuality] = useState<Quality>("auto"); const [labels, setLabels] = useState(true); const [sound, setSound] = useState(false);
  const [volume, setVolume] = useState(.35); const [track, setTrack] = useState("bright");
  const [ranking, setRanking] = useState(false); const [finishConfirm, setFinishConfirm] = useState(false); const [audioSettings, setAudioSettings] = useState(false);
  const [replay, setReplay] = useState(false); const [replayTime, setReplayTime] = useState(0); const [replayRunning, setReplayRunning] = useState(false); const [speed, setSpeed] = useState(.5);
  const audio = useRef<RaceAudio | null>(null); const cue = useRef(""); const lastLeader = useRef(""); const lastLeaderCue = useRef(0);
  const elapsed = raceElapsed(race, now + offset); const endAt = race.duration + race.tail;
  const finished = elapsed >= endAt - .000001; const winnerKnown = elapsed >= race.duration; const paused = race.pausedAt !== null;
  const displayElapsed = replay ? replayTime : Math.min(endAt, elapsed);
  const countdown = Math.ceil(Math.max(0, -elapsed)); const remaining = Math.max(0, race.duration - elapsed);
  const live = useMemo(() => standings(room, displayElapsed), [room, displayElapsed]);
  const completed = live.filter(p => p.finish <= displayElapsed).length;
  const winnerId = room.race?.order[0] || (winnerKnown ? live[0]?.id : ""); const winner = room.players.find(p => p.id === winnerId);
  const myPlace = live.findIndex(p => p.id === ownId);
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 100); return () => clearInterval(timer); }, []);
  useEffect(() => {
    if (!replayRunning) return; let last = performance.now();
    const timer = setInterval(() => { const now = performance.now(); const delta = (now - last) / 1000 * speed; last = now; setReplayTime(t => { const next = Math.min(endAt, t + delta); if (next >= endAt) setReplayRunning(false); return next; }); }, 50);
    return () => clearInterval(timer);
  }, [replayRunning, speed, endAt]);
  useEffect(() => { audio.current?.setVolume(volume); }, [volume]);
  useEffect(() => {
    if (sound && !finished && !paused && !replay && elapsed >= 0) audio.current?.music(track); else audio.current?.stop();
  }, [sound, track, finished, paused, replay, elapsed >= 0]);
  useEffect(() => {
    if (!sound || replay || paused) return;
    const value = countdown ? `count-${countdown}` : winnerKnown ? "winner" : "";
    if (value && cue.current !== value) { cue.current = value; audio.current?.cue(winnerKnown ? "win" : "countdown"); }
    const lead = live[0]?.id;
    if (lead !== lastLeader.current && !winnerKnown && elapsed > 1 && Date.now() - lastLeaderCue.current > 1600) { audio.current?.cue("leader"); lastLeaderCue.current = Date.now(); }
    lastLeader.current = lead;
  }, [countdown, winnerKnown, live[0]?.id, sound, replay, paused]);
  useEffect(() => () => audio.current?.dispose(), []);
  function toggleSound() {
    if (!sound) { audio.current ||= new RaceAudio(); audio.current.unlock(); audio.current.setVolume(volume); }
    setSound(!sound);
  }
  useEffect(() => {
    const keydown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.closest("input,textarea,select,button,[contenteditable=true],[role=dialog]") || e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.code === "KeyM") { e.preventDefault(); toggleSound(); }
      if (e.code === "Space" && isHost && elapsed >= 0 && !finished && !replay) { e.preventDefault(); void onAction(paused ? "resume" : "pause"); }
    };
    document.addEventListener("keydown", keydown); return () => document.removeEventListener("keydown", keydown);
  }, [isHost, elapsed >= 0, finished, paused, replay, sound, onAction]);
  function beginReplay() { setReplay(true); setReplayTime(Math.max(0, race.duration - 5)); setReplayRunning(true); }

  return <section className={`race-stage ${finished ? "is-finished" : ""}`}>
    <div className="race-command-bar"><div className="camera-switch" aria-label="Góc máy"><Camera size={16} />{([['follow', 'Theo dẫn đầu'], ['overview', 'Toàn cảnh'], ...(ownId ? [['mine', 'Vịt của tôi']] : [])] as [CameraMode, string][]).map(([value, label]) => <button key={value} aria-pressed={camera === value} className={camera === value ? "selected" : ""} onClick={() => setCamera(value)}>{label}</button>)}</div><div className="scene-options"><label className="label-toggle"><input type="checkbox" checked={labels} onChange={e => setLabels(e.target.checked)} /> Bảng tên</label><select aria-label="Chất lượng đồ họa" value={quality} onChange={e => setQuality(e.target.value as Quality)}><option value="auto">Đồ họa tự động</option><option value="low">Đồ họa nhẹ</option></select><button className="icon-btn" onClick={toggleSound} aria-label={sound ? "Tắt âm thanh" : "Bật âm thanh"}>{sound ? <Volume2 size={18} /> : <VolumeX size={18} />}</button><button className="icon-btn" aria-label="Cài đặt âm thanh" onClick={() => setAudioSettings(!audioSettings)}><ChevronDown size={17} /></button></div></div>
    {audioSettings && <div className="sound-settings"><label htmlFor="music-volume">Âm lượng</label><input id="music-volume" aria-label="Âm lượng" type="range" min="0" max="1" step=".05" value={volume} onChange={e => setVolume(Number(e.target.value))} /><span>{Math.round(volume * 100)}%</span><label htmlFor="music-track">Nhạc nền</label><select id="music-track" value={track} onChange={e => setTrack(e.target.value)}><option value="bright">Vui vẻ cùng STAR</option><option value="chill">Dòng sông thư giãn</option></select><span>Space: tạm dừng · M: âm thanh</span></div>}

    <div className="race-arena"><div className="scene-wrap"><RaceScene room={room} elapsed={displayElapsed} ownId={ownId} camera={camera} quality={quality} labels={labels} rate={replay ? replayRunning ? speed : 0 : paused || finished ? 0 : 1} />
      <div className="race-hud"><div className="hud-timer"><span>{replay ? "Xem lại" : paused ? "Đã tạm dừng" : countdown ? "Xuất phát sau" : winnerKnown ? "Đã về đích" : "Thời gian còn lại"}</span><strong>{replay ? formatClock(displayElapsed) : countdown || formatClock(remaining)}</strong></div><div className="hud-leader"><span>{winnerKnown && !replay ? "Quán quân" : "Đang dẫn đầu"}</span><strong>{winnerKnown && !replay ? winner?.name : live[0]?.name}</strong><small>{Math.max(0, room.distance * (1 - Math.min(1, live[0]?.progress || 0))).toFixed(0)} m tới đích</small></div></div>
      <div className="race-minimap" aria-label="Bản đồ vị trí đàn vịt"><span>Xuất phát</span><svg viewBox="0 0 500 35" preserveAspectRatio="none" aria-hidden="true"><path d="M5 17.5H490" stroke="#ffffff50" strokeWidth="2" /><path d="M490 3v29" stroke="#d2aa61" strokeWidth="3" />{live.map((p, i) => <circle key={p.id} cx={8 + Math.max(0, Math.min(1, p.progress)) * 480} cy={7 + (i % 4) * 7} r={p.id === ownId ? 4.5 : 3} fill={p.id === ownId ? "#ffffff" : i === 0 ? "#f5ce53" : (SKINS.find(s => s.id === p.skin) || SKINS[0]).color} />)}</svg><Flag size={14} /></div>
      {countdown > 0 && !replay && <div className="start-overlay"><span>Đội vịt đã vào vị trí</span><strong key={countdown}>{countdown}</strong><span>Sẵn sàng cùng STAR!</span></div>}
      {paused && !replay && <div className="pause-overlay"><Pause size={36} /><strong>Cuộc đua đang tạm dừng</strong><span>Đồng hồ và vị trí được giữ cho cả phòng.</span></div>}
      {winnerKnown && elapsed < endAt + 5 && !replay && !paused && <div className="confetti-field" aria-hidden="true">{Array.from({ length: 56 }, (_, i) => <i key={i} style={{ left: `${i * 73 % 100}%`, animationDelay: `${i % 9 * -.3}s`, animationDuration: `${2 + i % 4 * .3}s`, background: ["#d2aa61", "#fff4bc", "#172b63", "#b6d9f1"][i % 4] }} />)}</div>}
      <div className="floating-reactions" aria-hidden="true">{room.reactions.map(r => <span key={r.id} style={{ left: `${15 + r.at % 70}%` }}>{r.kind}</span>)}</div>
      <div className="scene-credit"><span>STAR RIVER CLUB</span><span>{room.distance} m · {room.count} chú vịt</span></div>
    </div>

    <aside className="live-standings"><div className="standings-heading"><h2>{finished && !replay ? "Thứ hạng cuối" : "Bảng hạng trực tiếp"}</h2><span className="live-dot">{completed}/{room.count} về đích</span></div>{ownId && myPlace >= 0 && <div className="my-live-place"><span>Vị trí của bạn</span><strong>#{myPlace + 1}<small> / {room.count}</small></strong><span>{live[myPlace].name}</span></div>}<ol>{live.slice(0, 10).map((p, i) => <li key={p.id} className={`${p.id === ownId ? "mine" : ""} ${i === 0 ? "leading" : ""}`}><span className="live-rank">{String(i + 1).padStart(2, "0")}</span><Duck skin={p.skin} /><span className="live-name" title={p.name}>{p.name}<small>{displayElapsed >= p.finish ? seconds(p.finish) : `${Math.max(0, Math.min(100, p.progress * 100)).toFixed(0)}% đường đua`}</small></span>{displayElapsed >= p.finish && <Check size={15} />}</li>)}</ol>{room.count > 10 && <p className="standings-tail">Top 10 / {room.count} người chơi</p>}</aside></div>

    <div className="race-bottom-bar"><span className="race-status-text">{race.endedEarly ? "Admin đã kết thúc cuộc đua sớm." : replay ? "Xem lại trên thiết bị của bạn" : finished ? "Tất cả vịt đã cán đích!" : winnerKnown ? "Đội vịt đang lần lượt cán đích…" : paused ? "Chờ admin tiếp tục cuộc đua" : "Cùng cổ vũ cho đội vịt STAR!"}</span><div className="race-control-buttons">{ownId && <div className="cheer-buttons">{['👏', '🔥', '⭐', '🦆'].map(kind => <button key={kind} aria-label={`Cổ vũ ${kind}`} onClick={() => onReact(kind)}>{kind}</button>)}</div>}{isHost && !finished && !replay && <><button className="btn" disabled={busy || elapsed < 0} onClick={() => void onAction(paused ? "resume" : "pause")}>{paused ? <Play size={16} /> : <Pause size={16} />}{paused ? "Tiếp tục đua" : "Tạm dừng"}</button><button className="btn" disabled={busy || elapsed < 0} onClick={() => setFinishConfirm(true)}><SkipForward size={16} /> Kết thúc ngay</button></>}</div></div>

    {replay && <div className="replay-controls"><button className="icon-btn" aria-label={replayRunning ? "Tạm dừng xem lại" : "Phát xem lại"} onClick={() => { if (replayTime >= endAt) setReplayTime(0); setReplayRunning(!replayRunning); }}>{replayRunning ? <Pause size={17} /> : <Play size={17} />}</button><label htmlFor="replay-position">{displayElapsed.toFixed(1)} s</label><input id="replay-position" aria-label="Vị trí xem lại" type="range" min="0" max={endAt} step=".05" value={replayTime} onChange={e => { setReplayRunning(false); setReplayTime(Number(e.target.value)); }} /><select aria-label="Tốc độ xem lại" value={speed} onChange={e => setSpeed(Number(e.target.value))}><option value={.25}>¼×</option><option value={.5}>½×</option><option value={1}>1×</option></select><button className="btn" onClick={() => { setReplay(false); setReplayRunning(false); }}>Đóng xem lại</button></div>}

    {finished && winner && <div className="results"><div className="results-heading"><span className="pill gold"><Trophy size={15} /> Khoảnh khắc về đích</span><h2>Xin chúc mừng, {winner.name}!</h2><p>{room.count} chú vịt, một cuộc đua đáng nhớ. Hẹn bạn ở lượt tiếp theo!</p></div><div className="podium">{race.order.slice(0, 3).map((id, i) => { const p = room.players.find(p => p.id === id)!; return <div className={`podium-place place-${i + 1}`} key={id}><span className="podium-number">{i === 0 ? <Trophy size={24} /> : `0${i + 1}`}</span><Duck skin={p.skin} /><strong>{p.name}</strong><span>Hạng {i + 1}{id === ownId ? " · Bạn" : ""}</span><b className="podium-time">{seconds(finishTime(race, id))}</b></div>; })}</div>
      <div className="results-actions"><button className="btn" onClick={() => setRanking(!ranking)}>{ranking ? "Thu gọn bảng xếp hạng" : "Xem toàn bộ xếp hạng"}</button><button className="btn" onClick={beginReplay}><Eye size={16} /> Xem lại về đích</button><button className="btn" onClick={() => exportCSV(room)}><Download size={16} /> Tải kết quả CSV</button><button className="btn" onClick={() => exportPNG(room).catch(e => onError(e.message))}><ImageDown size={16} /> Tải ảnh kết quả</button>{isHost && <button className="btn primary" disabled={busy || replay} onClick={() => void onAction("reset")}><RotateCcw size={16} /> Đua lại</button>}</div>{isHost && <button className="remove-winner-link" disabled={busy || replay} onClick={() => void onAction("reset", { removeWinner: true })}>Loại người thắng và đua lại</button>}
      {ranking && <div className="final-table-wrap"><table className="final-table"><thead><tr><th>Hạng</th><th>Người chơi</th><th>Thời gian</th><th>Chênh lệch</th></tr></thead><tbody>{race.order.map((id, i) => { const p = room.players.find(p => p.id === id)!; return <tr key={id} className={id === ownId ? "mine" : ""}><td>{i + 1}</td><td><span><Duck skin={p.skin} /><strong>{p.name}</strong>{id === ownId && <small>Bạn</small>}</span></td><td>{seconds(finishTime(race, id))}</td><td>{i ? `+${seconds(finishTime(race, id) - race.duration)}` : "—"}</td></tr>; })}</tbody></table></div>}
    </div>}
    {finishConfirm && <Dialog title="Kết thúc cuộc đua ngay?" onClose={() => setFinishConfirm(false)}><p>Bỏ qua thời gian còn lại và hiển thị kết quả của lượt đua này cho cả phòng.</p><div className="modal-actions"><button className="btn" onClick={() => setFinishConfirm(false)}>Hủy</button><button className="btn primary" disabled={busy} onClick={() => { setFinishConfirm(false); void onAction("finish"); }}>Kết thúc cuộc đua</button></div></Dialog>}
  </section>;
}
