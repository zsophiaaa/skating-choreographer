/* ============================================================
   music.js — audio import, waveform, BPM detection, playback
   Uses the Web Audio API only; nothing is uploaded anywhere.
   ============================================================ */

const Music = {
  ctx: null,
  buffer: null,
  name: null,
  duration: 0,
  peaks: null,          // [[min,max], ...] for the waveform
  onsets: null,         // onset-strength envelope
  onsetHop: 0,          // seconds per onset frame
  src: null,
  gain: null,
  playing: false,
  startedAt: 0,         // audioCtx time when playback started
  startOffset: 0,       // position in the buffer at that moment
  rate: 1,
  _tapTimes: [],

  ensureCtx() {
    if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (this.ctx.state === 'suspended') this.ctx.resume();
    return this.ctx;
  },

  async load(file) {
    const ctx = this.ensureCtx();
    const buf = await file.arrayBuffer();
    const audio = await ctx.decodeAudioData(buf);
    this.buffer = audio;
    this.name = file.name;
    this.duration = audio.duration;
    this.peaks = computePeaks(audio, 1400);
    const on = computeOnsets(audio);
    this.onsets = on.env;
    this.onsetHop = on.hop;
    return { bpm: detectBPM(on), offset: detectOffset(on, detectBPM(on)) };
  },

  play(offsetSec, rate = 1) {
    if (!this.buffer) return;
    const ctx = this.ensureCtx();
    this.stop();
    const src = ctx.createBufferSource();
    src.buffer = this.buffer;
    src.playbackRate.value = rate;
    const g = ctx.createGain();
    g.gain.value = 1;
    src.connect(g); g.connect(ctx.destination);
    src.start(0, clamp(offsetSec, 0, this.duration - 0.01));
    this.src = src; this.gain = g;
    this.startedAt = ctx.currentTime;
    this.startOffset = offsetSec;
    this.rate = rate;
    this.playing = true;
  },

  stop() {
    if (this.src) { try { this.src.stop(); } catch (e) { /* already stopped */ } this.src.disconnect(); }
    this.src = null; this.playing = false;
  },

  /** current playhead position in the audio, in seconds */
  position() {
    if (!this.playing || !this.ctx) return this.startOffset;
    return this.startOffset + (this.ctx.currentTime - this.startedAt) * this.rate;
  },

  setVolume(v) { if (this.gain) this.gain.gain.value = v; },

  /** tap tempo — call on each tap, returns a BPM estimate once there are enough taps */
  tap() {
    const now = performance.now() / 1000;
    if (this._tapTimes.length && now - this._tapTimes[this._tapTimes.length - 1] > 2.5) this._tapTimes = [];
    this._tapTimes.push(now);
    if (this._tapTimes.length > 8) this._tapTimes.shift();
    if (this._tapTimes.length < 3) return null;
    const gaps = [];
    for (let i = 1; i < this._tapTimes.length; i++) gaps.push(this._tapTimes[i] - this._tapTimes[i - 1]);
    gaps.sort((a, b) => a - b);
    const med = gaps[Math.floor(gaps.length / 2)];
    return clamp(60 / med, 40, 220);
  },

  resetTaps() { this._tapTimes = []; },
};

/* ------------------------------------------------------------
   Waveform peaks
   ------------------------------------------------------------ */
function computePeaks(buffer, n) {
  const ch = buffer.numberOfChannels > 1
    ? mixDown(buffer)
    : buffer.getChannelData(0);
  const block = Math.max(1, Math.floor(ch.length / n));
  const peaks = new Array(n);
  for (let i = 0; i < n; i++) {
    let mn = 1, mx = -1;
    const s = i * block, e = Math.min(ch.length, s + block);
    for (let j = s; j < e; j++) {
      const v = ch[j];
      if (v < mn) mn = v;
      if (v > mx) mx = v;
    }
    peaks[i] = [mn === 1 ? 0 : mn, mx === -1 ? 0 : mx];
  }
  return peaks;
}

function mixDown(buffer) {
  const n = buffer.length;
  const out = new Float32Array(n);
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const d = buffer.getChannelData(c);
    for (let i = 0; i < n; i++) out[i] += d[i];
  }
  const k = 1 / buffer.numberOfChannels;
  for (let i = 0; i < n; i++) out[i] *= k;
  return out;
}

/* ------------------------------------------------------------
   Onset envelope + BPM
   Energy-based, deliberately simple. Works well on anything with a
   pulse; for lyrical/classical skating music use tap tempo instead —
   which is what choreographers do anyway.
   ------------------------------------------------------------ */
function computeOnsets(buffer) {
  const sr = buffer.sampleRate;
  const data = buffer.numberOfChannels > 1 ? mixDown(buffer) : buffer.getChannelData(0);
  const win = 1024, hop = 512;
  const frames = Math.floor((data.length - win) / hop);
  const rms = new Float32Array(Math.max(0, frames));
  for (let f = 0; f < frames; f++) {
    let s = 0;
    const o = f * hop;
    for (let i = 0; i < win; i++) { const v = data[o + i]; s += v * v; }
    rms[f] = Math.sqrt(s / win);
  }
  // half-wave rectified difference = onset strength
  const env = new Float32Array(Math.max(0, frames));
  for (let f = 1; f < frames; f++) env[f] = Math.max(0, rms[f] - rms[f - 1]);
  // normalise
  let mx = 0; for (let i = 0; i < env.length; i++) mx = Math.max(mx, env[i]);
  if (mx > 0) for (let i = 0; i < env.length; i++) env[i] /= mx;
  return { env, hop: hop / sr, rms };
}

function detectBPM(on) {
  const { env, hop } = on;
  if (!env || env.length < 50) return 100;
  const minBPM = 60, maxBPM = 190;
  const minLag = Math.floor((60 / maxBPM) / hop);
  const maxLag = Math.ceil((60 / minBPM) / hop);
  let best = 0, bestLag = minLag;
  for (let lag = minLag; lag <= maxLag; lag++) {
    let s = 0;
    for (let i = 0; i + lag < env.length; i++) s += env[i] * env[i + lag];
    // slight preference for the middle of the range so we don't lock onto half/double time
    const bpm = 60 / (lag * hop);
    const w = 1 - Math.abs(bpm - 118) / 260;
    s *= w;
    if (s > best) { best = s; bestLag = lag; }
  }
  let bpm = 60 / (bestLag * hop);
  while (bpm < 70) bpm *= 2;
  while (bpm > 180) bpm /= 2;
  return Math.round(bpm * 10) / 10;
}

/** find the phase (seconds) of beat 1 by testing a beat comb */
function detectOffset(on, bpm) {
  const { env, hop } = on;
  if (!env || !env.length) return 0;
  const period = 60 / bpm / hop;
  let best = -1, bestPhase = 0;
  const steps = Math.max(4, Math.floor(period));
  for (let p = 0; p < steps; p++) {
    let s = 0;
    for (let k = 0; ; k++) {
      const i = Math.round(p + k * period);
      if (i >= env.length) break;
      s += env[i];
    }
    if (s > best) { best = s; bestPhase = p; }
  }
  return +(bestPhase * hop).toFixed(3);
}

/* ------------------------------------------------------------
   Waveform drawing
   ------------------------------------------------------------ */
function drawWaveform(ctx, W, H, opts) {
  const { peaks, duration, time, bpm, offset, hits, program, path, selection } = opts;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0e1620';
  ctx.fillRect(0, 0, W, H);

  const dur = duration || (path ? path.totalTime : 0) || 1;
  const X = (t) => (t / dur) * W;

  // 8-count phrase shading (this is how choreographers read music)
  if (bpm) {
    const spb = 60 / bpm;
    const bar = spb * 8;
    let i = 0;
    for (let t = offset; t < dur; t += bar, i++) {
      if (i % 2 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.035)';
        ctx.fillRect(X(t), 0, Math.max(1, X(bar) - X(0)), H);
      }
    }
  }

  // waveform
  if (peaks && peaks.length) {
    ctx.fillStyle = '#3c7fb5';
    const n = peaks.length;
    for (let i = 0; i < n; i++) {
      const x = (i / n) * W;
      const [mn, mx] = peaks[i];
      const y0 = H / 2 - mx * (H / 2) * 0.92;
      const y1 = H / 2 - mn * (H / 2) * 0.92;
      ctx.fillRect(x, y0, Math.max(1, W / n), Math.max(1, y1 - y0));
    }
  } else {
    ctx.fillStyle = '#1d2b3a';
    ctx.fillRect(0, H / 2 - 1, W, 2);
  }

  // beat ticks
  if (bpm) {
    const spb = 60 / bpm;
    for (let b = 0, t = offset; t < dur; b++, t = offset + b * spb) {
      const x = X(t);
      const strong = b % 8 === 0;
      ctx.strokeStyle = strong ? 'rgba(255,255,255,0.42)' : 'rgba(255,255,255,0.13)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, strong ? 0 : H * 0.72); ctx.lineTo(x, H); ctx.stroke();
      if (strong) {
        ctx.fillStyle = 'rgba(255,255,255,0.45)';
        ctx.font = '9px ui-monospace, monospace';
        ctx.fillText(String(b / 8 + 1), x + 2, 10);
      }
    }
  }

  // element blocks
  if (path && path.segs.length) {
    const t0 = (program && program.offset) || 0;
    for (const seg of path.segs) {
      const x0 = X(seg.t0 + t0), x1 = X(seg.t1 + t0);
      const col = CAT_COLOR[seg.lib.cat] || '#48c';
      ctx.fillStyle = col;
      ctx.globalAlpha = seg.ei === selection ? 0.95 : 0.6;
      ctx.fillRect(x0, H - 16, Math.max(2, x1 - x0 - 1), 14);
      ctx.globalAlpha = 1;
      if (x1 - x0 > 34) {
        ctx.fillStyle = '#08121b';
        ctx.font = 'bold 9px ui-sans-serif, system-ui';
        ctx.save(); ctx.beginPath(); ctx.rect(x0 + 2, H - 16, x1 - x0 - 5, 14); ctx.clip();
        ctx.fillText(seg.lib.name, x0 + 4, H - 5);
        ctx.restore();
      }
    }
  }

  // hit markers
  if (hits) {
    for (const h of hits) {
      const x = X(h);
      ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
      ctx.fillStyle = '#ffd166';
      ctx.beginPath(); ctx.moveTo(x - 4, 0); ctx.lineTo(x + 4, 0); ctx.lineTo(x, 7); ctx.closePath(); ctx.fill();
    }
  }

  // playhead
  const px = X(time);
  ctx.strokeStyle = '#ff5c7a'; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, H); ctx.stroke();
}
