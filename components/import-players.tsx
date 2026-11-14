"use client";
import { useRef, useState } from "react";
import { FileUp } from "lucide-react";
import { parseDelimited, validateNames } from "../lib/import-names";
import Dialog from "./dialog";
export default function ImportPlayers({ available, onImport, onClose }: { available: number; onImport: (names: string[]) => Promise<void>; onClose: () => void }) {
  const [text, setText] = useState(""); const [rows, setRows] = useState<string[][]>([]); const [column, setColumn] = useState(0); const [header, setHeader] = useState(false);
  const [fileName, setFileName] = useState(""); const [busy, setBusy] = useState(false); const [error, setError] = useState(""); const file = useRef<HTMLInputElement>(null);
  const names = rows.length ? rows.slice(header ? 1 : 0).map(row => row[column] || "").filter(s => s.trim()) : text.split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  async function readFile(selected: File) {
    setError(""); setBusy(true);
    try {
      if (selected.size > 2 * 1024 * 1024) throw new Error("Chọn tệp dưới 2 MB.");
      let parsed: string[][];
      if (/\.xlsx$/i.test(selected.name)) { const { readSheet } = await import("read-excel-file/browser"); const data = await readSheet(selected); parsed = data.map(row => row.map(v => v == null ? "" : String(v))); }
      else if (/\.(csv|txt|tsv)$/i.test(selected.name)) parsed = parseDelimited(await selected.text());
      else throw new Error("Hỗ trợ CSV, TXT, TSV và Excel .xlsx.");
      if (!parsed.length) throw new Error("Tệp chưa có dữ liệu.");
      const guessedColumn = parsed[0].findIndex(v => /^(họ\s*(và\s*)?tên|tên|name|full\s*name)$/i.test(v));
      setColumn(Math.max(0, guessedColumn)); setHeader(guessedColumn >= 0); setRows(parsed); setText(""); setFileName(selected.name);
    } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  async function submit() {
    setError(""); setBusy(true);
    try { const valid = validateNames(names); if (valid.length > available) throw new Error(`Phòng còn ${available} chỗ. Hãy rút gọn danh sách.`); await onImport(valid); onClose(); }
    catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  }
  return <Dialog title="Thêm danh sách người chơi" onClose={() => { if (!busy) onClose(); }} wide><p className="muted">Dành cho danh sách lớp hoặc người chơi không có điện thoại. Phòng còn {available}/200 chỗ.</p><div className="import-toolbar"><button className="btn" disabled={busy} onClick={() => file.current?.click()}><FileUp size={17} /> Nhập CSV / Excel</button><button className="btn" disabled={busy} onClick={() => { setRows([]); setFileName(""); setText(Array.from({ length: Math.min(20, available) }, (_, i) => `Vịt ${String(i + 1).padStart(2, "0")}`).join("\n")); }}>Điền 20 tên thử</button><input ref={file} type="file" aria-label="Tệp danh sách người chơi" accept=".csv,.txt,.tsv,.xlsx" hidden onChange={e => { if (e.target.files?.[0]) void readFile(e.target.files[0]); e.target.value = ""; }} /></div>
    {rows.length > 0 ? <div className="import-columns"><p><strong>{fileName}</strong></p><label htmlFor="name-column">Cột chứa tên</label><select id="name-column" value={column} onChange={e => setColumn(Number(e.target.value))}>{Array.from({ length: Math.max(...rows.slice(0, 20).map(r => r.length)) }, (_, i) => <option value={i} key={i}>Cột {i + 1}{header ? ` · ${rows[0][i] || "Không có tiêu đề"}` : ""}</option>)}</select><label className="check-field"><input type="checkbox" checked={header} onChange={e => setHeader(e.target.checked)} /> Dòng đầu là tiêu đề</label><button className="nav-link" onClick={() => { setRows([]); setText(names.join("\n")); setFileName(""); }}>Chuyển sang sửa tên trực tiếp</button></div> : <><label htmlFor="names-list">Danh sách tên · mỗi dòng một tên</label><textarea id="names-list" aria-label="Danh sách tên" rows={7} maxLength={14000} value={text} onChange={e => setText(e.target.value)} placeholder={'Nguyễn Minh Anh\nTrần Hoàng Nam\nLê Bảo Ngọc'} /></>}
    <div className="import-preview"><strong>{names.length} người sẽ được thêm</strong><div>{names.slice(0, 8).map((n, i) => <span key={i}>{n}</span>)}{names.length > 8 && <span>+{names.length - 8} tên khác</span>}</div></div>{error && <p className="error" role="alert">{error}</p>}<div className="modal-actions"><button className="btn" disabled={busy} onClick={onClose}>Hủy</button><button className="btn primary" disabled={busy || !names.length || names.length > available} onClick={submit}>{busy ? "Đang thêm…" : `Thêm ${names.length} người`}</button></div></Dialog>;
}
