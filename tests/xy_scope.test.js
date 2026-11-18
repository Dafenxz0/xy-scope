import test from "node:test";
import assert from "node:assert/strict";

import {
  rotate3D,
  project3D,
  resamplePath,
  generateCubePath,
  generatePyramidPath,
  generateTorusKnotPath,
  generateLissajousPath,
  generateTextPath,
  processFreehandPath,
  getFreehandPreset,
} from "../src/shapes.js";
import {
  softLimit,
  StereoOscilloscopeSynth,
  encodeWavPcm16Stereo,
  renderStereoWavBuffer,
} from "../src/synth.js";

test("3D rotation and perspective projection stay finite and bounded for Cube, Pyramid, and Torus Knot", () => {
  const angles = [
    [0, 0, 0],
    [0.7, 1.3, 0.4],
    [2.1, -1.8, 3.0],
  ];

  for (const [rx, ry, rz] of angles) {
    const rotated = rotate3D({ x: 1, y: -1, z: 1 }, rx, ry, rz);
    const norm = Math.hypot(rotated.x, rotated.y, rotated.z);
    assert.ok(Math.abs(norm - Math.sqrt(3)) < 1e-6, "Rotation must preserve vector length");

    const proj = project3D(rotated);
    assert.ok(Number.isFinite(proj.x) && Number.isFinite(proj.y));

    for (const path of [
      generateCubePath(rx, ry, rz, 512),
      generatePyramidPath(rx, ry, rz, 512),
      generateTorusKnotPath(rx, ry, rz, 3, 5, 512),
    ]) {
      assert.equal(path.length, 512);
      for (const pt of path) {
        assert.ok(Number.isFinite(pt.x) && Number.isFinite(pt.y));
        assert.ok(pt.x >= -1 && pt.x <= 1, `x out of bounds: ${pt.x}`);
        assert.ok(pt.y >= -1 && pt.y <= 1, `y out of bounds: ${pt.y}`);
      }
    }
  }
});

test("Path resampling maintains exact count, uniform arc-length continuity, and closure", () => {
  const square = [
    { x: -0.5, y: -0.5 },
    { x: 0.5, y: -0.5 },
    { x: 0.5, y: 0.5 },
    { x: -0.5, y: 0.5 },
  ];
  const sampled = resamplePath(square, 400, true);
  assert.equal(sampled.length, 400);

  const expectedStep = 4.0 / 400; // perimeter = 4.0
  for (let i = 0; i < sampled.length; i++) {
    const a = sampled[i];
    const b = sampled[(i + 1) % sampled.length];
    const d = Math.hypot(b.x - a.x, b.y - a.y);
    assert.ok(Number.isFinite(d));
    assert.ok(d > 0 && d <= expectedStep * 1.25, `Unexpected discontinuity step ${d}`);
  }
});

test("Lissajous, Vector Text, and Freehand generators produce valid bounded XY paths", () => {
  const liss = generateLissajousPath(3, 2, Math.PI / 3, 512);
  assert.equal(liss.length, 512);
  for (const pt of liss) {
    assert.ok(Math.abs(pt.x) <= 1 && Math.abs(pt.y) <= 1);
  }

  for (const word of ["RUST", "XY", "AI"]) {
    const textPath = generateTextPath(word, 768);
    assert.equal(textPath.length, 768);
    let maxStep = 0;
    const steps = [];
    for (let i = 0; i < textPath.length; i++) {
      const a = textPath[i];
      const b = textPath[(i + 1) % textPath.length];
      assert.ok(Math.abs(a.x) <= 1 && Math.abs(a.y) <= 1);
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      steps.push(d);
      if (d > maxStep) maxStep = d;
    }
    steps.sort((u, v) => u - v);
    const medianStep = steps[Math.floor(steps.length / 2)];
    assert.ok(maxStep > medianStep * 2, `Expected fast transit jump vs stroke dwell for "${word}"`);
  }

  const heart = getFreehandPreset("heart", 128);
  const freehand = processFreehandPath(heart, 512);
  assert.equal(freehand.length, 512);
  assert.ok(freehand.every((p) => Number.isFinite(p.x) && Math.abs(p.x) <= 1 && Math.abs(p.y) <= 1));
});

test("Stereo synthesizer normalizes samples strictly within [-1, 1] across extreme gain", () => {
  assert.equal(softLimit(NaN), 0);
  assert.ok(softLimit(100) <= 1 && softLimit(-100) >= -1);

  const synth = new StereoOscilloscopeSynth(1024);
  synth.updatePath(generateCubePath(0.4, 0.9, 0.2, 640), false);

  const left = new Float32Array(2048);
  const right = new Float32Array(2048);
  synth.synthesizeBlock(left, right, 44100, 110, 1.5);

  let energyL = 0;
  let energyR = 0;
  for (let i = 0; i < left.length; i++) {
    assert.ok(Number.isFinite(left[i]) && left[i] >= -1 && left[i] <= 1);
    assert.ok(Number.isFinite(right[i]) && right[i] >= -1 && right[i] <= 1);
    energyL += left[i] * left[i];
    energyR += right[i] * right[i];
  }
  assert.ok(energyL > 10 && energyR > 10, "Synthesized stereo channels must carry non-zero energy");
});

test("RIFF stereo WAV encoder and full renderer produce valid 44.1kHz 16-bit PCM WAV headers and exact byte lengths", () => {
  const l = new Float32Array([0, 0.5, -0.5, 1.0, -1.0]);
  const r = new Float32Array([0.25, -0.25, 0.75, -1.0, 1.0]);
  const rawWav = encodeWavPcm16Stereo(l, r, 44100);
  assert.equal(rawWav.byteLength, 44 + 5 * 4);

  const durationSec = 0.5;
  const sampleRate = 44100;
  const expectedFrames = Math.round(durationSec * sampleRate);
  const wav = renderStereoWavBuffer({
    shapeConfig: { shape: "lissajous", fx: 3, fy: 2, phaseDrift: 0.5 },
    durationSec,
    sampleRate,
    freqHz: 110,
    gain: 0.8,
    animated: true,
  });

  assert.equal(wav.byteLength, 44 + expectedFrames * 4);

  const view = new DataView(wav.buffer, wav.byteOffset, wav.byteLength);
  const ascii = (start, len) =>
    String.fromCharCode(...wav.subarray(start, start + len));

  assert.equal(ascii(0, 4), "RIFF");
  assert.equal(view.getUint32(4, true), 36 + expectedFrames * 4);
  assert.equal(ascii(8, 4), "WAVE");
  assert.equal(ascii(12, 4), "fmt ");
  assert.equal(view.getUint32(16, true), 16);
  assert.equal(view.getUint16(20, true), 1); // PCM
  assert.equal(view.getUint16(22, true), 2); // Stereo
  assert.equal(view.getUint32(24, true), 44100);
  assert.equal(view.getUint32(28, true), 176400); // 44100 * 2 * 2
  assert.equal(view.getUint16(32, true), 4); // blockAlign
  assert.equal(view.getUint16(34, true), 16); // bitsPerSample
  assert.equal(ascii(36, 4), "data");
  assert.equal(view.getUint32(40, true), expectedFrames * 4);

  // Confirm payload has non-zero audio samples
  let peak = 0;
  for (let off = 44; off < wav.byteLength; off += 2) {
    peak = Math.max(peak, Math.abs(view.getInt16(off, true)));
  }
  assert.ok(peak > 1000, "Rendered WAV payload must contain audible PCM samples");
});
