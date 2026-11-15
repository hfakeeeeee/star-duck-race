"use client";
import { useState } from "react";
import { SCENES, type PublicRoom } from "../lib/race";
import Dialog from "./dialog";

export default function RoomSettings({ room, onClose, onSave }: { room: PublicRoom; onClose: () => void; onSave: (body: Record<string, unknown>) => Promise<void> }) {
  const [duration, setDuration] = useState(room.duration), [scene, setScene] = useState(room.scene), [distance, setDistance] = useState(room.distance);
  const [count, setCount] = useState(room.players.filter(p => p.isTest).length), [busy, setBusy] = useState(false), [error, setError] = useState("");
  const real = room.players.filter(p => !p.isTest).length, available = 200 - real;
  return <Dialog title="Cài đặt phòng chờ" onClose={onClose}>
    <form className="room-settings-form" onSubmit={async e => { e.preventDefault(); setBusy(true); setError(""); try { await onSave({ duration, scene, distance, testCount: count }); onClose(); } catch (e) { setError((e as Error).message); } finally { setBusy(false); } }}>
      <div className="settings-field-grid"><div><label htmlFor="lobby-duration">Thời lượng đua (giây)</label><input id="lobby-duration" type="number" min={10} max={1800} value={duration} onChange={e => setDuration(Number(e.target.value))} required /></div>
      <div><label htmlFor="lobby-distance">Chiều dài</label><select id="lobby-distance" value={distance} onChange={e => setDistance(Number(e.target.value))}>{[100,300,600,900].map(d => <option key={d} value={d}>{d} m</option>)}</select></div>
      <div className="settings-full"><label htmlFor="lobby-scene">Khung cảnh</label><select id="lobby-scene" value={scene} onChange={e => setScene(e.target.value as typeof scene)}>{SCENES.map(s => <option key={s.id} value={s.id}>{s.icon} {s.name}</option>)}</select></div></div>
      <div className="test-ducks-setting"><label htmlFor="lobby-test-count">Số vịt thử nghiệm</label><input id="lobby-test-count" type="number" min={0} max={available} step={1} value={count} onChange={e => setCount(Number(e.target.value))} required />
        <div className="preset-buttons">{[0,20,50,100,200].map(n => <button key={n} type="button" disabled={n > available} className={count === n ? "selected" : ""} aria-pressed={count === n} onClick={() => setCount(n)}>{n === 0 ? "Không dùng" : n}</button>)}</div>
        <p className="muted">{real} người thật · thêm tối đa {available} vịt thử. Đặt 0 để xóa vịt thử; người thật vẫn được giữ.</p>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="modal-actions"><button type="button" className="btn" onClick={onClose}>Hủy</button><button className="btn primary" disabled={busy}>{busy ? "Đang lưu…" : "Lưu cài đặt"}</button></div>
    </form>
  </Dialog>;
}
