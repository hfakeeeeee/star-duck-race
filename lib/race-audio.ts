// Original layered soundtrack, scheduled on the audio clock independently of rendering.
export class RaceAudio {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private echo: DelayNode | null = null;
  private noise: AudioBuffer | null = null;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private voices = new Set<AudioScheduledSourceNode>();
  private volume = .35;
  private step = 0;
  private nextBeat = 0;
  private track = "bright";
  private wantsMusic = false;
  private quacks: AudioBuffer[] = [];
  private loadingQuacks: Promise<void> | null = null;
  private lastQuack = -1;
  private quackVoice: AudioBufferSourceNode | null = null;
  private quackGain: GainNode | null = null;
  async unlock() {
    try {
      if (!this.context || this.context.state === "closed") {
        const ac = this.context = new AudioContext();
        const master = this.master = ac.createGain(), compressor = ac.createDynamicsCompressor();
        master.gain.value = this.volume; master.connect(compressor); compressor.connect(ac.destination);
        compressor.threshold.value = -14; compressor.ratio.value = 4;
        this.musicBus = ac.createGain(); this.musicBus.connect(master);
        const echo = this.echo = ac.createDelay(1), wet = ac.createGain(), feedback = ac.createGain();
        echo.delayTime.value = .23; wet.gain.value = .13; feedback.gain.value = .23;
        echo.connect(wet); wet.connect(this.musicBus); echo.connect(feedback); feedback.connect(echo);
        this.noise = ac.createBuffer(1, ac.sampleRate, ac.sampleRate);
        const data = this.noise.getChannelData(0); for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
        void this.loadQuacks();
      }
      if (this.context.state !== "running") await this.context.resume();
      if (this.wantsMusic && !this.musicTimer) this.music(this.track);
      return this.context.state === "running";
    } catch { return false; }
  }
  setVolume(value: number) {
    this.volume = Math.max(0, Math.min(1, value));
    if (this.master && this.context) this.master.gain.setTargetAtTime(this.volume, this.context.currentTime, .03);
  }
  private loadQuacks() {
    return this.loadingQuacks ||= Promise.allSettled(["single", "bright", "chatter"].map(async name => {
      const ac = this.context; if (!ac) return;
      const response = await fetch(`/audio/quack-${name}.wav`); if (!response.ok) throw new Error("Quack unavailable");
      const buffer = await ac.decodeAudioData(await response.arrayBuffer()); this.quacks.push(buffer);
    })).then(() => {});
  }
  private quack() {
    const ac = this.context; if (!ac || ac.state !== "running" || !this.master) return;
    // Only recorded quacks belong to this cue; wait if the bank is still loading.
    if (!this.quacks.length) return;
    const choices = this.quacks.map((_, i) => i).filter(i => i !== this.lastQuack);
    const index = choices[Math.floor(Math.random() * choices.length)] ?? 0; this.lastQuack = index;
    if (this.quackVoice && this.quackGain) {
      this.quackGain.gain.setTargetAtTime(.0001, ac.currentTime, .01);
      try { this.quackVoice.stop(ac.currentTime + .04); } catch { /* previous call ended */ }
    }
    const voice = this.quackVoice = ac.createBufferSource(), gain = this.quackGain = ac.createGain();
    voice.buffer = this.quacks[index]; gain.gain.value = .78; voice.connect(gain); gain.connect(this.master); voice.start();
    voice.onended = () => { voice.disconnect(); gain.disconnect(); if (this.quackVoice === voice) { this.quackVoice = null; this.quackGain = null; } };
  }
  private burst(at: number, duration: number, strength: number, frequency: number) {
    const ac = this.context; if (!ac || !this.noise || !this.master) return;
    const source = ac.createBufferSource(), filter = ac.createBiquadFilter(), gain = ac.createGain();
    source.buffer = this.noise; filter.type = "bandpass"; filter.frequency.value = frequency; filter.Q.value = .7;
    gain.gain.setValueAtTime(.0001, at); gain.gain.exponentialRampToValueAtTime(strength, at + .006); gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
    source.connect(filter); filter.connect(gain); gain.connect(this.master); source.start(at); source.stop(at + duration + .01);
    source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); };
  }
  private tone(midi: number, at: number, duration: number, strength: number, type: OscillatorType = "triangle", music = true, pluck = false) {
    const ac = this.context; if (!ac || ac.state !== "running" || !this.master) return;
    const voice = ac.createOscillator(), gain = ac.createGain(), filter = ac.createBiquadFilter();
    voice.type = type; voice.frequency.value = 440 * 2 ** ((midi - 69) / 12);
    filter.type = "lowpass"; filter.frequency.setValueAtTime(pluck ? 4500 : 2200, at);
    filter.frequency.exponentialRampToValueAtTime(pluck ? 650 : 1300, at + duration);
    gain.gain.setValueAtTime(.0001, at); gain.gain.exponentialRampToValueAtTime(strength, at + .008);
    gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
    voice.connect(filter); filter.connect(gain); gain.connect(music ? this.musicBus! : this.master);
    if (music && pluck && this.echo) gain.connect(this.echo);
    if (music) this.voices.add(voice);
    voice.start(at); voice.stop(at + duration + .02);
    voice.onended = () => { this.voices.delete(voice); voice.disconnect(); filter.disconnect(); gain.disconnect(); };
  }
  private drum(kind: "kick" | "snare" | "hat", at: number, strength: number) {
    const ac = this.context; if (!ac || !this.musicBus || !this.noise) return;
    const gain = ac.createGain(); gain.connect(this.musicBus);
    const duration = kind === "kick" ? .18 : kind === "snare" ? .12 : .045;
    gain.gain.setValueAtTime(strength, at); gain.gain.exponentialRampToValueAtTime(.0001, at + duration);
    let voice: AudioScheduledSourceNode, filter: BiquadFilterNode | undefined;
    if (kind === "kick") {
      const osc = ac.createOscillator(); osc.frequency.setValueAtTime(135, at); osc.frequency.exponentialRampToValueAtTime(44, at + .13); osc.connect(gain); voice = osc;
    } else {
      const source = ac.createBufferSource(); source.buffer = this.noise;
      filter = ac.createBiquadFilter(); filter.type = "highpass"; filter.frequency.value = kind === "hat" ? 7200 : 1400;
      source.connect(filter); filter.connect(gain); voice = source;
    }
    this.voices.add(voice); voice.start(at); voice.stop(at + duration + .01);
    voice.onended = () => { this.voices.delete(voice); voice.disconnect(); filter?.disconnect(); gain.disconnect(); };
  }
  cue(kind: "countdown" | "leader" | "win" | "podium" | "join" | "tap") {
    const at = this.context?.currentTime ?? 0;
    if (kind === "leader") this.quack();
    else if (kind === "win") {
      this.burst(at, .4, .24, 1500);
      [72, 76, 79, 84, 88].forEach((m, i) => this.tone(m, at + i * .075, .32, .16, "triangle", false));
      this.tone(48, at, .6, .2, "triangle", false);
    } else if (kind === "podium") {
      [72,72,72,76,79,84].forEach((m,i) => { this.tone(m,at + i * .14,i === 5 ? .85 : .2,.14,"triangle",false); this.tone(m-12,at+i*.14,.35,.07,"sine",false); });
      [60,64,67,72].forEach(m=>this.tone(m,at+.85,1.1,.07,"triangle",false));
      for (let i=0;i<28;i++) this.burst(at+.4+i*.065,.045+i%3*.012,.1+i%4*.012,1100+i%5*450);
    } else if (kind === "join") { this.tone(76, at, .12, .1, "sine", false); this.tone(84, at+.08, .2, .1, "triangle", false); }
    else if (kind === "tap") this.tone(83, at, .045, .035, "sine", false);
    else this.tone(69, at, .16, .16, "triangle", false);
  }
  music(track = "bright") {
    if (this.track !== track && this.musicTimer) this.stop();
    this.track = track; this.wantsMusic = true;
    if (this.musicTimer || !this.context || this.context.state !== "running") return;
    this.musicBus?.gain.setTargetAtTime(1, this.context.currentTime, .04);
    this.step = 0; this.nextBeat = this.context.currentTime + .04;
    this.schedule(); this.musicTimer = setInterval(() => this.schedule(), 25);
  }
  private schedule() {
    const ac = this.context; if (!ac || ac.state !== "running") return;
    const ambient = ["lobby", "ready", "podium"].includes(this.track);
    const groovy = this.track === "chill", tick = 60 / (this.track === "lobby" ? 104 : this.track === "ready" ? 112 : this.track === "podium" ? 96 : groovy ? 116 : 128) / 4;
    // Cmaj7 / Am7 / Fmaj7 / G6; two eight-bar phrases with replies and drum fills.
    const chords = [[60,64,67,71], [57,60,64,67], [53,57,60,64], [55,59,62,67]];
    const melody = [[76,0,79,0,81,79,76,0,74,0,76,79,0,76,74,0],
      [72,0,76,0,79,0,81,79,76,0,72,0,74,76,0,0],
      [77,0,76,0,72,0,69,72,0,74,76,0,77,76,72,0],
      [74,0,79,0,83,81,79,0,76,0,74,0,71,74,79,0]];
    if (this.nextBeat < ac.currentTime - .1) this.nextBeat = ac.currentTime + .02;
    while (this.nextBeat < ac.currentTime + .13) {
      const n = this.step++, s = n % 16, bar = Math.floor(n / 16) % 16, chord = chords[bar % 4], at = this.nextBeat;
      if (ambient) {
        const lobby = this.track === "lobby", podium = this.track === "podium";
        const phrase = lobby ? [72,0,76,79,0,76,74,0,72,0,67,0,69,72,0,0]
          : podium ? [84,0,79,0,76,0,79,0,81,0,79,0,76,0,72,0]
          : [67,0,72,0,74,0,76,0,79,0,76,0,74,0,72,0];
        if (s % 8 === 0) { chord.forEach(m=>this.tone(m,at,tick*7,.022,"sine")); this.tone(chord[0]-24,at,tick*5,.095,"triangle"); }
        if (phrase[s]) this.tone(phrase[s] + (bar % 2 ? -5 : 0),at,tick*(podium ? 3 : 2),lobby ? .065 : .05,"triangle",true,true);
        if (!podium && s % 4 === 2) this.drum("hat",at,.022);
        if (!lobby && !podium && (s===0||s===8)) this.drum("kick",at,.09);
        this.nextBeat += tick; continue;
      }
      if (s === 0 || s === 8 || (s === 14 && bar % 2 === 1)) this.drum("kick", at, .25);
      if (s === 4 || s === 12) { this.drum("snare", at, .13); this.tone(50, at, .07, .035, "triangle"); }
      if (s % 2 === 0 || (bar % 4 === 3 && s > 11)) this.drum("hat", at, s % 4 === 2 ? .065 : .035);
      if ([0, 6, 8, 14].includes(s)) this.tone(chord[s === 6 ? 2 : 0] - 24, at, tick * 2.3, .17, "triangle");
      if ([2, 6, 10, 14].includes(s)) chord.forEach(m => this.tone(m, at, tick * (groovy ? 2.1 : 1.4), .028, "triangle", true, true));
      const m = melody[bar % 4][s];
      if (m && (!groovy || s % 4 !== 2)) this.tone(m + (bar >= 8 && s < 8 ? 12 : 0), at, tick * (s % 4 === 0 ? 2.5 : 1.5), groovy ? .065 : .085, groovy ? "sine" : "triangle", true, true);
      if (bar % 4 === 3 && s >= 14) this.drum("snare", at, .045);
      this.nextBeat += tick;
    }
  }
  stop() {
    this.wantsMusic = false;
    if (this.musicTimer) clearInterval(this.musicTimer); this.musicTimer = null;
    if (this.context) this.musicBus?.gain.setTargetAtTime(0, this.context.currentTime, .025);
    for (const voice of this.voices) { try { voice.stop((this.context?.currentTime ?? 0) + .08); } catch { /* already ended */ } }
    this.voices.clear();
  }
  dispose() { this.stop(); void this.context?.close(); this.context = null; this.master = this.musicBus = null; this.echo = null; this.noise = null; this.quacks = []; this.loadingQuacks = null; }
}
