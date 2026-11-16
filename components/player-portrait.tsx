"use client";
import type { SkinId } from "../lib/race";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import Duck from "./duck";

export default function PlayerPortrait({ src, skin, className = "" }: { src?: string; skin?: SkinId; className?: string }) {
  if (!src) return <Duck skin={skin} className={className} />;
  return <Avatar className={`player-portrait ${className}`}><AvatarImage src={src} alt="" /><AvatarFallback><Duck skin={skin} /></AvatarFallback></Avatar>;
}
