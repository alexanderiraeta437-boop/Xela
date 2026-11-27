/**
 * Sistema de audio 100% offline para las batallas de "Xela: Combates 1 vs 1".
 * Utiliza Web Audio API para síntesis de música épica (6/8 en Re menor),
 * campana de ring y efectos de combate, junto con SpeechSynthesis en español.
 */

export type MusicMode = "none" | "dashboard" | "battle";

export interface BattleAudioState {
  muted: boolean;
  volume: number;
  musicActive: boolean;
  musicMode: MusicMode;
}

export interface VoiceLineOptions {
  /** Tono de voz (0.5 - 2.0). */
  pitch?: number;
  /** Velocidad de habla (0.5 - 2.0). */
  rate?: number;
  /** Si es true, ajusta parámetros para mayor dramatismo. */
  critical?: boolean;
}

const VOICE_LINES = [
  "¡Ah, me has golpeado!",
  "¡Eso sí dolió!",
  "¡No me rendiré!",
  "¡Buen golpe!",
] as const;

/** Duración de cada corchea en compás 6/8 (~116 BPM de negra con puntillo). */
const EIGHTH_NOTE_SEC = 0.172;
const DASHBOARD_STEP_SEC = 0.52;
const DASHBOARD_TOTAL_STEPS = 16;
const LOOKAHEAD_MS = 25;
const SCHEDULE_AHEAD_SEC = 0.14;
const TOTAL_STEPS = 48; // 8 compases * 6 corcheas

// Frecuencias en Re menor (D natural / harmonic minor)
const NOTE = {
  E2: 82.41,
  F2: 87.31,
  G2: 98.0,
  A2: 110.0,
  Bb2: 116.54,
  C3: 130.81,
  Cs3: 138.59,
  D2: 73.42,
  D3: 146.83,
  E3: 164.81,
  F3: 174.61,
  G3: 196.0,
  A3: 220.0,
  Bb3: 233.08,
  C4: 261.63,
  Cs4: 277.18,
  D4: 293.66,
  E4: 329.63,
  F4: 349.23,
  G4: 392.0,
  A4: 440.0,
  Bb4: 466.16,
  C5: 523.25,
  Cs5: 554.37,
  D5: 587.33,
  E5: 659.25,
} as const;

interface MelodyEvent {
  freq: number;
  /** Duración en corcheas. */
  steps: number;
  accent?: boolean;
}

/**
 * Patrón de bajo staccato en 6/8 (48 pasos = 8 compases en Re menor).
 */
const BASS_PATTERN: readonly number[] = [
  // Compás 1 (Dm)
  NOTE.D2, NOTE.D3, NOTE.D2, NOTE.A2, NOTE.D3, NOTE.A2,
  // Compás 2 (Dm)
  NOTE.D2, NOTE.A2, NOTE.D3, NOTE.D2, NOTE.F2, NOTE.A2,
  // Compás 3 (Bb)
  NOTE.Bb2, NOTE.Bb2, NOTE.F2, NOTE.Bb2, NOTE.F2, NOTE.Bb2,
  // Compás 4 (A7)
  NOTE.A2, NOTE.E2, NOTE.A2, NOTE.Cs3, NOTE.A2, NOTE.E2,
  // Compás 5 (Dm)
  NOTE.D2, NOTE.A2, NOTE.D2, NOTE.D2, NOTE.F2, NOTE.A2,
  // Compás 6 (Gm)
  NOTE.G2, NOTE.D2, NOTE.G2, NOTE.Bb2, NOTE.G2, NOTE.D2,
  // Compás 7 (Bb -> A7)
  NOTE.Bb2, NOTE.F2, NOTE.Bb2, NOTE.A2, NOTE.E2, NOTE.A2,
  // Compás 8 (A7 turnaround)
  NOTE.A2, NOTE.A2, NOTE.E2, NOTE.Cs3, NOTE.E2, NOTE.A2,
];

/**
 * Melodía épica de cuerdas/metales indexada por paso de corchea (0..47).
 */
const MELODY_EVENTS: Readonly<Record<number, MelodyEvent>> = {
  // Compás 1: D4(2) E4(1) F4(2) G4(1)
  0: { freq: NOTE.D4, steps: 2, accent: true },
  2: { freq: NOTE.E4, steps: 1 },
  3: { freq: NOTE.F4, steps: 2, accent: true },
  5: { freq: NOTE.G4, steps: 1 },
  // Compás 2: A4(3) D5(2) C5(1)
  6: { freq: NOTE.A4, steps: 3, accent: true },
  9: { freq: NOTE.D5, steps: 2, accent: true },
  11: { freq: NOTE.C5, steps: 1 },
  // Compás 3: Bb4(2) A4(1) G4(2) F4(1)
  12: { freq: NOTE.Bb4, steps: 2, accent: true },
  14: { freq: NOTE.A4, steps: 1 },
  15: { freq: NOTE.G4, steps: 2, accent: true },
  17: { freq: NOTE.F4, steps: 1 },
  // Compás 4: E4(3) A4(2) G4(1)
  18: { freq: NOTE.E4, steps: 3, accent: true },
  21: { freq: NOTE.A4, steps: 2 },
  23: { freq: NOTE.G4, steps: 1 },
  // Compás 5: F4(2) G4(1) A4(2) D5(1)
  24: { freq: NOTE.F4, steps: 2, accent: true },
  26: { freq: NOTE.G4, steps: 1 },
  27: { freq: NOTE.A4, steps: 2, accent: true },
  29: { freq: NOTE.D5, steps: 1 },
  // Compás 6: G4(2) A4(1) Bb4(2) D5(1)
  30: { freq: NOTE.G4, steps: 2, accent: true },
  32: { freq: NOTE.A4, steps: 1 },
  33: { freq: NOTE.Bb4, steps: 2, accent: true },
  35: { freq: NOTE.D5, steps: 1 },
  // Compás 7: D5(2) Bb4(1) A4(2) G4(1)
  36: { freq: NOTE.D5, steps: 2, accent: true },
  38: { freq: NOTE.Bb4, steps: 1 },
  39: { freq: NOTE.A4, steps: 2, accent: true },
  41: { freq: NOTE.G4, steps: 1 },
  // Compás 8: F4(2) E4(1) C#4(2) E4(1)
  42: { freq: NOTE.F4, steps: 2, accent: true },
  44: { freq: NOTE.E4, steps: 1 },
  45: { freq: NOTE.Cs4, steps: 2, accent: true },
  47: { freq: NOTE.E4, steps: 1 },
};

/**
 * Acordes de acompañamiento (quintas/tríadas) en los tiempos fuertes 1 y 4 de cada compás.
 */
const CHORD_STABS: Readonly<Record<number, readonly number[]>> = {
  0: [NOTE.D3, NOTE.A3],
  3: [NOTE.F3, NOTE.A3],
  6: [NOTE.D3, NOTE.A3],
  9: [NOTE.F3, NOTE.D4],
  12: [NOTE.Bb2, NOTE.F3],
  15: [NOTE.Bb2, NOTE.D3],
  18: [NOTE.A2, NOTE.E3],
  21: [NOTE.Cs3, NOTE.A3],
  24: [NOTE.D3, NOTE.A3],
  27: [NOTE.F3, NOTE.A3],
  30: [NOTE.G3, NOTE.D4],
  33: [NOTE.Bb3, NOTE.D4],
  36: [NOTE.Bb2, NOTE.F3],
  39: [NOTE.A2, NOTE.E3],
  42: [NOTE.A2, NOTE.E3],
  45: [NOTE.Cs3, NOTE.A3],
};

/**
 * Progresión ambiental suave para el Dashboard (Dm9 -> BbMaj7 -> Gm7 -> A7sus4).
 */
const DASHBOARD_CHORDS: Readonly<Record<number, readonly number[]>> = {
  0: [NOTE.D3, NOTE.F3, NOTE.A3, NOTE.E4],
  4: [NOTE.Bb2, NOTE.D3, NOTE.F3, NOTE.A3],
  8: [NOTE.G2, NOTE.Bb2, NOTE.D3, NOTE.F3],
  12: [NOTE.A2, NOTE.D3, NOTE.E3, NOTE.G3],
};

const DASHBOARD_ARP: readonly number[] = [
  NOTE.A4, NOTE.D5, NOTE.F4, NOTE.E5,
  NOTE.F4, NOTE.Bb4, NOTE.D5, NOTE.A4,
  NOTE.G4, NOTE.Bb4, NOTE.D5, NOTE.F4,
  NOTE.E4, NOTE.A4, NOTE.D5, NOTE.E5,
];

class BattleAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  private muted = false;
  private volume = 0.8;
  private musicMode: MusicMode = "none";

  private schedulerTimer: ReturnType<typeof setInterval> | null = null;
  private nextStepTime = 0;
  private currentStep = 0;
  private activeMusicStoppers = new Set<() => void>();

  private lastVoiceIndex = -1;
  private listeners = new Set<(state: BattleAudioState) => void>();

  private isBrowser(): boolean {
    return typeof window !== "undefined";
  }

  private getAudioContextConstructor(): typeof AudioContext | null {
    if (!this.isBrowser()) return null;
    const win = window as unknown as {
      AudioContext?: typeof AudioContext;
      webkitAudioContext?: typeof AudioContext;
    };
    return win.AudioContext ?? win.webkitAudioContext ?? null;
  }

  private ensureContext(): AudioContext | null {
    if (!this.isBrowser()) return null;

    if (!this.ctx) {
      const AudioCtx = this.getAudioContextConstructor();
      if (!AudioCtx) return null;

      this.ctx = new AudioCtx();
      const compressor = this.ctx.createDynamicsCompressor();
      compressor.threshold.setValueAtTime(-14, this.ctx.currentTime);
      compressor.knee.setValueAtTime(18, this.ctx.currentTime);
      compressor.ratio.setValueAtTime(6, this.ctx.currentTime);
      compressor.attack.setValueAtTime(0.003, this.ctx.currentTime);
      compressor.release.setValueAtTime(0.15, this.ctx.currentTime);

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(
        this.muted ? 0 : this.volume,
        this.ctx.currentTime
      );

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(0.32, this.ctx.currentTime);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.92, this.ctx.currentTime);

      this.musicGain.connect(this.masterGain);
      this.sfxGain.connect(this.masterGain);
      this.masterGain.connect(compressor);
      compressor.connect(this.ctx.destination);
    }

    if (this.ctx.state === "suspended") {
      void this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  private getNoiseBuffer(ctx: AudioContext): AudioBuffer {
    if (this.noiseBuffer && this.noiseBuffer.sampleRate === ctx.sampleRate) {
      return this.noiseBuffer;
    }
    const length = Math.floor(ctx.sampleRate * 1.2);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    this.noiseBuffer = buffer;
    return buffer;
  }

  private notifyListeners(): void {
    const snapshot = this.getState();
    for (const cb of this.listeners) {
      cb(snapshot);
    }
  }

  public getState(): BattleAudioState {
    return {
      muted: this.muted,
      volume: this.volume,
      musicActive: this.musicMode !== "none",
      musicMode: this.musicMode,
    };
  }

  public subscribe(listener: (state: BattleAudioState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  public unlock(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      void ctx
        .resume()
        .then(() => {
          if (this.musicMode !== "none" && !this.muted && !this.schedulerTimer) {
            this.beginScheduler(ctx);
          }
        })
        .catch(() => {});
    } else if (this.musicMode !== "none" && !this.muted && !this.schedulerTimer) {
      this.beginScheduler(ctx);
    }
  }

  public isMuted(): boolean {
    return this.muted;
  }

  public setMuted(muted: boolean): void {
    this.muted = muted;
    if (this.ctx && this.masterGain) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(muted ? 0 : this.volume, now, 0.015);
    }

    if (muted) {
      this.cancelSpeech();
      this.stopSchedulerOnly();
    } else if (this.musicMode !== "none") {
      const ctx = this.ensureContext();
      if (ctx) {
        this.beginScheduler(ctx);
      }
    }

    this.notifyListeners();
  }

  public toggleMute(): boolean {
    this.setMuted(!this.muted);
    return this.muted;
  }

  public getVolume(): number {
    return this.volume;
  }

  public setVolume(nextVolume: number): void {
    this.volume = Math.min(1, Math.max(0, nextVolume));
    if (this.ctx && this.masterGain && !this.muted) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setTargetAtTime(this.volume, now, 0.02);
    }
    this.notifyListeners();
  }

  /**
   * Campana metálica de inicio de round (armónicos 880 Hz, 1320 Hz y 1760 Hz con decaimiento largo).
   */
  public playRoundBell(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const now = ctx.currentTime;
    const partials = [
      { freq: 880, gain: 0.42, decay: 2.35, type: "sine" as OscillatorType },
      { freq: 1320, gain: 0.28, decay: 1.85, type: "sine" as OscillatorType },
      { freq: 1760, gain: 0.2, decay: 1.45, type: "triangle" as OscillatorType },
    ];

    for (const p of partials) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = p.type;
      osc.frequency.setValueAtTime(p.freq, now);

      gain.gain.setValueAtTime(0.0001, now);
      gain.gain.linearRampToValueAtTime(p.gain, now + 0.004);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + p.decay);

      osc.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(now);
      osc.stop(now + p.decay + 0.05);
    }

    // Transitorio metálico del golpe del martillo sobre la campana
    const click = ctx.createBufferSource();
    click.buffer = this.getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(2800, now);
    filter.Q.setValueAtTime(4, now);

    const clickGain = ctx.createGain();
    clickGain.gain.setValueAtTime(0.24, now);
    clickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);

    click.connect(filter);
    filter.connect(clickGain);
    clickGain.connect(this.sfxGain);
    click.start(now);
    click.stop(now + 0.03);
  }

  /**
   * Inicia música ambiental futurista/épica suave (volumen 0.15) para el Dashboard y menús.
   */
  public startDashboardMusic(): void {
    if (this.musicMode === "dashboard") return;
    this.stopSchedulerOnly();
    this.musicMode = "dashboard";
    this.currentStep = 0;

    if (!this.muted) {
      const ctx = this.ensureContext();
      if (ctx && this.musicGain) {
        const now = ctx.currentTime;
        this.musicGain.gain.cancelScheduledValues(now);
        this.musicGain.gain.setValueAtTime(0.01, now);
        this.musicGain.gain.setTargetAtTime(0.15, now, 0.35);
        this.beginScheduler(ctx);
      }
    }

    this.notifyListeners();
  }

  /**
   * Detiene suavemente la música ambiental del Dashboard.
   */
  public stopDashboardMusic(): void {
    if (this.musicMode !== "dashboard") return;
    this.musicMode = "none";
    this.stopSchedulerOnly();
    this.notifyListeners();
  }

  /**
   * Inicia la música instrumental épica en Re menor (compás 6/8).
   */
  public startBattleMusic(): void {
    if (this.musicMode === "battle") return;
    this.stopSchedulerOnly();
    this.musicMode = "battle";
    this.currentStep = 0;

    if (!this.muted) {
      const ctx = this.ensureContext();
      if (ctx && this.musicGain) {
        const now = ctx.currentTime;
        this.musicGain.gain.cancelScheduledValues(now);
        this.musicGain.gain.setTargetAtTime(0.32, now, 0.08);
        this.beginScheduler(ctx);
      }
    }

    this.notifyListeners();
  }

  /**
   * Detiene inmediatamente la música de combate y limpia nodos activos.
   */
  public stopBattleMusic(): void {
    if (this.musicMode === "none") return;
    this.musicMode = "none";
    this.stopSchedulerOnly();
    this.notifyListeners();
  }

  private stopSchedulerOnly(): void {
    if (this.schedulerTimer !== null) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    for (const stop of this.activeMusicStoppers) {
      try {
        stop();
      } catch {
        // Ignorar nodos ya finalizados
      }
    }
    this.activeMusicStoppers.clear();
  }

  private beginScheduler(ctx: AudioContext): void {
    if (this.schedulerTimer !== null) return;
    this.nextStepTime = ctx.currentTime + 0.06;

    this.schedulerTimer = setInterval(() => {
      if (this.musicMode === "none" || this.muted || !this.ctx) return;
      if (this.ctx.state !== "running") {
        // Mantener el cursor sincronizado mientras AudioContext esté suspendido
        this.nextStepTime = this.ctx.currentTime + 0.05;
        return;
      }

      // Si hubo una pausa de pestaña, evitar ráfaga de notas atrasadas
      if (this.nextStepTime < this.ctx.currentTime - 0.25) {
        this.nextStepTime = this.ctx.currentTime + 0.04;
      }

      while (this.nextStepTime < this.ctx.currentTime + SCHEDULE_AHEAD_SEC) {
        if (this.musicMode === "dashboard") {
          this.scheduleDashboardStep(this.ctx, this.currentStep, this.nextStepTime);
          this.nextStepTime += DASHBOARD_STEP_SEC;
          this.currentStep = (this.currentStep + 1) % DASHBOARD_TOTAL_STEPS;
        } else {
          this.scheduleMusicStep(this.ctx, this.currentStep, this.nextStepTime);
          this.nextStepTime += EIGHTH_NOTE_SEC;
          this.currentStep = (this.currentStep + 1) % TOTAL_STEPS;
        }
      }
    }, LOOKAHEAD_MS);
  }

  private scheduleDashboardStep(
    ctx: AudioContext,
    step: number,
    time: number
  ): void {
    if (!this.musicGain) return;

    const chord = DASHBOARD_CHORDS[step];
    if (chord) {
      const padDur = DASHBOARD_STEP_SEC * 3.9;
      for (const freq of chord) {
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, time);

        filter.type = "lowpass";
        filter.frequency.setValueAtTime(720, time);

        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.linearRampToValueAtTime(0.16, time + 0.35);
        gain.gain.setValueAtTime(0.12, time + padDur * 0.65);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + padDur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        osc.start(time);
        osc.stop(time + padDur + 0.05);

        this.registerMusicNode(() => {
          gain.gain.setValueAtTime(0.0001, ctx.currentTime);
          osc.stop();
        }, time + padDur + 0.05);
      }
    }

    const arpFreq = DASHBOARD_ARP[step];
    if (arpFreq) {
      const arpDur = DASHBOARD_STEP_SEC * 0.92;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(arpFreq, time);

      gain.gain.setValueAtTime(0.0001, time);
      gain.gain.linearRampToValueAtTime(0.09, time + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.0001, time + arpDur);

      osc.connect(gain);
      gain.connect(this.musicGain);
      osc.start(time);
      osc.stop(time + arpDur + 0.03);

      this.registerMusicNode(() => {
        gain.gain.setValueAtTime(0.0001, ctx.currentTime);
        osc.stop();
      }, time + arpDur + 0.03);
    }
  }

  private registerMusicNode(stopFn: () => void, endTimeSec: number): void {
    this.activeMusicStoppers.add(stopFn);
    if (!this.ctx) return;
    const msUntilEnd = Math.max(0, (endTimeSec - this.ctx.currentTime) * 1000 + 60);
    setTimeout(() => {
      this.activeMusicStoppers.delete(stopFn);
    }, msUntilEnd);
  }

  private scheduleMusicStep(
    ctx: AudioContext,
    step: number,
    time: number
  ): void {
    if (!this.musicGain) return;
    const stepInBar = step % 6;
    const isStrongBeat = stepInBar === 0;
    const isSecondaryBeat = stepInBar === 3;

    // 1. Bajo staccato 6/8 (pulso constante de aventura)
    const bassFreq = BASS_PATTERN[step];
    if (bassFreq) {
      const bassOsc = ctx.createOscillator();
      const bassSub = ctx.createOscillator();
      const bassFilter = ctx.createBiquadFilter();
      const bassGain = ctx.createGain();

      bassOsc.type = "sawtooth";
      bassOsc.frequency.setValueAtTime(bassFreq, time);

      bassSub.type = "triangle";
      bassSub.frequency.setValueAtTime(bassFreq, time);

      bassFilter.type = "lowpass";
      bassFilter.frequency.setValueAtTime(
        isStrongBeat ? 620 : isSecondaryBeat ? 520 : 380,
        time
      );
      bassFilter.Q.setValueAtTime(1.8, time);

      const peak = isStrongBeat ? 0.32 : isSecondaryBeat ? 0.26 : 0.18;
      const dur = EIGHTH_NOTE_SEC * 0.78;
      bassGain.gain.setValueAtTime(0.0001, time);
      bassGain.gain.linearRampToValueAtTime(peak, time + 0.008);
      bassGain.gain.exponentialRampToValueAtTime(0.0001, time + dur);

      bassOsc.connect(bassFilter);
      bassSub.connect(bassFilter);
      bassFilter.connect(bassGain);
      bassGain.connect(this.musicGain);

      bassOsc.start(time);
      bassSub.start(time);
      bassOsc.stop(time + dur + 0.02);
      bassSub.stop(time + dur + 0.02);

      this.registerMusicNode(() => {
        bassGain.gain.setValueAtTime(0.0001, ctx.currentTime);
        bassOsc.stop();
        bassSub.stop();
      }, time + dur + 0.02);
    }

    // 2. Melodía épica de cuerdas / metales sintetizados
    const melody = MELODY_EVENTS[step];
    if (melody) {
      const totalDur = EIGHTH_NOTE_SEC * melody.steps * 0.94;
      const lead1 = ctx.createOscillator();
      const lead2 = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const env = ctx.createGain();

      // Doble oscilador ligeramente desafinado para cuerpo de cuerdas/metales
      lead1.type = "sawtooth";
      lead1.frequency.setValueAtTime(melody.freq, time);
      lead1.detune.setValueAtTime(-6, time);

      lead2.type = "square";
      lead2.frequency.setValueAtTime(melody.freq, time);
      lead2.detune.setValueAtTime(6, time);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(melody.accent ? 1950 : 1450, time);
      filter.frequency.exponentialRampToValueAtTime(950, time + totalDur);
      filter.Q.setValueAtTime(2.0, time);

      const peak = melody.accent ? 0.2 : 0.15;
      env.gain.setValueAtTime(0.0001, time);
      env.gain.linearRampToValueAtTime(peak, time + 0.022);
      env.gain.setValueAtTime(peak * 0.85, time + totalDur * 0.72);
      env.gain.exponentialRampToValueAtTime(0.0001, time + totalDur);

      lead1.connect(filter);
      lead2.connect(filter);
      filter.connect(env);
      env.connect(this.musicGain);

      lead1.start(time);
      lead2.start(time);
      lead1.stop(time + totalDur + 0.02);
      lead2.stop(time + totalDur + 0.02);

      this.registerMusicNode(() => {
        env.gain.setValueAtTime(0.0001, ctx.currentTime);
        lead1.stop();
        lead2.stop();
      }, time + totalDur + 0.02);
    }

    // 3. Armonía de cuerdas/metales en los tiempos 1 y 4
    const chord = CHORD_STABS[step];
    if (chord) {
      const stabDur = EIGHTH_NOTE_SEC * 2.4;
      for (const freq of chord) {
        const osc = ctx.createOscillator();
        const filter = ctx.createBiquadFilter();
        const gain = ctx.createGain();

        osc.type = "sawtooth";
        osc.frequency.setValueAtTime(freq, time);

        filter.type = "lowpass";
        filter.frequency.setValueAtTime(1050, time);

        gain.gain.setValueAtTime(0.0001, time);
        gain.gain.linearRampToValueAtTime(0.075, time + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + stabDur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain);

        osc.start(time);
        osc.stop(time + stabDur + 0.02);

        this.registerMusicNode(() => {
          gain.gain.setValueAtTime(0.0001, ctx.currentTime);
          osc.stop();
        }, time + stabDur + 0.02);
      }
    }

    // 4. Percusión de aventura 6/8 (bombo en 1 y 4, caja en 4, shaker en corcheas)
    if (isStrongBeat || isSecondaryBeat) {
      const kick = ctx.createOscillator();
      const kickGain = ctx.createGain();
      kick.type = "sine";
      kick.frequency.setValueAtTime(isStrongBeat ? 115 : 95, time);
      kick.frequency.exponentialRampToValueAtTime(38, time + 0.09);

      kickGain.gain.setValueAtTime(isStrongBeat ? 0.34 : 0.24, time);
      kickGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.11);

      kick.connect(kickGain);
      kickGain.connect(this.musicGain);
      kick.start(time);
      kick.stop(time + 0.12);

      this.registerMusicNode(() => {
        kickGain.gain.setValueAtTime(0.0001, ctx.currentTime);
        kick.stop();
      }, time + 0.12);
    }

    if (isSecondaryBeat) {
      const snare = ctx.createBufferSource();
      snare.buffer = this.getNoiseBuffer(ctx);
      const hp = ctx.createBiquadFilter();
      hp.type = "bandpass";
      hp.frequency.setValueAtTime(1700, time);
      hp.Q.setValueAtTime(1.2, time);

      const snareGain = ctx.createGain();
      snareGain.gain.setValueAtTime(0.14, time);
      snareGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.08);

      snare.connect(hp);
      hp.connect(snareGain);
      snareGain.connect(this.musicGain);
      snare.start(time);
      snare.stop(time + 0.09);
    } else if (!isStrongBeat) {
      const hat = ctx.createBufferSource();
      hat.buffer = this.getNoiseBuffer(ctx);
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.setValueAtTime(5200, time);

      const hatGain = ctx.createGain();
      hatGain.gain.setValueAtTime(0.045, time);
      hatGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.035);

      hat.connect(hp);
      hp.connect(hatGain);
      hatGain.connect(this.musicGain);
      hat.start(time);
      hat.stop(time + 0.04);
    }
  }

  /**
   * Sonido sutil de desplazamiento en el aire al lanzar un ataque normal.
   */
  public playAttackSwing(isHeavy = false): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const now = ctx.currentTime;
    const dur = isHeavy ? 0.14 : 0.085;
    const noise = ctx.createBufferSource();
    noise.buffer = this.getNoiseBuffer(ctx);

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(isHeavy ? 420 : 680, now);
    filter.frequency.exponentialRampToValueAtTime(isHeavy ? 180 : 320, now + dur);
    filter.Q.setValueAtTime(2.2, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(isHeavy ? 0.16 : 0.11, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);

    noise.start(now);
    noise.stop(now + dur + 0.01);
  }

  /**
   * Golpe seco rápido + impacto para ataques ligeros.
   */
  public playLightHit(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const now = ctx.currentTime;

    // Cuerpo de impacto seco
    const osc = ctx.createOscillator();
    const oscGain = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(260, now);
    osc.frequency.exponentialRampToValueAtTime(68, now + 0.09);

    oscGain.gain.setValueAtTime(0.45, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.095);

    osc.connect(oscGain);
    oscGain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.1);

    // Chasquido de contacto
    const snap = ctx.createBufferSource();
    snap.buffer = this.getNoiseBuffer(ctx);
    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1600, now);
    filter.Q.setValueAtTime(1.4, now);

    const snapGain = ctx.createGain();
    snapGain.gain.setValueAtTime(0.32, now);
    snapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

    snap.connect(filter);
    filter.connect(snapGain);
    snapGain.connect(this.sfxGain);
    snap.start(now);
    snap.stop(now + 0.06);
  }

  /**
   * Golpe grave contundente con sub-bajo para ataques fuertes.
   */
  public playHeavyHit(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const now = ctx.currentTime;

    // Sub-bajo profundo
    const sub = ctx.createOscillator();
    const subGain = ctx.createGain();
    sub.type = "sine";
    sub.frequency.setValueAtTime(130, now);
    sub.frequency.exponentialRampToValueAtTime(34, now + 0.24);

    subGain.gain.setValueAtTime(0.68, now);
    subGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);

    sub.connect(subGain);
    subGain.connect(this.sfxGain);
    sub.start(now);
    sub.stop(now + 0.27);

    // Golpe medio contundente
    const punch = ctx.createOscillator();
    const punchGain = ctx.createGain();
    punch.type = "sawtooth";
    punch.frequency.setValueAtTime(185, now);
    punch.frequency.exponentialRampToValueAtTime(48, now + 0.14);

    const punchFilter = ctx.createBiquadFilter();
    punchFilter.type = "lowpass";
    punchFilter.frequency.setValueAtTime(650, now);

    punchGain.gain.setValueAtTime(0.38, now);
    punchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    punch.connect(punchFilter);
    punchFilter.connect(punchGain);
    punchGain.connect(this.sfxGain);
    punch.start(now);
    punch.stop(now + 0.16);

    // Crujido de impacto
    const crunch = ctx.createBufferSource();
    crunch.buffer = this.getNoiseBuffer(ctx);
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = "lowpass";
    noiseFilter.frequency.setValueAtTime(1100, now);
    noiseFilter.frequency.exponentialRampToValueAtTime(220, now + 0.13);

    const crunchGain = ctx.createGain();
    crunchGain.gain.setValueAtTime(0.42, now);
    crunchGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

    crunch.connect(noiseFilter);
    noiseFilter.connect(crunchGain);
    crunchGain.connect(this.sfxGain);
    crunch.start(now);
    crunch.stop(now + 0.15);
  }

  /**
   * Barrido ascendente de energía + explosión potente para ataques especiales.
   */
  public playSpecialAttack(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const now = ctx.currentTime;

    // Fase 1: Barrido ascendente de energía (0 - 160ms)
    const sweep = ctx.createOscillator();
    const sweepHarm = ctx.createOscillator();
    const sweepFilter = ctx.createBiquadFilter();
    const sweepGain = ctx.createGain();

    sweep.type = "sawtooth";
    sweep.frequency.setValueAtTime(210, now);
    sweep.frequency.exponentialRampToValueAtTime(1280, now + 0.16);

    sweepHarm.type = "sine";
    sweepHarm.frequency.setValueAtTime(420, now);
    sweepHarm.frequency.exponentialRampToValueAtTime(1920, now + 0.16);

    sweepFilter.type = "bandpass";
    sweepFilter.frequency.setValueAtTime(500, now);
    sweepFilter.frequency.exponentialRampToValueAtTime(2800, now + 0.16);
    sweepFilter.Q.setValueAtTime(3.2, now);

    sweepGain.gain.setValueAtTime(0.001, now);
    sweepGain.gain.linearRampToValueAtTime(0.36, now + 0.11);
    sweepGain.gain.exponentialRampToValueAtTime(0.001, now + 0.21);

    sweep.connect(sweepFilter);
    sweepHarm.connect(sweepFilter);
    sweepFilter.connect(sweepGain);
    sweepGain.connect(this.sfxGain);

    sweep.start(now);
    sweepHarm.start(now);
    sweep.stop(now + 0.22);
    sweepHarm.stop(now + 0.22);

    // Fase 2: Explosión potente (desde 130ms)
    const boomAt = now + 0.13;

    const subBoom = ctx.createOscillator();
    const subBoomGain = ctx.createGain();
    subBoom.type = "sine";
    subBoom.frequency.setValueAtTime(115, boomAt);
    subBoom.frequency.exponentialRampToValueAtTime(26, boomAt + 0.45);

    subBoomGain.gain.setValueAtTime(0.75, boomAt);
    subBoomGain.gain.exponentialRampToValueAtTime(0.0001, boomAt + 0.48);

    subBoom.connect(subBoomGain);
    subBoomGain.connect(this.sfxGain);
    subBoom.start(boomAt);
    subBoom.stop(boomAt + 0.5);

    const blast = ctx.createBufferSource();
    blast.buffer = this.getNoiseBuffer(ctx);
    const blastFilter = ctx.createBiquadFilter();
    blastFilter.type = "lowpass";
    blastFilter.frequency.setValueAtTime(3600, boomAt);
    blastFilter.frequency.exponentialRampToValueAtTime(190, boomAt + 0.48);

    const blastGain = ctx.createGain();
    blastGain.gain.setValueAtTime(0.55, boomAt);
    blastGain.gain.exponentialRampToValueAtTime(0.0001, boomAt + 0.5);

    blast.connect(blastFilter);
    blastFilter.connect(blastGain);
    blastGain.connect(this.sfxGain);
    blast.start(boomAt);
    blast.stop(boomAt + 0.52);
  }

  /**
   * Sonido metálico corto de escudo/bloqueo.
   */
  public playBlock(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const now = ctx.currentTime;
    const freqs = [940, 1410, 2180];

    freqs.forEach((freq, idx) => {
      if (!this.sfxGain) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = idx === 0 ? "triangle" : "square";
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.exponentialRampToValueAtTime(freq * 0.96, now + 0.13);

      const amp = idx === 0 ? 0.25 : 0.11;
      gain.gain.setValueAtTime(amp, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now);
      osc.stop(now + 0.15);
    });

    const clink = ctx.createBufferSource();
    clink.buffer = this.getNoiseBuffer(ctx);
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.setValueAtTime(3200, now);

    const clinkGain = ctx.createGain();
    clinkGain.gain.setValueAtTime(0.22, now);
    clinkGain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

    clink.connect(hp);
    hp.connect(clinkGain);
    clinkGain.connect(this.sfxGain);
    clink.start(now);
    clink.stop(now + 0.05);
  }

  /**
   * Fanfarria triunfal ("ring-ring") al ganar la partida completa (2 rounds).
   */
  public playVictoryFanfare(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const now = ctx.currentTime;
    const fanfareNotes = [
      { freq: 587.33, offset: 0.0, dur: 0.16 }, // D5
      { freq: 739.99, offset: 0.12, dur: 0.16 }, // F#5
      { freq: 880.0, offset: 0.24, dur: 0.18 }, // A5
      { freq: 1174.66, offset: 0.38, dur: 0.55 }, // D6
    ];

    for (const note of fanfareNotes) {
      const t = now + note.offset;
      const osc = ctx.createOscillator();
      const harm = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = "triangle";
      osc.frequency.setValueAtTime(note.freq, t);

      harm.type = "sine";
      harm.frequency.setValueAtTime(note.freq * 1.5, t);

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.32, t + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + note.dur);

      osc.connect(gain);
      harm.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      harm.start(t);
      osc.stop(t + note.dur + 0.03);
      harm.stop(t + note.dur + 0.03);
    }

    // Doble timbre victorioso ("ring-ring")
    [0.52, 0.72].forEach((delay) => {
      if (!this.sfxGain) return;
      const t = now + delay;
      [1318.5, 1760].forEach((freq, idx) => {
        if (!this.sfxGain) return;
        const bell = ctx.createOscillator();
        const bellGain = ctx.createGain();
        bell.type = "sine";
        bell.frequency.setValueAtTime(freq, t);

        bellGain.gain.setValueAtTime(0.0001, t);
        bellGain.gain.linearRampToValueAtTime(idx === 0 ? 0.34 : 0.22, t + 0.006);
        bellGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);

        bell.connect(bellGain);
        bellGain.connect(this.sfxGain);
        bell.start(t);
        bell.stop(t + 0.58);
      });
    });
  }

  /**
   * Sonido descendente ("du-du-du") al perder el combate completo.
   */
  public playDefeatSound(): void {
    if (this.muted) return;
    const ctx = this.ensureContext();
    if (!ctx || !this.sfxGain) return;

    const now = ctx.currentTime;
    const steps = [
      { freq: 311.13, offset: 0.0, dur: 0.24 }, // Eb4
      { freq: 277.18, offset: 0.24, dur: 0.24 }, // C#4
      { freq: 233.08, offset: 0.48, dur: 0.32 }, // Bb3
      { freq: 174.61, offset: 0.76, dur: 0.65 }, // F3
    ];

    for (const s of steps) {
      const t = now + s.offset;
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(s.freq, t);
      osc.frequency.exponentialRampToValueAtTime(s.freq * 0.92, t + s.dur);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(900, t);
      filter.frequency.exponentialRampToValueAtTime(280, t + s.dur);

      gain.gain.setValueAtTime(0.0001, t);
      gain.gain.linearRampToValueAtTime(0.28, t + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + s.dur);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain);

      osc.start(t);
      osc.stop(t + s.dur + 0.04);
    }
  }

  private pickSpanishVoice(): SpeechSynthesisVoice | null {
    if (!this.isBrowser() || !("speechSynthesis" in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (!voices.length) return null;

    return (
      voices.find((v) => v.lang.toLowerCase() === "es-mx") ??
      voices.find((v) => v.lang.toLowerCase() === "es-es") ??
      voices.find((v) => v.lang.toLowerCase().startsWith("es")) ??
      null
    );
  }

  /**
   * Reproduce una línea de voz dramática en español sin encimar voces anteriores.
   */
  public speakVoiceLine(text?: string, options?: VoiceLineOptions): void {
    if (this.muted || !this.isBrowser() || !("speechSynthesis" in window)) {
      return;
    }

    let line = text?.trim();
    if (!line) {
      let nextIdx = Math.floor(Math.random() * VOICE_LINES.length);
      if (VOICE_LINES.length > 1 && nextIdx === this.lastVoiceIndex) {
        nextIdx = (nextIdx + 1) % VOICE_LINES.length;
      }
      this.lastVoiceIndex = nextIdx;
      line = VOICE_LINES[nextIdx];
    }

    try {
      const synth = window.speechSynthesis;
      synth.cancel();

      const utterance = new SpeechSynthesisUtterance(line);
      const voice = this.pickSpanishVoice();
      if (voice) {
        utterance.voice = voice;
        utterance.lang = voice.lang;
      } else {
        utterance.lang = "es-MX";
      }

      const critical = options?.critical ?? false;
      utterance.pitch =
        options?.pitch ?? (critical ? 1.18 : 0.94 + Math.random() * 0.22);
      utterance.rate =
        options?.rate ?? (critical ? 1.16 : 1.06 + Math.random() * 0.12);
      utterance.volume = Math.min(1, Math.max(0, this.volume));

      synth.speak(utterance);
    } catch {
      // Ignorar si SpeechSynthesis está restringido en el entorno actual
    }
  }

  public cancelSpeech(): void {
    if (!this.isBrowser() || !("speechSynthesis" in window)) return;
    try {
      window.speechSynthesis.cancel();
    } catch {
      // Ignorar
    }
  }

  /**
   * Limpieza total de música y síntesis de voz al salir de la pantalla /fight.
   */
  public cleanup(): void {
    this.stopBattleMusic();
    this.cancelSpeech();
  }
}

const battleAudio = new BattleAudioEngine();

export function playRoundBell(): void {
  battleAudio.playRoundBell();
}

export function startDashboardMusic(): void {
  battleAudio.startDashboardMusic();
}

export function stopDashboardMusic(): void {
  battleAudio.stopDashboardMusic();
}

export function startBattleMusic(): void {
  battleAudio.startBattleMusic();
}

export function stopBattleMusic(): void {
  battleAudio.stopBattleMusic();
}

export function playVictoryFanfare(): void {
  battleAudio.playVictoryFanfare();
}

export function playDefeatSound(): void {
  battleAudio.playDefeatSound();
}

export function playAttackSwing(isHeavy = false): void {
  battleAudio.playAttackSwing(isHeavy);
}

export function playLightHit(): void {
  battleAudio.playLightHit();
}

export function playHeavyHit(): void {
  battleAudio.playHeavyHit();
}

export function playSpecialAttack(): void {
  battleAudio.playSpecialAttack();
}

export function playBlock(): void {
  battleAudio.playBlock();
}

export function speakVoiceLine(
  text?: string,
  options?: VoiceLineOptions
): void {
  battleAudio.speakVoiceLine(text, options);
}

export function isMuted(): boolean {
  return battleAudio.isMuted();
}

export function setMuted(muted: boolean): void {
  battleAudio.setMuted(muted);
}

export function toggleMute(): boolean {
  return battleAudio.toggleMute();
}

export function getVolume(): number {
  return battleAudio.getVolume();
}

export function setVolume(volume: number): void {
  battleAudio.setVolume(volume);
}

export function unlockBattleAudio(): void {
  battleAudio.unlock();
}

export function subscribeAudioState(
  listener: (state: BattleAudioState) => void
): () => void {
  return battleAudio.subscribe(listener);
}

export function cleanupBattleAudio(): void {
  battleAudio.cleanup();
}

export default battleAudio;
