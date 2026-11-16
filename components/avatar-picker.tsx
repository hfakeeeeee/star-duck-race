"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, LoaderCircle, X } from "lucide-react";
import PlayerPortrait from "./player-portrait";
import type { SkinId } from "../lib/race";

async function preparePhoto(file: File) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) throw new Error("Chọn ảnh JPG, PNG hoặc WebP nhé.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Chọn ảnh nhỏ hơn 5 MB nhé.");
  let image: ImageBitmap;
  try { image = await createImageBitmap(file); } catch { throw new Error("Không đọc được ảnh này. Hãy chọn ảnh khác."); }
  try {
    const canvas = document.createElement("canvas"); canvas.width = canvas.height = 128;
    const ctx = canvas.getContext("2d"); if (!ctx) throw new Error("Chưa xử lý được ảnh. Vui lòng thử lại.");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, 128, 128);
    const side = Math.min(image.width, image.height);
    ctx.drawImage(image, (image.width - side) / 2, (image.height - side) / 2, side, side, 0, 0, 128, 128);
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", .86));
    if (!blob || blob.size > 32 * 1024) throw new Error("Chưa xử lý được ảnh. Hãy chọn ảnh khác.");
    return blob;
  } finally { image.close(); }
}

export default function AvatarPicker({ value, skin, disabled = false, onChange, onProcessingChange }: { value: Blob | string | null | undefined; skin: SkinId; disabled?: boolean; onChange: (image: Blob | null) => void | Promise<void>; onProcessingChange?: (busy: boolean) => void }) {
  const input = useRef<HTMLInputElement>(null), [preview, setPreview] = useState<string>(), [processing, setProcessing] = useState(false), [error, setError] = useState("");
  const request = useRef(0);
  useEffect(() => { onProcessingChange?.(processing); }, [processing, onProcessingChange]);
  useEffect(() => {
    if (!(value instanceof Blob)) { setPreview(value || undefined); return; }
    const url = URL.createObjectURL(value); setPreview(url); return () => URL.revokeObjectURL(url);
  }, [value]);
  useEffect(() => () => { request.current++; }, []);
  async function choose(file?: File) {
    if (!file) return;
    const id = ++request.current; setProcessing(true); setError("");
    try { const image = await preparePhoto(file); if (id === request.current) await onChange(image); }
    catch (error) { if (id === request.current) setError((error as Error).message); }
    finally { if (id === request.current) setProcessing(false); }
  }
  return <div className="avatar-picker">
    <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" aria-label="Tải ảnh đại diện" hidden disabled={disabled || processing} onChange={event => { void choose(event.target.files?.[0]); event.target.value = ""; }} />
    <button type="button" className="avatar-picker-trigger" disabled={disabled || processing} aria-label={value ? "Đổi ảnh đại diện" : "Chọn ảnh đại diện"} onClick={() => input.current?.click()}>
      <span className="avatar-preview"><PlayerPortrait src={preview} skin={skin} />{processing ? <LoaderCircle size={12} className="avatar-spinner" /> : <Camera size={12} />}</span>
      <span><strong>Ảnh BXH</strong><small>{processing ? "Đang xử lý…" : value ? "Đổi ảnh" : "Thêm ảnh"}</small></span>
    </button>
    {value && <button type="button" className="avatar-remove" aria-label="Xóa ảnh đại diện" disabled={disabled || processing} onClick={() => { setError(""); void onChange(null); }}><X size={12} /></button>}
    {error && <p className="avatar-error" role="alert">{error}</p>}
  </div>;
}
