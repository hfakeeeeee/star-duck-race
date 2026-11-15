"use client";
import { useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { SKINS, type SkinId } from "../lib/race";
import Duck from "./duck";
import Dialog from "./dialog";
export default function SkinPicker({ value, onChange, disabled = false }: { value: SkinId; onChange: (id: SkinId) => void; disabled?: boolean }) {
  const [expanded, setExpanded] = useState(false); const selected = SKINS.find(s => s.id === value) || SKINS[0];
  return <div className="skin-picker"><button type="button" className="skin-picker-trigger" aria-expanded={expanded} disabled={disabled} onClick={() => setExpanded(!expanded)}><Duck skin={selected.id} /><span><small>Vịt của bạn</small><strong>{selected.name}</strong></span><span className="skin-change">Đổi kiểu <ChevronDown size={15} /></span></button>{expanded && <Dialog title="Chọn kiểu vịt" onClose={() => setExpanded(false)} wide><div className="skin-gallery" aria-label="Chọn kiểu vịt">{SKINS.map(s => <button key={s.id} type="button" disabled={disabled} aria-label={`Chọn vịt ${s.name}`} aria-pressed={s.id === value} className={s.id === value ? "selected" : ""} onClick={() => { onChange(s.id); setExpanded(false); }}><Duck skin={s.id} /><span>{s.name}</span>{s.id === value && <Check size={13} />}</button>)}</div></Dialog>}</div>;
}
