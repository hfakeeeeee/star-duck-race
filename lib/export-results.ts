import { SKINS, type PublicRoom } from "./race";
const safe = (s: string) => `"${s.replace(/^\s*[=+@-]/, "'$&").replace(/"/g, '""')}"`;
function download(blob: Blob, name: string) { const url = URL.createObjectURL(blob); const a = document.createElement("a"); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); }
export function exportCSV(room: PublicRoom) {
  if (!room.race?.order.length) return;
  const rows = room.race.order.map((id, i) => { const p = room.players.find(p => p.id === id)!; const t = room.race!.finishes[id]; return [i + 1, safe(p.name), safe((SKINS.find(s => s.id === p.skin) || SKINS[0]).name), t.toFixed(3), (t - room.duration).toFixed(3)].join(","); });
  download(new Blob(["\uFEFFHạng,Tên,Kiểu vịt,Thời gian (giây),Sau vịt đầu (giây)\r\n" + rows.join("\r\n")], { type: "text/csv;charset=utf-8" }), `STAR-${room.pin}.csv`);
}
export async function exportPNG(room: PublicRoom) {
  if (!room.race?.order.length) return;
  const canvas = document.createElement("canvas"); canvas.width = 1200; canvas.height = 340 + room.count * 44;
  const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Trình duyệt chưa tạo được ảnh kết quả.");
  ctx.fillStyle = "#f8f9fc"; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = "#172b63"; ctx.fillRect(0, 0, 1200, 230);
  ctx.fillStyle = "#d2aa61"; ctx.font = "bold 24px sans-serif"; ctx.fillText("★ STAR EDUCATION · DUCK RACE", 60, 55);
  ctx.fillStyle = "white"; ctx.font = "bold 36px sans-serif";
  const title = room.title.length > 47 ? room.title.slice(0, 45) + "…" : room.title; ctx.fillText(title, 60, 112);
  ctx.font = "22px sans-serif"; ctx.fillText(`${room.count} người · PIN ${room.pin} · ${room.distance} m · ${room.duration} giây`, 60, 158);
  ctx.fillStyle = "#d2aa61"; ctx.fillRect(0, 222, 1200, 8); ctx.fillStyle = "#677086"; ctx.font = "bold 20px sans-serif";
  ctx.fillText("HẠNG", 60, 279); ctx.fillText("NGƯỜI CHƠI", 175, 279); ctx.fillText("THỜI GIAN", 830, 279); ctx.fillText("CHÊNH LỆCH", 1010, 279);
  room.race.order.forEach((id, i) => {
    const p = room.players.find(p => p.id === id)!; const t = room.race!.finishes[id], y = 314 + i * 44;
    ctx.fillStyle = i < 3 ? "#f7f0e2" : i % 2 ? "#ffffff" : "#f1f3f8"; ctx.fillRect(40, y - 26, 1120, 42);
    ctx.fillStyle = "#172b63"; ctx.font = `${i < 3 ? "bold " : ""}22px sans-serif`; ctx.fillText(String(i + 1).padStart(2, "0"), 75, y);
    ctx.beginPath(); ctx.fillStyle = (SKINS.find(s => s.id === p.skin) || SKINS[0]).color; ctx.arc(145, y - 8, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#172b63"; ctx.fillText(p.name, 175, y); ctx.fillText(`${t.toFixed(3)} s`, 830, y); ctx.fillText(i ? `+${(t - room.duration).toFixed(3)} s` : "—", 1010, y);
  });
  const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/png")); if (!blob) throw new Error("Chưa xuất được ảnh kết quả."); download(blob, `STAR-${room.pin}.png`);
}
