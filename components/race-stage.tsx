"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Download, Eye, ImageDown, Pause, Play, RotateCcw, SkipForward, SlidersHorizontal, Trophy, Volume2, VolumeX, X } from "lucide-react";
import { finishTime, raceElapsed, standings, type PublicRoom } from "../lib/race";
import { RaceAudio } from "../lib/race-audio";
import { exportCSV, exportPNG } from "../lib/export-results";
import Duck from "./duck";
import RaceScene, { type CameraMode, type Quality } from "./race-scene";
import Dialog from "./dialog";
import AnimatedStandings from "./animated-standings";
import RaceHud from "./race-hud";
export { formatClock } from "./race-hud";

type Props = { room: PublicRoom; offset: number; ownId?: string; isHost: boolean; busy: boolean; onAction: (action: string, body?: Record<string, unknown>) => Promise<void>; onReact: (kind: string) => void; onError: (message: string) => void };
const seconds = (s: number) => `${s.toFixed(3)} s`;
export default function RaceStage({ room, offset, ownId, isHost, busy, onAction, onReact, onError }: Props) {
  const race = room.race!;
  const [now, setNow] = useState(Date.now()); const [camera, setCamera] = useState<CameraMode>("follow");
  const [quality, setQuality] = useState<Quality>("auto"); const [labels, setLabels] = useState(true); const [sound, setSound] = useState(true);
  const [volume, setVolume] = useState(.35); const [track, setTrack] = useState("bright");
  const [ranking, setRanking] = useState(false); const [finishConfirm, setFinishConfirm] = useState(false); const [audioSettings, setAudioSettings] = useState(false);
  const [boardOpen, setBoardOpen] = useState(false), [resultsOpen, setResultsOpen] = useState(true);
  const [replay, setReplay] = useState(false); const [replayTime, setReplayTime] = useState(0); const [replayRunning, setReplayRunning] = useState(false); const [speed, setSpeed] = useState(.5);
  const [replaySeek, setReplaySeek] = useState(0);
  const audio = useRef<RaceAudio | null>(null); const cue = useRef(""); const lastLeader = useRef(""); const lastLeaderCue = useRef(0);
  const wantsSound = useRef(sound); wantsSound.current = sound;
  const elapsed = raceElapsed(race, now + offset); const endAt = race.duration + race.tail;
  const finished = elapsed >= endAt - .000001; const winnerKnown = elapsed >= race.duration; const paused = race.pausedAt !== null;
  const displayElapsed = replay ? replayTime : Math.min(endAt, elapsed);
  const countdown = Math.ceil(Math.max(0, -elapsed));
  const live = useMemo(() => standings(room, displayElapsed), [room, displayElapsed]);
  const completed = live.filter(p => p.finish <= displayElapsed).length;
  const winnerId = room.race?.order[0] || (winnerKnown ? live[0]?.id : ""); const winner = room.players.find(p => p.id === winnerId);
  const myPlace = live.findIndex(p => p.id === ownId);
  useEffect(() => {
    const engine = audio.current ||= new RaceAudio();
    const unlock = () => { if (wantsSound.current) void engine.unlock(); };
    unlock();
    window.addEventListener("pointerdown", unlock, { capture: true, passive: true });
    window.addEventListener("keydown", unlock, true);
    return () => { window.removeEventListener("pointerdown", unlock, true); window.removeEventListener("keydown", unlock, true); engine.dispose(); };
  }, []);
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
  function toggleSound() {
    if (!sound) { audio.current ||= new RaceAudio(); void audio.current.unlock(); audio.current.setVolume(volume); }
    else audio.current?.stop();
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
  function beginReplay() { setReplaySeek(v => v + 1); setReplay(true); setReplayTime(Math.max(0, race.duration - 5)); setReplayRunning(true); }

  return <section className={`race-stage ${finished ? "is-finished" : ""} ${boardOpen ? "rank-open" : ""}`}>
    <div className="race-command-bar"><div className="camera-switch" aria-label="Góc máy"><Camera size={16} />{([['follow', 'Theo dẫn đầu'], ['overview', 'Toàn cảnh'], ...(ownId ? [['mine', 'Vịt của tôi']] : [])] as [CameraMode, string][]).map(([value, label]) => <button key={value} aria-pressed={camera === value} className={camera === value ? "selected" : ""} onClick={() => setCamera(value)}>{label}</button>)}</div><div className="scene-options"><button className="btn standings-toggle" aria-expanded={boardOpen} onClick={() => setBoardOpen(!boardOpen)}><Trophy size={16} /> Bảng hạng</button>{finished && <button className="btn" onClick={() => setResultsOpen(true)}>Kết quả</button>}<button className="icon-btn" onClick={toggleSound} aria-label={sound ? "Tắt âm thanh" : "Bật âm thanh"}>{sound ? <Volume2 size={18} /> : <VolumeX size={18} />}</button><button className="icon-btn" aria-label="Cài đặt cuộc đua" onClick={() => setAudioSettings(true)}><SlidersHorizontal size={17} /></button></div></div>
    {audioSettings && <Dialog title="Cài đặt cuộc đua" onClose={() => setAudioSettings(false)}><div className="race-settings-form"><label htmlFor="race-quality">Chất lượng đồ họa</label><select id="race-quality" value={quality} onChange={e => setQuality(e.target.value as Quality)}><option value="auto">Đồ họa tự động</option><option value="low">Đồ họa nhẹ</option></select><label className="label-toggle"><input type="checkbox" checked={labels} onChange={e => setLabels(e.target.checked)} /> Bảng tên</label><label htmlFor="music-volume">Âm lượng · {Math.round(volume * 100)}%</label><input id="music-volume" aria-label="Âm lượng" type="range" min="0" max="1" step=".05" value={volume} onChange={e => setVolume(Number(e.target.value))} /><label htmlFor="music-track">Nhạc nền</label><select id="music-track" value={track} onChange={e => setTrack(e.target.value)}><option value="bright">Ngày hội STAR</option><option value="chill">Groove bên dòng sông</option></select><p className="muted">Space: tạm dừng · M: âm thanh · Esc: đóng</p></div></Dialog>}

    <div className={`race-arena ${room.scene === "night" ? "night-arena" : ""}`}><div className="scene-wrap"><RaceScene room={room} elapsed={displayElapsed} ownId={ownId} camera={camera} quality={quality} labels={labels} offset={offset} replay={replay} seek={replaySeek} rate={replay ? replayRunning ? speed : 0 : paused || finished ? 0 : 1} />
      <RaceHud room={room} players={live} elapsed={displayElapsed} ownId={ownId} replay={replay} paused={paused} />
      {countdown > 0 && !replay && <div className="start-overlay"><span>Đội vịt đã vào vị trí</span><strong key={countdown}>{countdown}</strong><span>Sẵn sàng cùng STAR!</span></div>}
      {paused && !replay && <div className="pause-overlay"><Pause size={36} /><strong>Cuộc đua đang tạm dừng</strong><span>Đồng hồ và vị trí được giữ cho cả phòng.</span></div>}
      {winnerKnown && elapsed < endAt + 5 && !replay && !paused && <div className="confetti-field" aria-hidden="true">{Array.from({ length: 56 }, (_, i) => <i key={i} style={{ left: `${i * 73 % 100}%`, animationDelay: `${i % 9 * -.3}s`, animationDuration: `${2 + i % 4 * .3}s`, background: ["#d2aa61", "#fff4bc", "#172b63", "#b6d9f1"][i % 4] }} />)}</div>}
      <div className="floating-reactions" aria-hidden="true">{room.reactions.map(r => <span key={r.id} style={{ left: `${15 + r.at % 70}%` }}>{r.kind}</span>)}</div>
    </div>

    <aside className="live-standings" aria-label="Bảng xếp hạng"><div className="standings-heading"><div><h2>{finished && !replay ? "Thứ hạng cuối" : "Bảng hạng trực tiếp"}</h2><span className="live-dot">{completed}/{room.count} về đích</span></div><button className="icon-btn" aria-label="Đóng bảng hạng" onClick={() => setBoardOpen(false)}><X size={16} /></button></div>{ownId && myPlace >= 0 && <div className="my-live-place"><span>Vị trí của bạn</span><strong>#{myPlace + 1}<small> / {room.count}</small></strong><span>{live[myPlace].name}</span></div>}<AnimatedStandings players={live} elapsed={displayElapsed} ownId={ownId} />{room.count > 10 && <p className="standings-tail">Top 10 / {room.count} người chơi</p>}</aside></div>

    <div className="race-bottom-bar"><span className="race-status-text">{race.endedEarly ? "Admin đã kết thúc cuộc đua sớm." : replay ? "Xem lại trên thiết bị của bạn" : finished ? "Tất cả vịt đã cán đích!" : winnerKnown ? "Đội vịt đang lần lượt cán đích…" : paused ? "Chờ admin tiếp tục cuộc đua" : "Cùng cổ vũ cho đội vịt STAR!"}</span><div className="race-control-buttons">{ownId && <div className="cheer-buttons">{['👏', '🔥', '⭐', '🦆'].map(kind => <button key={kind} aria-label={`Cổ vũ ${kind}`} onClick={() => onReact(kind)}>{kind}</button>)}</div>}{isHost && !finished && !replay && <><button className="btn" disabled={busy || elapsed < 0} onClick={() => void onAction(paused ? "resume" : "pause")}>{paused ? <Play size={16} /> : <Pause size={16} />}{paused ? "Tiếp tục đua" : "Tạm dừng"}</button><button className="btn" disabled={busy || elapsed < 0} onClick={() => setFinishConfirm(true)}><SkipForward size={16} /> Kết thúc ngay</button></>}</div></div>

    {replay && <div className="replay-controls"><button className="icon-btn" aria-label={replayRunning ? "Tạm dừng xem lại" : "Phát xem lại"} onClick={() => { if (replayTime >= endAt) { setReplaySeek(v => v + 1); setReplayTime(0); } setReplayRunning(!replayRunning); }}>{replayRunning ? <Pause size={17} /> : <Play size={17} />}</button><label htmlFor="replay-position">{displayElapsed.toFixed(1)} s</label><input id="replay-position" aria-label="Vị trí xem lại" type="range" min="0" max={endAt} step=".05" value={replayTime} onChange={e => { setReplayRunning(false); setReplaySeek(v => v + 1); setReplayTime(Number(e.target.value)); }} /><select aria-label="Tốc độ xem lại" value={speed} onChange={e => setSpeed(Number(e.target.value))}><option value={.25}>¼×</option><option value={.5}>½×</option><option value={1}>1×</option></select><button className="btn" onClick={() => { setReplay(false); setReplayRunning(false); }}>Đóng xem lại</button></div>}

    {finished && winner && resultsOpen && !replay && <Dialog title="Kết quả cuộc đua" onClose={() => setResultsOpen(false)} wide><div className="results"><div className="results-heading"><span className="pill gold"><Trophy size={15} /> Khoảnh khắc về đích</span><h2>Xin chúc mừng, {winner.name}!</h2><p>{room.count} chú vịt, một cuộc đua đáng nhớ. Hẹn bạn ở lượt tiếp theo!</p></div><div className="podium">{race.order.slice(0, 3).map((id, i) => { const p = room.players.find(p => p.id === id)!; return <div className={`podium-place place-${i + 1}`} key={id}><span className="podium-number">{i === 0 ? <Trophy size={24} /> : `0${i + 1}`}</span><Duck skin={p.skin} /><strong>{p.name}</strong><span>Hạng {i + 1}{id === ownId ? " · Bạn" : ""}</span><b className="podium-time">{seconds(finishTime(race, id))}</b></div>; })}</div>
      <div className="results-actions"><button className="btn" onClick={() => setRanking(!ranking)}>{ranking ? "Thu gọn bảng xếp hạng" : "Xem toàn bộ xếp hạng"}</button><button className="btn" onClick={beginReplay}><Eye size={16} /> Xem lại về đích</button><button className="btn" onClick={() => exportCSV(room)}><Download size={16} /> Tải kết quả CSV</button><button className="btn" onClick={() => exportPNG(room).catch(e => onError(e.message))}><ImageDown size={16} /> Tải ảnh kết quả</button>{isHost && <button className="btn primary" disabled={busy || replay} onClick={() => void onAction("reset")}><RotateCcw size={16} /> Đua lại</button>}</div>{isHost && <button className="remove-winner-link" disabled={busy || replay} onClick={() => void onAction("reset", { removeWinner: true })}>Loại người thắng và đua lại</button>}
      {ranking && <div className="final-table-wrap"><table className="final-table"><thead><tr><th>Hạng</th><th>Người chơi</th><th>Thời gian</th><th>Chênh lệch</th></tr></thead><tbody>{race.order.map((id, i) => { const p = room.players.find(p => p.id === id)!; return <tr key={id} className={id === ownId ? "mine" : ""}><td>{i + 1}</td><td><span><Duck skin={p.skin} /><strong>{p.name}</strong>{id === ownId && <small>Bạn</small>}</span></td><td>{seconds(finishTime(race, id))}</td><td>{i ? `+${seconds(finishTime(race, id) - race.duration)}` : "—"}</td></tr>; })}</tbody></table></div>}
    </div></Dialog>}
    {finishConfirm && <Dialog title="Kết thúc cuộc đua ngay?" onClose={() => setFinishConfirm(false)}><p>Bỏ qua thời gian còn lại và hiển thị kết quả của lượt đua này cho cả phòng.</p><div className="modal-actions"><button className="btn" onClick={() => setFinishConfirm(false)}>Hủy</button><button className="btn primary" disabled={busy} onClick={() => { setFinishConfirm(false); void onAction("finish"); }}>Kết thúc cuộc đua</button></div></Dialog>}
  </section>;
}
