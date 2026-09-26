class SoundController {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  public init(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  /**
   * Generates an ultra-realistic physical book paper turn sound with multi-layer synthesis:
   * 1. Crisp paper edge release flutter
   * 2. Gentle air swoosh as paper arcs over
   * 3. Soft paper leaf contact landing on the stack
   */
  public playPageTurn(direction: 'forward' | 'backward' = 'forward') {
    if (this.isMuted) return;

    try {
      const ctx = this.init();
      if (!ctx) return;

      const now = ctx.currentTime;
      // Slight randomized pitch & duration variance so every page turn sounds organic
      const variance = (Math.random() - 0.5) * 0.08;
      const duration = 0.22 + variance;
      const bufferSize = Math.floor(ctx.sampleRate * duration);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);

      // Generate organic pink/brown noise with micro-fluctuations for authentic paper fibers
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        const pink = b0 + b1 + b2 + white * 0.5362;
        // Envelope curve to shape natural friction
        const progress = i / bufferSize;
        const env = Math.sin(progress * Math.PI);
        data[i] = pink * 0.14 * env;
      }

      const noiseNode = ctx.createBufferSource();
      noiseNode.buffer = buffer;

      // Bandpass sweep to emulate the paper sliding across the page
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      const startFreq = direction === 'forward' ? 950 + (Math.random() * 80) : 1200 + (Math.random() * 80);
      const peakFreq = 2200 + (Math.random() * 200);
      const endFreq = 480 + (Math.random() * 60);

      filter.frequency.setValueAtTime(startFreq, now);
      filter.frequency.exponentialRampToValueAtTime(peakFreq, now + duration * 0.35);
      filter.frequency.exponentialRampToValueAtTime(endFreq, now + duration);
      filter.Q.setValueAtTime(1.6, now);

      // Volume envelope for paper friction
      const gainNode = ctx.createGain();
      gainNode.gain.setValueAtTime(0.001, now);
      gainNode.gain.linearRampToValueAtTime(0.42, now + 0.025);
      gainNode.gain.exponentialRampToValueAtTime(0.18, now + duration * 0.5);
      gainNode.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      noiseNode.connect(filter);
      filter.connect(gainNode);
      gainNode.connect(ctx.destination);

      // Secondary low flutter component (air displacement of page arching)
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + duration * 0.7);

      oscGain.gain.setValueAtTime(0.08, now);
      oscGain.gain.linearRampToValueAtTime(0.16, now + 0.04);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration * 0.7);

      osc.connect(oscGain);
      oscGain.connect(ctx.destination);

      noiseNode.start(now);
      noiseNode.stop(now + duration);
      osc.start(now);
      osc.stop(now + duration * 0.7);
    } catch {
      // AudioContext might be blocked until user interacts
    }
  }

  /**
   * Generates a soft book-close sound
   */
  public playBookClose() {
    if (this.isMuted) return;

    try {
      const ctx = this.init();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(180, now);
      osc.frequency.exponentialRampToValueAtTime(35, now + 0.24);

      gain.gain.setValueAtTime(0.22, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.24);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.24);
    } catch {}
  }
}

export const soundManager = new SoundController();

// Unlock web audio on first user gesture
if (typeof window !== 'undefined') {
  const unlockAudio = () => {
    soundManager.init();
    window.removeEventListener('pointerdown', unlockAudio);
    window.removeEventListener('keydown', unlockAudio);
    window.removeEventListener('touchstart', unlockAudio);
  };
  window.addEventListener('pointerdown', unlockAudio, { once: true });
  window.addEventListener('keydown', unlockAudio, { once: true });
  window.addEventListener('touchstart', unlockAudio, { once: true });
}
