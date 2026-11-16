"use client";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { Star } from "lucide-react";

export default function StarTransition({ screen }: { screen: string | null }) {
  const previous = useRef<string | null>(null), sequence = useRef(0);
  const [burst, setBurst] = useState(0);
  useLayoutEffect(() => {
    if (!screen) return;
    if (previous.current && previous.current !== screen) setBurst(++sequence.current);
    previous.current = screen;
  }, [screen]);
  useEffect(() => { if (!burst) return; const timer = setTimeout(() => setBurst(0), 900); return () => clearTimeout(timer); }, [burst]);
  if (!burst) return null;
  return <div key={burst} className="star-transition" aria-hidden="true">
    <svg className="star-curtain" viewBox="0 0 100 100"><path d="M50 2 61.2 35 96 35.5 68.2 56.7 78.5 90 50 70 21.5 90 31.8 56.7 4 35.5 38.8 35Z" /></svg>
    <div className="star-transition-core"><Star size={50} fill="currentColor" strokeWidth={1.2} />{Array.from({ length: 8 }, (_, i) => <Star key={i} className="star-trail" size={i % 2 ? 13 : 20} fill="currentColor" style={{ "--angle": `${i * 45}deg`, "--distance": `${70 + i % 3 * 20}px` } as CSSProperties} />)}</div>
  </div>;
}
