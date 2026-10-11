/* Original modal-synthesis music + layered procedural foley. Offline; no external audio service. */
"use strict";
class BattlefieldAudio {
  constructor() {
    this.ctx = null;
    this.music = true;
    this.effects = true;
    this.volume = 0.62;
    this.running = false;
    this.score = null;
    this.loading = false;
    this.voices = 0;
    this.seed = 8211;
  }
  unlock() {
    if (!this.ctx) {
      const C = window.AudioContext || window.webkitAudioContext;
      if (!C) return;
      const c = (this.ctx = new C());
      this.master = c.createGain();
      this.master.gain.value = this.volume;
      const limit = c.createDynamicsCompressor();
      limit.threshold.value = -7;
      limit.knee.value = 12;
      limit.ratio.value = 5;
      limit.attack.value = 0.003;
      limit.release.value = 0.18;
      this.master.connect(limit);
      limit.connect(c.destination);
      this.musicBus = c.createGain();
      this.musicBus.gain.value = this.music ? 0.32 : 0;
      this.musicBus.connect(this.master);
      this.fxBus = c.createGain();
      this.fxBus.gain.value = this.effects ? 0.76 : 0;
      this.fxBus.connect(this.master);
      const nb = c.createBuffer(1, c.sampleRate * 3, c.sampleRate),
        d = nb.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      this.noiseBuffer = nb;
      this.reverb = c.createConvolver();
      const ir = c.createBuffer(2, Math.floor(c.sampleRate * 1.8), c.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const a = ir.getChannelData(ch);
        for (let i = 0; i < a.length; i++)
          a[i] = (Math.random() * 2 - 1) * Math.exp((-i / c.sampleRate) * 4.1) * 0.045;
      }
      this.reverb.buffer = ir;
      const wet = c.createGain();
      wet.gain.value = 0.17;
      this.reverb.connect(wet);
      wet.connect(this.master);
      this.fxBus.connect(this.reverb);
    }
    this.ctx.resume().catch(() => {});
  }
  set() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    this.master.gain.setTargetAtTime(this.volume, t, 0.05);
    this.musicBus.gain.setTargetAtTime(this.music ? 0.32 : 0, t, 0.3);
    this.fxBus.gain.setTargetAtTime(this.effects ? 0.76 : 0, t, 0.05);
    if (this.running && !this.score) this.loadScore();
  }
  play() {
    this.unlock();
    this.running = true;
    this.loadScore();
    this.set();
  }
  loadScore() {
    if (!this.ctx || this.loading || this.score) return;
    this.loading = true;
    fetch("army-formation/score.mp3")
      .then((res) => {
        if (!res.ok) throw new Error(String(res.status));
        return res.arrayBuffer();
      })
      .then((buf) => this.ctx.decodeAudioData(buf))
      .then((buf) => {
        this.loading = false;
        this.score = this.ctx.createBufferSource();
        this.score.buffer = buf;
        this.score.loop = true;
        this.score.connect(this.musicBus);
        this.score.start();
      })
      .catch(() => {
        this.loading = false;
        console.warn("背景乐解码失败，动作音效仍可使用。");
      });
  }
  duck(amount = 0.5) {
    if (!this.ctx || !this.music) return;
    const t = this.ctx.currentTime,
      g = this.musicBus.gain;
    g.cancelScheduledValues(t);
    g.setTargetAtTime(0.32 * (1 - Math.min(0.8, amount)), t, 0.025);
    g.setTargetAtTime(0.32, t + 0.27, 0.36);
  }
  tone(f, d, t, vol, bus = this.fxBus, pan = 0, drop = 0) {
    const c = this.ctx,
      o = c.createOscillator(),
      g = c.createGain();
    o.type = "sine";
    o.frequency.setValueAtTime(f, t);
    if (drop) o.frequency.exponentialRampToValueAtTime(Math.max(18, f - drop), t + d * 0.8);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.002);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    o.connect(g);
    this.route(g, bus, pan);
    o.start(t);
    o.stop(t + d + 0.02);
    o.onended = () => {
      o.disconnect();
      g.disconnect();
      g._pan?.disconnect();
    };
  }
  route(g, bus, pan) {
    if (this.ctx.createStereoPanner) {
      const p = this.ctx.createStereoPanner();
      p.pan.value = pan;
      g.connect(p);
      p.connect(bus);
      g._pan = p;
    } else g.connect(bus);
  }
  noise(t, d, vol, lo, hi, pan = 0) {
    const c = this.ctx,
      s = c.createBufferSource(),
      lp = c.createBiquadFilter(),
      hp = c.createBiquadFilter(),
      g = c.createGain();
    s.buffer = this.noiseBuffer;
    lp.type = "lowpass";
    lp.frequency.value = lo;
    hp.type = "highpass";
    hp.frequency.value = hi;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(lp);
    lp.connect(hp);
    hp.connect(g);
    this.route(g, this.fxBus, pan);
    s.start(t, Math.random(), d);
    s.onended = () => {
      s.disconnect();
      lp.disconnect();
      hp.disconnect();
      g.disconnect();
      g._pan?.disconnect();
    };
  }
  metal(t, vol, pan = 0) {
    const f = 610 + Math.random() * 260;
    [1, 1.47, 2.17, 3.12, 4.09].forEach((r, i) =>
      this.tone(f * r, 0.28 / (1 + i * 0.24), t + i * 0.002, vol / (2 + i), this.fxBus, pan),
    );
  }
  fx(kind, strength = 1) {
    this.unlock();
    if (!this.effects || !this.ctx) return;
    const t = this.ctx.currentTime,
      s = Math.min(1.2, strength),
      pan = (Math.random() - 0.5) * 0.6;
    if (kind === "select") {
      this.noise(t, 0.047, 0.13 * s, 1400, 430, 0);
      this.tone(370, 0.07, t, 0.02 * s, this.fxBus, 0, 140);
    } else if (kind === "step") {
      for (let i = 0; i < 3; i++) {
        const a = t + i * 0.021;
        this.noise(a, 0.13, (0.16 * s) / (1 + i * 0.6), 950, 60, pan + (i - 1) * 0.12);
        this.tone(83 + i * 12, 0.09, a, 0.054 * s, this.fxBus, pan, 32);
      }
      this.noise(t + 0.02, 0.14, 0.015 * s, 5100, 2900, pan);
    } else if (kind === "horse") {
      for (let i = 0; i < 4; i++) {
        const a = t + [0, 0.037, 0.091, 0.133][i];
        this.noise(a, 0.085, 0.18 * s, 2200, 160, pan);
        this.tone(132 + i * 18, 0.08, a, 0.075 * s, this.fxBus, pan, 58);
      }
      this.noise(t, 0.23, 0.035 * s, 4300, 2100, pan);
    } else if (kind === "wheel") {
      this.noise(t, 0.24, 0.13 * s, 1100, 140, pan);
      this.tone(162, 0.13, t, 0.034 * s, this.fxBus, pan, 75);
      this.noise(t + 0.1, 0.06, 0.1 * s, 1700, 600, pan);
    } else if (kind === "sword") {
      this.noise(t, 0.11, 0.13 * s, 5900, 2400, pan);
      this.metal(t + 0.012, 0.09 * s, pan);
      this.noise(t + 0.045, 0.19, 0.17 * s, 1500, 85, pan);
    } else if (kind === "impact") {
      this.noise(t, 0.29, 0.33 * s, 2900, 65, pan);
      this.tone(102, 0.32, t, 0.28 * s, this.fxBus, pan, 63);
      this.metal(t + 0.03, 0.045 * s, pan);
      this.duck(0.38);
    } else if (kind === "cannon") {
      this.noise(t, 0.07, 0.9 * s, 8500, 90, pan);
      this.noise(t + 0.027, 0.37, 0.6 * s, 2400, 45, pan);
      this.noise(t + 0.11, 1.2, 0.24 * s, 640, 27, -pan);
      this.tone(89, 0.78, t, 0.62 * s, this.fxBus, pan, 53);
      this.tone(47, 1.2, t, 0.3 * s, this.fxBus, -pan, 19);
      this.noise(t + 0.29, 0.52, 0.06 * s, 2100, 130, pan * 0.7);
      this.duck(0.75);
    } else if (kind === "turn") {
      this.noise(t, 0.06, 0.085 * s, 950, 300, 0);
      this.tone(196, 0.26, t, 0.036 * s, this.fxBus, 0);
    } else if (kind === "check") {
      this.tone(98, 1.3, t, 0.2 * s, this.fxBus, 0, 31);
      this.noise(t, 0.18, 0.2 * s, 1800, 40, 0);
      [1, 1.44, 2.12, 2.84, 4.05].forEach((r, i) =>
        this.tone(147 * r, 1.15 / (1 + i * 0.12), t, (0.085 * s) / (1 + i * 0.5), this.fxBus, 0),
      );
      this.duck(0.55);
    } else if (kind === "win") {
      [146.83, 220, 293.66].forEach((f, i) => {
        this.tone(f, 2.6, t + i * 0.14, 0.12 * s, this.fxBus, (i - 1) * 0.2);
        this.tone(f * 2, 1.8, t + i * 0.14, 0.038 * s, this.fxBus, (i - 1) * 0.2);
      });
      this.noise(t, 0.4, 0.16 * s, 780, 38, 0);
      this.tone(67, 0.85, t, 0.25 * s, this.fxBus, 0, 29);
      this.duck(0.4);
    }
  }
}
window.BattlefieldAudio = BattlefieldAudio;
