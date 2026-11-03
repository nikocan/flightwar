import { useSettings } from '../state/settings';

type MusicMood = 'menu' | 'battle' | 'boss' | 'none';

/**
 * Fully procedural Web Audio engine: every sound and the music are synthesized at runtime,
 * so the game ships without any third-party audio assets.
 */
class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private musicBus!: GainNode;
  private sfxBus!: GainNode;
  private uiBus!: GainNode;
  private noise!: AudioBuffer;
  private engineOsc: OscillatorNode[] = [];
  private engineGain: GainNode | null = null;
  private engineFilter: BiquadFilterNode | null = null;
  private lastPlayed = new Map<string, number>();
  private mood: MusicMood = 'none';
  private musicTimer: number | null = null;
  private nextNoteTime = 0;
  private step = 0;
  private unsubscribe: (() => void) | null = null;

  /** Must be called from a user gesture (browsers block audio until then). */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return;
    try {
      this.ctx = new Ctor();
    } catch {
      return;
    }
    const ctx = this.ctx;
    this.master = ctx.createGain();
    this.master.gain.value = 0.9;
    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14;
    comp.ratio.value = 4;
    this.master.connect(comp).connect(ctx.destination);
    this.musicBus = ctx.createGain();
    this.sfxBus = ctx.createGain();
    this.uiBus = ctx.createGain();
    this.musicBus.connect(this.master);
    this.sfxBus.connect(this.master);
    this.uiBus.connect(this.master);

    const len = ctx.sampleRate;
    this.noise = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;

    this.applyVolumes();
    this.unsubscribe = useSettings.subscribe(() => this.applyVolumes());
    if (this.mood !== 'none') this.startMusicLoop();
  }

  private applyVolumes(): void {
    if (!this.ctx) return;
    const s = useSettings.getState();
    const t = this.ctx.currentTime;
    this.musicBus.gain.setTargetAtTime(s.musicVolume * 0.32, t, 0.05);
    this.sfxBus.gain.setTargetAtTime(s.sfxVolume * 0.8, t, 0.05);
    this.uiBus.gain.setTargetAtTime(s.uiVolume * 0.6, t, 0.05);
  }

  /** Simple per-sound rate limiter so dense combat does not turn into noise. */
  private allow(key: string, minGap: number): boolean {
    if (!this.ctx) return false;
    const now = this.ctx.currentTime;
    const last = this.lastPlayed.get(key) ?? -1;
    if (now - last < minGap) return false;
    this.lastPlayed.set(key, now);
    return true;
  }

  private tone(
    bus: GainNode, type: OscillatorType, f0: number, f1: number, dur: number, vol: number, delay = 0,
  ): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime + delay;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(bus);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noiseBurst(bus: GainNode, dur: number, vol: number, freq: number, q = 0.8, type: BiquadFilterType = 'lowpass', delay = 0): void {
    const ctx = this.ctx!;
    const t = ctx.currentTime + delay;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.playbackRate.value = 0.7 + Math.random() * 0.6;
    const f = ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(freq, t);
    f.frequency.exponentialRampToValueAtTime(Math.max(40, freq * 0.2), t + dur);
    f.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(bus);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.05);
  }

  // ───────────── gameplay sounds ──

  shot(kind: string): void {
    if (!this.allow('shot', 0.05)) return;
    const b = this.sfxBus;
    switch (kind) {
      case 'laser':
      case 'beam':
        this.tone(b, 'sawtooth', 1400, 300, 0.12, 0.07);
        break;
      case 'plasma':
      case 'blast':
        this.tone(b, 'square', 500, 90, 0.22, 0.08);
        break;
      default:
        this.tone(b, 'square', 900 + Math.random() * 120, 220, 0.07, 0.05);
        this.noiseBurst(b, 0.05, 0.05, 4000, 0.7, 'highpass');
    }
  }

  missile(): void {
    if (!this.allow('missile', 0.08)) return;
    this.noiseBurst(this.sfxBus, 0.5, 0.18, 2200, 1.2, 'bandpass');
    this.tone(this.sfxBus, 'sawtooth', 180, 520, 0.4, 0.05);
  }

  enemyShot(heavy: boolean): void {
    if (!this.allow('eshot', 0.07)) return;
    this.tone(this.sfxBus, 'triangle', heavy ? 320 : 620, heavy ? 120 : 260, heavy ? 0.25 : 0.14, heavy ? 0.08 : 0.045);
  }

  hit(crit: boolean): void {
    if (!this.allow('hit', 0.035)) return;
    this.tone(this.sfxBus, 'triangle', crit ? 1800 : 1200, crit ? 900 : 500, 0.06, crit ? 0.09 : 0.05);
  }

  explosion(size: number): void {
    if (!this.allow('boom', 0.04)) return;
    const big = Math.min(1, size / 5);
    this.noiseBurst(this.sfxBus, 0.45 + big * 0.9, 0.28 + big * 0.25, 1600 - big * 600, 0.6);
    this.tone(this.sfxBus, 'sine', 140 - big * 60, 40, 0.4 + big * 0.6, 0.25 + big * 0.2);
  }

  playerHit(shieldOnly: boolean): void {
    if (!this.allow('phit', 0.08)) return;
    if (shieldOnly) {
      this.tone(this.sfxBus, 'sine', 600, 1200, 0.18, 0.12);
    } else {
      this.noiseBurst(this.sfxBus, 0.25, 0.3, 900, 1);
      this.tone(this.sfxBus, 'square', 200, 70, 0.25, 0.1);
    }
  }

  pickup(): void {
    const b = this.sfxBus;
    [660, 880, 1320].forEach((f, i) => this.tone(b, 'sine', f, f * 1.02, 0.14, 0.12, i * 0.06));
  }

  dash(): void {
    this.noiseBurst(this.sfxBus, 0.3, 0.2, 5000, 0.6, 'bandpass');
  }

  special(): void {
    const b = this.sfxBus;
    this.tone(b, 'sawtooth', 220, 880, 0.45, 0.09);
    this.tone(b, 'sine', 440, 1760, 0.45, 0.08, 0.05);
  }

  lock(on: boolean): void {
    this.tone(this.uiBus, 'square', on ? 1200 : 700, on ? 1600 : 500, 0.09, 0.06);
    if (on) this.tone(this.uiBus, 'square', 1600, 1800, 0.08, 0.05, 0.1);
  }

  lightning(): void {
    this.noiseBurst(this.sfxBus, 0.5, 0.25, 7000, 2, 'highpass');
    this.tone(this.sfxBus, 'sawtooth', 2000, 100, 0.35, 0.08);
  }

  warning(): void {
    if (!this.allow('warn', 0.6)) return;
    [0, 0.28].forEach((d) => this.tone(this.sfxBus, 'square', 880, 660, 0.22, 0.1, d));
  }

  bossRoar(): void {
    this.tone(this.sfxBus, 'sawtooth', 90, 45, 1.4, 0.2);
    this.noiseBurst(this.sfxBus, 1.2, 0.2, 500, 0.8);
  }

  victory(): void {
    const b = this.musicBus;
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) => this.tone(b, 'triangle', f, f, i === 5 ? 0.9 : 0.22, 0.5, i * 0.16));
  }

  defeat(): void {
    const b = this.musicBus;
    [392, 349, 311, 262].forEach((f, i) => this.tone(b, 'triangle', f, f * 0.98, 0.45, 0.45, i * 0.3));
  }

  uiClick(): void {
    this.unlock();
    if (!this.ctx) return;
    this.tone(this.uiBus, 'sine', 900, 1300, 0.07, 0.12);
  }

  uiHover(): void {
    if (!this.ctx || !this.allow('hover', 0.05)) return;
    this.tone(this.uiBus, 'sine', 1500, 1600, 0.03, 0.04);
  }

  // ───────────── engine hum ──

  startEngine(): void {
    if (!this.ctx || this.engineGain) return;
    const ctx = this.ctx;
    this.engineGain = ctx.createGain();
    this.engineGain.gain.value = 0;
    this.engineFilter = ctx.createBiquadFilter();
    this.engineFilter.type = 'lowpass';
    this.engineFilter.frequency.value = 500;
    this.engineFilter.connect(this.engineGain).connect(this.sfxBus);
    for (const [f, type] of [[55, 'sawtooth'], [82.5, 'triangle'], [110.7, 'sawtooth']] as const) {
      const o = ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      o.connect(this.engineFilter);
      o.start();
      this.engineOsc.push(o);
    }
    this.engineGain.gain.setTargetAtTime(0.05, ctx.currentTime, 0.5);
  }

  /** `intensity` 0..1 (speed / boost). */
  setEngine(intensity: number): void {
    if (!this.ctx || !this.engineFilter || !this.engineGain) return;
    const t = this.ctx.currentTime;
    this.engineFilter.frequency.setTargetAtTime(400 + intensity * 900, t, 0.1);
    this.engineOsc.forEach((o, i) => o.detune.setTargetAtTime(intensity * 300 + i * 5, t, 0.15));
    this.engineGain.gain.setTargetAtTime(0.04 + intensity * 0.04, t, 0.15);
  }

  stopEngine(): void {
    if (!this.ctx || !this.engineGain) return;
    const t = this.ctx.currentTime;
    this.engineGain.gain.setTargetAtTime(0, t, 0.15);
    const oscs = this.engineOsc;
    this.engineOsc = [];
    this.engineGain = null;
    this.engineFilter = null;
    setTimeout(() => oscs.forEach((o) => o.stop()), 600);
  }

  // ───────────── procedural music ──

  setMusic(mood: MusicMood): void {
    if (mood === this.mood) return;
    this.mood = mood;
    if (mood === 'none') {
      if (this.musicTimer !== null) clearInterval(this.musicTimer);
      this.musicTimer = null;
      return;
    }
    this.startMusicLoop();
  }

  private startMusicLoop(): void {
    if (!this.ctx || this.musicTimer !== null) return;
    this.nextNoteTime = this.ctx.currentTime + 0.1;
    this.step = 0;
    this.musicTimer = window.setInterval(() => this.scheduleMusic(), 90);
  }

  private scheduleMusic(): void {
    const ctx = this.ctx;
    if (!ctx || this.mood === 'none') return;
    const bpm = this.mood === 'menu' ? 92 : this.mood === 'boss' ? 138 : 124;
    const stepDur = 60 / bpm / 4;
    // A minor / F / C / G progression.
    const roots = [57, 53, 48, 55];
    while (this.nextNoteTime < ctx.currentTime + 0.25) {
      const bar = Math.floor(this.step / 16) % 4;
      const s = this.step % 16;
      const root = roots[bar];
      const t = this.nextNoteTime;
      const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
      const note = (freq: number, dur: number, vol: number, type: OscillatorType) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = type;
        o.frequency.value = freq;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g).connect(this.musicBus);
        o.start(t);
        o.stop(t + dur + 0.05);
      };
      if (this.mood === 'menu') {
        if (s % 4 === 0) note(midi(root - 12), stepDur * 4, 0.25, 'sine');
        const arp = [0, 7, 12, 15, 19, 15, 12, 7];
        if (s % 2 === 0) note(midi(root + arp[(s / 2) % 8]), stepDur * 3, 0.07, 'triangle');
        if (s === 0) [0, 3, 7].forEach((iv) => note(midi(root + iv), stepDur * 16, 0.04, 'sine'));
      } else {
        const bassPattern = [0, 0, 12, 0, 0, 12, 0, 7];
        note(midi(root - 12 + bassPattern[s % 8]), stepDur * 0.9, 0.22, 'sawtooth');
        const lead = this.mood === 'boss' ? [0, 3, 7, 10, 12, 10, 7, 3] : [12, 7, 3, 7, 12, 15, 12, 7];
        if (s % 2 === 1) note(midi(root + 12 + lead[(this.step >> 1) % 8]), stepDur * 1.5, 0.05, 'square');
        // Kick and hat
        if (s % 4 === 0) {
          const o = ctx.createOscillator();
          const g = ctx.createGain();
          o.frequency.setValueAtTime(150, t);
          o.frequency.exponentialRampToValueAtTime(40, t + 0.12);
          g.gain.setValueAtTime(0.5, t);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
          o.connect(g).connect(this.musicBus);
          o.start(t);
          o.stop(t + 0.2);
        }
        if (s % 2 === 1) {
          const src = ctx.createBufferSource();
          src.buffer = this.noise;
          const f = ctx.createBiquadFilter();
          f.type = 'highpass';
          f.frequency.value = 7000;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0.08, t);
          g.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
          src.connect(f).connect(g).connect(this.musicBus);
          src.start(t, Math.random() * 0.5);
          src.stop(t + 0.06);
        }
      }
      this.nextNoteTime += stepDur;
      this.step++;
    }
  }

  dispose(): void {
    this.setMusic('none');
    this.stopEngine();
    this.unsubscribe?.();
  }
}

export const audio = new AudioEngine();
