import { cleanName, RaceError } from "./race.ts";

export function parseDelimited(text: string): string[][] {
  const delimiter = text.split(/\r?\n/, 1)[0].includes("\t") ? "\t" : text.split(/\r?\n/, 1)[0].includes(";") ? ";" : ",";
  const rows: string[][] = []; let row: string[] = [], cell = "", quoted = false;
  text = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') { if (quoted && text[i + 1] === '"') { cell += '"'; i++; } else quoted = !quoted; }
    else if (!quoted && c === delimiter) { row.push(cell.trim()); cell = ""; }
    else if (!quoted && (c === "\n" || c === "\r")) { if (c === "\r" && text[i + 1] === "\n") i++; row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); row = []; cell = ""; }
    else cell += c;
  }
  if (quoted) throw new RaceError("Dấu ngoặc kép trong CSV chưa được đóng.");
  row.push(cell.trim()); if (row.some(Boolean)) rows.push(row); return rows;
}
export function validateNames(values: unknown[]) {
  if (!values.length) throw new RaceError("Danh sách chưa có tên.");
  if (values.length > 200) throw new RaceError("Mỗi phòng tối đa 200 người. Hãy rút gọn danh sách.");
  const names = values.map(v => cleanName(v)); const keys = names.map(n => n.toLocaleLowerCase("vi"));
  const duplicate = names.find((_, i) => keys.indexOf(keys[i]) !== i);
  if (duplicate) throw new RaceError(`Tên “${duplicate}” bị trùng. Hãy thêm lớp hoặc số để phân biệt.`);
  return names;
}
