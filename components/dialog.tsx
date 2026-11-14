"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
export default function Dialog({ title, children, onClose, wide = false }: { title: string; children: ReactNode; onClose: () => void; wide?: boolean }) {
  const ref = useRef<HTMLElement>(null); const close = useRef(onClose); close.current = onClose;
  useEffect(() => {
    const before = document.activeElement as HTMLElement; const old = document.body.style.overflow; document.body.style.overflow = "hidden";
    ref.current?.querySelector<HTMLElement>("input,button,textarea,select,[tabindex]")?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.preventDefault(); close.current(); }
      if (e.key === "Tab") { const all = [...(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),textarea,select,a[href],[tabindex="0"]') || [])].filter(e => e.getClientRects().length); const first = all[0], last = all.at(-1); if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); } }
    };
    document.addEventListener("keydown", key); return () => { document.removeEventListener("keydown", key); document.body.style.overflow = old; before?.focus(); };
  }, []);
  return <div className="modal-backdrop" onClick={onClose}><section ref={ref} className={`modal ${wide ? "wide-modal" : ""}`} role="dialog" aria-modal="true" aria-label={title} onClick={e => e.stopPropagation()}><div className="modal-title"><h2>{title}</h2><button className="icon-btn" aria-label="Đóng" onClick={onClose}><X size={18} /></button></div>{children}</section></div>;
}
