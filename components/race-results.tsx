"use client";
import { useEffect, useState } from "react";
import { Download, Eye, Flag, ImageDown, RotateCcw, Trophy, Users } from "lucide-react";
import { finishTime, type PublicRoom } from "../lib/race";
import { exportCSV, exportPNG } from "../lib/export-results";
import Dialog from "./dialog";
import Duck from "./duck";
import { useRaceSound } from "./race-sound";
import "./race-results.css";

type Props = { room: PublicRoom; ownId?: string; finished: boolean; completed: number; isHost: boolean; busy: boolean; onClose: () => void; onReplay: () => void; onReset: (removeWinner?: boolean) => void; onError: (message: string) => void };
const seconds = (value: number) => `${value.toFixed(3)} s`;
export default function RaceResults({ room, ownId, finished, completed, isHost, busy, onClose, onReplay, onReset, onError }: Props) {
  const race = room.race!, winner = room.players.find(p => p.id === race.order[0])!, top = race.order.slice(0, 3);
  const [ranking, setRanking] = useState(false), [error, setError] = useState("");
  const { audio, sound } = useRaceSound();
  useEffect(() => { if (sound) audio.cue("podium"); }, [audio]);
  return <Dialog title="Kết quả cuộc đua" onClose={onClose} wide variant="celebration"><div className="results">
    <div className="results-heading"><span className="award-eyebrow"><Trophy size={15} /> TOP {top.length} · STAR RIVER CLUB</span><h2>Xin chúc mừng, {winner.name}!</h2><p>Những ngôi sao của cuộc đua hôm nay.</p></div>
    <div className={`podium awards-${top.length}`}>{top.map((id, i) => { const p = room.players.find(p => p.id === id)!; return <div className={`podium-place place-${i + 1}`} key={id}>
      <div className="award-duck"><Duck skin={p.skin} /><span className="podium-number">{i === 0 ? <Trophy size={20} /> : i + 1}</span></div>
      <span className="award-place">{i === 0 ? "QUÁN QUÂN" : `HẠNG ${i + 1}`}{id === ownId ? " · BẠN" : ""}</span><strong title={p.name}>{p.name}</strong><b className="podium-time">{seconds(finishTime(race, id))}</b>
    </div>; })}</div>
    <div className="award-meta"><span><Flag size={14} /> {room.distance} m</span><span><Users size={14} /> {room.count} chú vịt</span><span>{completed}/{room.count} đã về đích</span></div>
    {!finished && <p className="award-settling">Đội vịt còn lại đang cán đích. Bạn có thể đua lại khi tất cả về đích.</p>}
    <div className="results-actions">
      {isHost && <button className="btn primary" disabled={busy || !finished} onClick={() => onReset()}><RotateCcw size={16} /> Đua lại</button>}
      <button className="btn" onClick={onReplay}><Eye size={16} /> Xem lại về đích</button>
      <button className="btn" onClick={() => setRanking(!ranking)}>{ranking ? "Thu gọn bảng xếp hạng" : "Xem toàn bộ xếp hạng"}</button>
    </div>
    <div className="award-secondary"><button onClick={() => exportCSV(room)}><Download size={14} /> Tải kết quả CSV</button><button onClick={() => exportPNG(room).catch(e => { setError(e.message); onError(e.message); })}><ImageDown size={14} /> Tải ảnh kết quả</button>{isHost && <button disabled={busy || !finished} onClick={() => onReset(true)}>Loại người thắng và đua lại</button>}</div>
    {error && <p className="error" role="alert">{error}</p>}
    {ranking && <div className="final-table-wrap"><table className="final-table"><thead><tr><th>Hạng</th><th>Người chơi</th><th>Thời gian</th><th>Chênh lệch</th></tr></thead><tbody>{race.order.map((id, i) => { const p = room.players.find(p => p.id === id)!; return <tr key={id} className={id === ownId ? "mine" : ""}><td>{i + 1}</td><td><span><Duck skin={p.skin} /><strong>{p.name}</strong>{id === ownId && <small>Bạn</small>}</span></td><td>{seconds(finishTime(race, id))}</td><td>{i ? `+${seconds(finishTime(race, id) - race.duration)}` : "—"}</td></tr>; })}</tbody></table></div>}
  </div></Dialog>;
}
