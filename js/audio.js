// Procedural WebAudio: UI cues + a per-dimension ambient pad. No assets.

const MIDI = m => 440 * 2 ** ((m - 69) / 12);
const PAD_ROOTS = [33, 38, 45, 50, 57]; // one root note per dimension 0D..4D

export class AudioFX {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.pad = null;
    this.pendingMood = null;
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 1;
      this.master.connect(this.ctx.destination);
      if (this.pendingMood !== null) {
        const m = this.pendingMood;
        this.pendingMood = null;
        this.setMood(m);
      }
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) this.master.gain.value = m ? 0 : 1;
  }

  _env(freq, { type = 'sine', dur = 0.2, vol = 0.05, slide = 0, delay = 0 } = {}) {
    if (!this.ctx) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, freq + slide), t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  blip()  { this._env(480 + Math.random() * 220, { type: 'triangle', dur: 0.05, vol: 0.018 }); }
  click() { this._env(880, { type: 'triangle', dur: 0.07, vol: 0.03 }); }
  buzz()  { this._env(98, { type: 'sawtooth', dur: 0.3, vol: 0.05, slide: -40 }); }

  chime() {
    this._env(880,    { dur: 0.5, vol: 0.05 });
    this._env(1318.5, { dur: 0.7, vol: 0.04, delay: 0.09 });
    this._env(1760,   { dur: 0.9, vol: 0.03, delay: 0.2 });
  }

  whoosh() {
    if (!this.ctx) return;
    const dur = 1.1, t0 = this.ctx.currentTime;
    const n = this.ctx.sampleRate * dur;
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const ch = buf.getChannelData(0);
    for (let i = 0; i < n; i++) ch[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const bp = this.ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.Q.value = 1.2;
    bp.frequency.setValueAtTime(180, t0);
    bp.frequency.exponentialRampToValueAtTime(2600, t0 + dur);
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(0.09, t0 + 0.15);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(bp).connect(g).connect(this.master);
    src.start(t0);
  }

  // Cross-fade the ambient pad to the given dimension's chord.
  setMood(dim) {
    if (!this.ctx) { this.pendingMood = dim; return; }
    const t0 = this.ctx.currentTime;
    if (this.pad) {
      this.pad.gain.gain.cancelScheduledValues(t0);
      this.pad.gain.gain.setTargetAtTime(0, t0, 0.6);
      const old = this.pad;
      setTimeout(() => old.nodes.forEach(o => { try { o.stop(); } catch {} }), 3000);
      this.pad = null;
    }
    const root = MIDI(PAD_ROOTS[Math.max(0, Math.min(4, dim))]);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, t0);
    gain.gain.setTargetAtTime(0.022, t0, 1.6);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 420;
    const lfo = this.ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoG = this.ctx.createGain();
    lfoG.gain.value = 140;
    lfo.connect(lfoG).connect(lp.frequency);
    const nodes = [lfo];
    for (const [f, det, type] of [[root, -4, 'sawtooth'], [root * 1.5, 5, 'sawtooth'], [root * 2, 0, 'sine']]) {
      const o = this.ctx.createOscillator();
      o.type = type;
      o.frequency.value = f;
      o.detune.value = det;
      o.connect(lp);
      o.start(t0);
      nodes.push(o);
    }
    lp.connect(gain).connect(this.master);
    lfo.start(t0);
    this.pad = { gain, nodes };
  }
}
