/**
 * AudioManager.js - 100% Web Audio API Procedural Sound Synthesizer
 * No external sound files needed - runs anywhere, anytime!
 * Futebol de Tampinha
 */

class AudioManager {
  constructor() {
    this.ctx = null;
    this.sfxMuted = false;
    this.musicMuted = false;
    this.sfxVolume = 0.8;
    this.musicVolume = 0.5;

    this.ambientPlaying = false;
    this.ambientSource = null;
    this.ambientGain = null;

    // Load sound settings
    const saved = localStorage.getItem("futebol_tampinha_audio");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        this.sfxMuted = !!parsed.sfxMuted;
        this.musicMuted = !!parsed.musicMuted;
        this.sfxVolume = parsed.sfxVolume !== undefined ? parsed.sfxVolume : 0.8;
        this.musicVolume = parsed.musicVolume !== undefined ? parsed.musicVolume : 0.5;
      } catch (e) {}
    }
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  saveSettings() {
    localStorage.setItem("futebol_tampinha_audio", JSON.stringify({
      sfxMuted: this.sfxMuted,
      musicMuted: this.musicMuted,
      sfxVolume: this.sfxVolume,
      musicVolume: this.musicVolume
    }));
  }

  // 1. Cap Flick / Slingshot launch
  playFlick(powerRatio = 0.5) {
    if (this.sfxMuted || !this.ctx) return;
    this.init();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    const startFreq = 220 + powerRatio * 300;
    osc.frequency.setValueAtTime(startFreq, t);
    osc.frequency.exponentialRampToValueAtTime(70, t + 0.12);

    gain.gain.setValueAtTime(0.5 * this.sfxVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.12);

    // Micro snap click
    this.playNoiseClick(t, 0.03, 0.4 * powerRatio);
  }

  // 2. Plastic Cap-to-Cap Collision (Clack!)
  playClack(speed = 100) {
    if (this.sfxMuted || !this.ctx) return;
    this.init();

    const intensity = Math.min(speed / 450, 1.0);
    if (intensity < 0.05) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const bandpass = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    bandpass.type = "bandpass";
    bandpass.frequency.setValueAtTime(1400 + Math.random() * 400, t);
    bandpass.Q.setValueAtTime(3.5, t);

    osc.type = "triangle";
    osc.frequency.setValueAtTime(700 + Math.random() * 200, t);
    osc.frequency.exponentialRampToValueAtTime(250, t + 0.06);

    const vol = intensity * 0.7 * this.sfxVolume;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.06);

    osc.connect(bandpass);
    bandpass.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.06);

    this.playNoiseClick(t, 0.02, intensity * 0.5);
  }

  // 3. Ball Kick / Hit (Solid Thud)
  playBallKick(speed = 100) {
    if (this.sfxMuted || !this.ctx) return;
    this.init();

    const intensity = Math.min(speed / 400, 1.0);
    if (intensity < 0.05) return;

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(280, t);
    osc.frequency.exponentialRampToValueAtTime(55, t + 0.14);

    const vol = (0.3 + intensity * 0.7) * this.sfxVolume;
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.14);
  }

  // 4. Goal Post Metallic Ping (Trave!)
  playPostHit(speed = 150) {
    if (this.sfxMuted || !this.ctx) return;
    this.init();

    const t = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(1760, t); // A6
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(2640, t); // E7

    gain.gain.setValueAtTime(0.75 * this.sfxVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(t);
    osc2.start(t);
    osc1.stop(t + 0.45);
    osc2.stop(t + 0.45);
  }

  // 5. Wall Bounce
  playWallHit(speed = 100) {
    if (this.sfxMuted || !this.ctx) return;
    this.init();

    const intensity = Math.min(speed / 350, 1.0);
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(80, t + 0.08);

    gain.gain.setValueAtTime(intensity * 0.4 * this.sfxVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.08);
  }

  // 6. Goalkeeper Glove Save
  playSave() {
    if (this.sfxMuted || !this.ctx) return;
    this.init();

    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(320, t);
    osc.frequency.exponentialRampToValueAtTime(110, t + 0.16);

    gain.gain.setValueAtTime(0.7 * this.sfxVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.16);
    this.playNoiseClick(t, 0.05, 0.5);
  }

  // 7. Referee Whistle (Apito)
  playWhistle(blasts = 1) {
    if (this.sfxMuted || !this.ctx) return;
    this.init();

    const t = this.ctx.currentTime;
    const blastDuration = 0.22;
    const gap = 0.1;

    for (let b = 0; b < blasts; b++) {
      const startTime = t + b * (blastDuration + gap);
      const osc1 = this.ctx.createOscillator();
      const osc2 = this.ctx.createOscillator();
      const vibrato = this.ctx.createOscillator();
      const vibratoGain = this.ctx.createGain();
      const gain = this.ctx.createGain();

      osc1.type = "sine";
      osc1.frequency.setValueAtTime(2600, startTime);
      osc2.type = "sine";
      osc2.frequency.setValueAtTime(2950, startTime);

      // Trill vibrato
      vibrato.frequency.setValueAtTime(35, startTime);
      vibratoGain.gain.setValueAtTime(70, startTime);
      vibrato.connect(vibratoGain);
      vibratoGain.connect(osc1.frequency);
      vibratoGain.connect(osc2.frequency);

      gain.gain.setValueAtTime(0.001, startTime);
      gain.gain.linearRampToValueAtTime(0.55 * this.sfxVolume, startTime + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + blastDuration);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(this.ctx.destination);

      vibrato.start(startTime);
      osc1.start(startTime);
      osc2.start(startTime);

      vibrato.stop(startTime + blastDuration);
      osc1.stop(startTime + blastDuration);
      osc2.stop(startTime + blastDuration);
    }
  }

  // 8. Goal Siren Horn + Fan Cheering
  playGoal() {
    if (this.sfxMuted || !this.ctx) return;
    this.init();

    const t = this.ctx.currentTime;

    // Stadium Horn
    const horn = this.ctx.createOscillator();
    const hornGain = this.ctx.createGain();
    horn.type = "sawtooth";
    horn.frequency.setValueAtTime(220, t);
    horn.frequency.setValueAtTime(220, t + 0.3);
    horn.frequency.setValueAtTime(277.18, t + 0.4); // C#4
    horn.frequency.setValueAtTime(329.63, t + 0.8); // E4

    hornGain.gain.setValueAtTime(0.4 * this.sfxVolume, t);
    hornGain.gain.linearRampToValueAtTime(0.45 * this.sfxVolume, t + 1.2);
    hornGain.gain.exponentialRampToValueAtTime(0.001, t + 2.0);

    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1200, t);

    horn.connect(filter);
    filter.connect(hornGain);
    hornGain.connect(this.ctx.destination);

    horn.start(t);
    horn.stop(t + 2.0);

    // Crowd Cheering Noise Burst
    this.playCrowdCheer(t, 2.5);
    this.playWhistle(1);
  }

  playCrowdCheer(startTime, duration = 2.0) {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * duration;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);

    // Pink-like noise
    let b0 = 0, b1 = 0, b2 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99 * b0 + white * 0.05;
      b1 = 0.96 * b1 + white * 0.11;
      b2 = 0.86 * b2 + white * 0.25;
      data[i] = (b0 + b1 + b2) * 0.4;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(800, startTime);
    filter.frequency.linearRampToValueAtTime(1400, startTime + 0.5);
    filter.frequency.exponentialRampToValueAtTime(500, startTime + duration);
    filter.Q.setValueAtTime(1.2, startTime);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, startTime);
    gain.gain.linearRampToValueAtTime(0.45 * this.sfxVolume, startTime + 0.3);
    gain.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.ctx.destination);

    noise.start(startTime);
  }

  // Micro Noise Click helper
  playNoiseClick(t, dur, vol) {
    if (!this.ctx) return;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol * this.sfxVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    noise.connect(gain);
    gain.connect(this.ctx.destination);
    noise.start(t);
  }

  // 9. UI Sounds
  playClick() {
    if (this.sfxMuted || !this.ctx) return;
    this.init();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(750, t);
    osc.frequency.exponentialRampToValueAtTime(350, t + 0.05);
    gain.gain.setValueAtTime(0.3 * this.sfxVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.05);
  }

  playHover() {
    if (this.sfxMuted || !this.ctx) return;
    this.init();
    const t = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(440, t);
    gain.gain.setValueAtTime(0.08 * this.sfxVolume, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.03);
    osc.connect(gain);
    gain.connect(this.ctx.destination);
    osc.start(t);
    osc.stop(t + 0.03);
  }

  toggleSFX() {
    this.sfxMuted = !this.sfxMuted;
    this.saveSettings();
    return !this.sfxMuted;
  }

  toggleMusic() {
    this.musicMuted = !this.musicMuted;
    this.saveSettings();
    return !this.musicMuted;
  }
}

window.AudioManager = AudioManager;
