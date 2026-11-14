export class RaceAudio {
  private context: AudioContext | null = null;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private volume = .35;
  private step = 0;
  private track = "bright";
  unlock() { this.context ||= new AudioContext(); void this.context.resume(); }
  setVolume(value: number) { this.volume = Math.max(0, Math.min(1, value)); }
  private note(frequency: number, duration = .18, strength = .08, type: OscillatorType = "sine", delay = 0) {
    const ac = this.context; if (!ac || ac.state !== "running") return;
    const oscillator = ac.createOscillator(), gain = ac.createGain(); oscillator.type = type; oscillator.frequency.value = frequency;
    const t = ac.currentTime + delay; gain.gain.setValueAtTime(.0001, t); gain.gain.exponentialRampToValueAtTime(Math.max(.0001, strength * this.volume), t + .015); gain.gain.exponentialRampToValueAtTime(.0001, t + duration);
    oscillator.connect(gain); gain.connect(ac.destination); oscillator.start(t); oscillator.stop(t + duration + .02);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
  cue(kind: "countdown" | "leader" | "win") {
    if (kind === "win") [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => this.note(f, .45, .22, "triangle", i * .16));
    else if (kind === "leader") { this.note(659.25, .14, .12); this.note(783.99, .2, .12, "triangle", .12); }
    else this.note(440, .16, .18, "triangle");
  }
  music(track = "bright") {
    this.track = track; if (this.musicTimer) return;
    const bright = [523, 659, 784, 659, 587, 698, 880, 698, 659, 784, 988, 784, 587, 698, 784, 0];
    const chill = [392, 0, 494, 587, 440, 0, 523, 659, 392, 0, 494, 587, 349, 0, 440, 523];
    this.musicTimer = setInterval(() => {
      const melody = this.track === "chill" ? chill : bright, i = this.step++ % 16;
      if (melody[i]) this.note(melody[i], .25, .065, "sine");
      if (i % 4 === 0) this.note(melody[i] / 4 || 131, .4, .08, "triangle");
    }, 240);
  }
  stop() { if (this.musicTimer) clearInterval(this.musicTimer); this.musicTimer = null; }
  dispose() { this.stop(); void this.context?.close(); this.context = null; }
}
