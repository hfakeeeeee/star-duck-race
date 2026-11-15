import { Flag, Pause, RotateCcw, Trophy } from "lucide-react";
import { SKINS, type PublicRoom, type standings } from "../lib/race";
import "./race-hud.css";

type Props = { room: PublicRoom; players: ReturnType<typeof standings>; elapsed: number; ownId?: string; replay: boolean; paused: boolean };
export const formatClock = (seconds: number) => { const n = Math.ceil(Math.max(0, seconds)); return `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`; };

export default function RaceHud({ room, players, elapsed, ownId, replay, paused }: Props) {
  const race = room.race!, countdown = elapsed < 0, winnerKnown = elapsed >= race.duration;
  const ready = race.ready === true;
  const completed = players.filter(p => p.finish <= elapsed).length, leader = players[0];
  const phase = replay ? "Xem lại" : ready ? "Chờ xuất phát" : paused ? "Tạm dừng" : countdown ? "Chuẩn bị" : winnerKnown ? "Về đích" : "Đang đua";
  const time = replay ? elapsed : ready ? race.duration : countdown ? -elapsed : winnerKnown ? race.duration : race.duration - elapsed;
  const lanes = new Map(race.lanes.map((id, i) => [id, i]));
  const name = countdown ? `${room.count} chú vịt cùng xuất phát` : leader?.name || "Đội vịt STAR";
  return <>
    <div className="race-hud race-hud-balanced" aria-label="Thông tin cuộc đua">
      <div className="hud-timer">
        <span className={`hud-state ${replay ? "is-replay" : paused ? "is-paused" : ""}`}>
          {replay ? <RotateCcw size={12} /> : paused ? <Pause size={12} /> : <i aria-hidden="true" />}{phase}
        </span>
        <strong>{formatClock(time)}</strong>
        <small>{replay ? "Đã phát" : ready ? "Thời lượng đua" : countdown ? "Xuất phát sau" : winnerKnown ? "Thành tích" : "Còn lại"}</small>
      </div>
      <div className="hud-leader">
        <div className="hud-leader-icon" aria-hidden="true"><Trophy size={19} /></div>
        <div className="hud-leader-copy">
          <span>{countdown ? "Cùng một vạch xuất phát" : winnerKnown ? "Về đích đầu tiên" : "Đang dẫn đầu"}</span>
          <strong title={name}>{name}</strong>
          <small>{countdown ? `${room.distance} m phía trước` : `${Math.max(0, room.distance * (1 - Math.min(1, leader?.progress || 0))).toFixed(0)} m tới đích`}</small>
        </div>
      </div>
    </div>
    <div className="race-minimap race-minimap-balanced" aria-label={`Bản đồ vị trí đàn vịt, ${completed} trên ${room.count} vịt đã về đích`}>
      <div className="minimap-meta"><span>ĐƯỜNG ĐUA STAR</span><strong>{room.distance} <small>m</small></strong><small>{room.count} chú vịt</small></div>
      <div className="minimap-course">
        <div className="minimap-endpoints"><span>Xuất phát</span><span>Về đích <Flag size={11} /></span></div>
        <svg viewBox="0 0 500 42" preserveAspectRatio="none" aria-hidden="true">
          <rect x="3" y="2" width="494" height="38" rx="7" className="minimap-river" />
          {[8, 14.5, 21, 27.5, 34].map(y => <path key={y} d={`M10 ${y}H490`} className="minimap-lane" />)}
          <path d="M10 5v32" className="minimap-start" /><path d="M490 5v32" className="minimap-goal" />
          {[...players].reverse().map(p => <circle key={p.id} className={p.id === ownId ? "minimap-duck is-mine" : "minimap-duck"}
            cx={10 + Math.max(0, Math.min(1, p.progress)) * 480} cy={8 + ((lanes.get(p.id) || 0) % 5) * 6.5} r={p.id === ownId ? 4.5 : p.id === leader?.id ? 4 : 2.7}
            fill={p.id === ownId ? "#ffffff" : (SKINS.find(s => s.id === p.skin) || SKINS[0]).color} opacity={p.progress >= 1 ? .45 : 1} />)}
        </svg>
      </div>
      <div className="minimap-finish"><strong>{completed}<small>/{room.count}</small></strong><span>đã về đích</span></div>
    </div>
  </>;
}
