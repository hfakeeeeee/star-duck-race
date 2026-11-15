"use client";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { RaceAudio } from "../lib/race-audio";

type SoundState = { audio: RaceAudio; sound: boolean; volume: number; track: string; toggleSound: () => void; setVolume: (value: number) => void; setTrack: (value: string) => void };
const SoundContext = createContext<SoundState | null>(null);
export function RaceSoundProvider({ children }: { children: ReactNode }) {
  const [audio] = useState(() => new RaceAudio());
  const [sound, setSound] = useState(true), [volume, setVolume] = useState(.35), [track, setTrack] = useState("bright");
  const wanted = useRef(sound); wanted.current = sound;
  useEffect(() => {
    const unlock = () => { if (wanted.current) void audio.unlock(); };
    const click = (e: MouseEvent) => {
      const target = e.target as Element;
      if (wanted.current && target.closest("button,a") && !target.closest('[data-sound="silent"]')) audio.cue("tap");
    };
    unlock(); window.addEventListener("pointerdown", unlock, { capture: true, passive: true }); window.addEventListener("keydown", unlock, true); document.addEventListener("click", click, true);
    return () => { window.removeEventListener("pointerdown", unlock, true); window.removeEventListener("keydown", unlock, true); document.removeEventListener("click", click, true); audio.dispose(); };
  }, [audio]);
  useEffect(() => { audio.setVolume(sound ? volume : 0); if (!sound) audio.stop(); }, [audio, sound, volume]);
  const toggleSound = () => { const next = !sound; wanted.current = next; audio.setVolume(next ? volume : 0); if (next) void audio.unlock(); else audio.stop(); setSound(next); };
  return <SoundContext.Provider value={{ audio, sound, volume, track, toggleSound, setVolume, setTrack }}>{children}</SoundContext.Provider>;
}
export function useRaceSound() { const value = useContext(SoundContext); if (!value) throw new Error("RaceSoundProvider is required"); return value; }
