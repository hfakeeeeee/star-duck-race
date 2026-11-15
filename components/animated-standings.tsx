"use client";
import { useEffect, useRef, type CSSProperties } from "react";
import { Check } from "lucide-react";
import { standings } from "../lib/race";
import Duck from "./duck";
type Standing = ReturnType<typeof standings>[number];
export default function AnimatedStandings({ players, elapsed, ownId }: { players: Standing[]; elapsed: number; ownId?: string }) {
  const priorRanks = useRef(new Map<string, number>());
  const moves = useRef(new Map<string, { delta: number; until: number }>());
  const order = players.map(p => p.id).join(",");
  useEffect(() => {
    players.forEach((p, rank) => { const old = priorRanks.current.get(p.id); if (old !== undefined && old !== rank) moves.current.set(p.id, { delta: old - rank, until: Date.now() + 1000 }); });
    priorRanks.current = new Map(players.map((p, i) => [p.id, i]));
  }, [order]);
  const columns = 1, visible = Math.min(10, players.length);
  return <ol className="animated-standings" style={{ "--visible-rows": Math.ceil(visible / columns) } as CSSProperties}>
    {players.slice(0, 14).map((p, i) => {
      const move = moves.current.get(p.id); const direction = move && move.until > Date.now() ? Math.sign(move.delta) : 0;
      return <li key={p.id} data-player-id={p.id} data-rank={i + 1} aria-hidden={i >= visible} className={`${p.id === ownId ? "mine" : ""} ${i === 0 ? "leading" : ""}`} style={{ "--row": Math.floor(i / columns), "--column": i % columns, opacity: i < visible ? 1 : 0, zIndex: 20 - i } as CSSProperties}>
        <span className="live-rank">{String(i + 1).padStart(2, "0")}</span><Duck skin={p.skin} /><span className="live-name" title={p.name}>{p.name}<small>{elapsed >= p.finish ? `${p.finish.toFixed(3)} s` : `${Math.max(0, Math.min(100, p.progress * 100)).toFixed(0)}% đường đua`}</small></span>
        {elapsed >= p.finish ? <Check size={15} /> : <span className={`rank-move ${direction > 0 ? "up" : direction < 0 ? "down" : ""}`} aria-label={direction > 0 ? "Đang lên hạng" : direction < 0 ? "Đang xuống hạng" : undefined}>{direction > 0 ? "↑" : direction < 0 ? "↓" : ""}</span>}
      </li>;
    })}
  </ol>;
}
