import { generateShapePath } from "./shapes.js";

/**
 * Smooth saturation limiter guaranteeing output stays strictly in [-1, 1].
 */
export function softLimit(x, drive = 1.0) {
  if (!Number.isFinite(x)) return 0;
  const scaled = x * drive;
  const limited = Math.tanh(scaled);
  return Math.max(-1, Math.min(1, limited));
}

/**
 * Real-time stereo wavetable synthesizer where Left = X and Right = Y.
 * Directly drives both Web Audio stereo output and CRT XY deflection.
 */
export class StereoOscilloscopeSynth {
  constructor(tableSize = 1024) {
    this.tableSize = Math.max(64, Math.floor(tableSize));
    this.leftTable = new Float32Array(this.tableSize);
    this.rightTable = new Float32Array(this.tableSize);
    this.prevLeftTable = new Float32Array(this.tableSize);
    this.prevRightTable = new Float32Array(this.tableSize);
    this.phase = 0;
    this.crossfadeSamples = 0;
    this.crossfadeTotal = 128;
    this.initialized = false;
  }

  /**
   * Load a normalized [{x, y}] path into the stereo wavetable.
   * @param {Array<{x: number, y: number}>} points
   * @param {boolean} crossfade Enable short de-clicking crossfade on abrupt shape change.
   */
  updatePath(points, crossfade = false) {
    if (!points || points.length === 0) return;

    if (crossfade && this.initialized) {
      this.prevLeftTable.set(this.leftTable);
      this.prevRightTable.set(this.rightTable);
      this.crossfadeSamples = this.crossfadeTotal;
    }

    const srcLen = points.length;
    for (let i = 0; i < this.tableSize; i++) {
      const pos = (i / this.tableSize) * srcLen;
      const idx0 = Math.floor(pos) % srcLen;
      const idx1 = (idx0 + 1) % srcLen;
      const frac = pos - Math.floor(pos);

      const x = points[idx0].x + (points[idx1].x - points[idx0].x) * frac;
      const y = points[idx0].y + (points[idx1].y - points[idx0].y) * frac;

      this.leftTable[i] = Number.isFinite(x) ? Math.max(-1, Math.min(1, x)) : 0;
      this.rightTable[i] = Number.isFinite(y) ? Math.max(-1, Math.min(1, y)) : 0;
    }
    this.initialized = true;
  }

  _sampleTable(table, phase) {
    const pos = phase * this.tableSize;
    const i0 = Math.floor(pos) % this.tableSize;
    const i1 = (i0 + 1) % this.tableSize;
    const frac = pos - Math.floor(pos);
    return table[i0] + (table[i1] - table[i0]) * frac;
  }

  /**
   * Synthesize a stereo audio block into leftOut and rightOut Float32Arrays.
   */
  synthesizeBlock(leftOut, rightOut, sampleRate = 44100, freqHz = 82.41, gain = 0.85) {
    const len = Math.min(leftOut.length, rightOut.length);
    const safeRate = Math.max(8000, sampleRate);
    const safeFreq = Math.max(10, Math.min(2000, freqHz));
    const safeGain = Math.max(0, Math.min(1.5, gain));
    const phaseInc = safeFreq / safeRate;

    for (let i = 0; i < len; i++) {
      let lx = this._sampleTable(this.leftTable, this.phase);
      let ry = this._sampleTable(this.rightTable, this.phase);

      if (this.crossfadeSamples > 0) {
        const mix = 1 - this.crossfadeSamples / this.crossfadeTotal;
        const px = this._sampleTable(this.prevLeftTable, this.phase);
        const py = this._sampleTable(this.prevRightTable, this.phase);
        lx = px + (lx - px) * mix;
        ry = py + (ry - py) * mix;
        this.crossfadeSamples--;
      }

      leftOut[i] = softLimit(lx * safeGain, 1.1);
      rightOut[i] = softLimit(ry * safeGain, 1.1);

      this.phase += phaseInc;
      if (this.phase >= 1) {
        this.phase -= Math.floor(this.phase);
      }
    }
  }

  /**
   * Non-mutating preview buffer reflecting current wavetable and gain.
   */
  samplePreview(numSamples = 1024, sampleRate = 44100, freqHz = 82.41, gain = 0.85) {
    const left = new Float32Array(numSamples);
    const right = new Float32Array(numSamples);
    const savedPhase = this.phase;
    const savedFade = this.crossfadeSamples;
    this.phase = 0;
    this.crossfadeSamples = 0;
    this.synthesizeBlock(left, right, sampleRate, freqHz, gain);
    this.phase = savedPhase;
    this.crossfadeSamples = savedFade;
    return { left, right };
  }
}

/**
 * Encode stereo Float32 [-1, 1] channels into a standard 16-bit PCM RIFF/WAVE buffer.
 */
export function encodeWavPcm16Stereo(leftSamples, rightSamples, sampleRate = 44100) {
  const numFrames = Math.min(leftSamples.length, rightSamples.length);
  const numChannels = 2;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const byteRate = sampleRate * blockAlign;
  const dataSize = numFrames * blockAlign;
  const totalSize = 44 + dataSize;

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);

  const writeAscii = (offset, text) => {
    for (let i = 0; i < text.length; i++) {
      view.setUint8(offset + i, text.charCodeAt(i));
    }
  };

  // RIFF chunk descriptor
  writeAscii(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeAscii(8, "WAVE");

  // fmt sub-chunk
  writeAscii(12, "fmt ");
  view.setUint32(16, 16, true); // PCM subchunk size
  view.setUint16(20, 1, true); // AudioFormat = 1 (PCM)
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data sub-chunk
  writeAscii(36, "data");
  view.setUint32(40, dataSize, true);

  let offset = 44;
  for (let i = 0; i < numFrames; i++) {
    const l = Math.max(-1, Math.min(1, Number.isFinite(leftSamples[i]) ? leftSamples[i] : 0));
    const r = Math.max(-1, Math.min(1, Number.isFinite(rightSamples[i]) ? rightSamples[i] : 0));
    view.setInt16(offset, Math.round(l * 32767), true);
    view.setInt16(offset + 2, Math.round(r * 32767), true);
    offset += 4;
  }

  return new Uint8Array(buffer);
}

/**
 * Render an entire animated (or static) stereo WAV clip for download or external scope playback.
 */
export function renderStereoWavBuffer({
  shapeConfig,
  durationSec = 2.5,
  sampleRate = 44100,
  freqHz = 82.41,
  gain = 0.85,
  animated = true,
  startTimeSec = 0,
}) {
  const numFrames = Math.max(1, Math.round(durationSec * sampleRate));
  const left = new Float32Array(numFrames);
  const right = new Float32Array(numFrames);

  const synth = new StereoOscilloscopeSynth(1024);
  const chunkSize = 256;
  const blockL = new Float32Array(chunkSize);
  const blockR = new Float32Array(chunkSize);

  for (let offset = 0; offset < numFrames; offset += chunkSize) {
    const len = Math.min(chunkSize, numFrames - offset);
    const t = startTimeSec + (animated ? offset / sampleRate : 0);
    if (offset === 0 || animated) {
      const path = generateShapePath(shapeConfig, t);
      synth.updatePath(path, false);
    }
    const viewL = len === chunkSize ? blockL : blockL.subarray(0, len);
    const viewR = len === chunkSize ? blockR : blockR.subarray(0, len);
    synth.synthesizeBlock(viewL, viewR, sampleRate, freqHz, gain);
    left.set(viewL, offset);
    right.set(viewR, offset);
  }

  return encodeWavPcm16Stereo(left, right, sampleRate);
}
