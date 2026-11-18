/**
 * Parametric 2D/3D XY vector geometry generators for analog oscilloscope synthesis.
 * All returned paths contain normalized { x, y } points inside [-1, 1].
 */

const CUBE_VERTICES = [
  { x: -1, y: -1, z: -1 },
  { x: 1, y: -1, z: -1 },
  { x: 1, y: -1, z: 1 },
  { x: -1, y: -1, z: 1 },
  { x: -1, y: 1, z: -1 },
  { x: 1, y: 1, z: -1 },
  { x: 1, y: 1, z: 1 },
  { x: -1, y: 1, z: 1 },
];

// Edge-only closed walk covering all 12 cube edges with zero diagonal jumps.
const CUBE_WALK = [0, 1, 2, 3, 0, 4, 5, 6, 7, 4, 5, 1, 2, 6, 7, 3, 0];

const PYRAMID_VERTICES = [
  { x: -1, y: -0.85, z: -1 },
  { x: 1, y: -0.85, z: -1 },
  { x: 1, y: -0.85, z: 1 },
  { x: -1, y: -0.85, z: 1 },
  { x: 0, y: 1.15, z: 0 },
];

// Edge-only closed walk covering all 8 square-pyramid edges.
const PYRAMID_WALK = [0, 1, 2, 3, 0, 4, 1, 2, 4, 3, 0];

// Crisp single/multi-stroke polyline glyphs in unit [0..1] x [0..1] cell (y-up).
export const VECTOR_FONT = {
  A: [[[0, 0], [0.5, 1], [1, 0]], [[0.2, 0.38], [0.8, 0.38]]],
  B: [[[0, 0], [0, 1], [0.7, 1], [0.9, 0.85], [0.9, 0.65], [0.7, 0.5], [0, 0.5]], [[0.7, 0.5], [0.95, 0.35], [0.95, 0.15], [0.7, 0], [0, 0]]],
  C: [[[1, 0.82], [0.75, 1], [0.25, 1], [0, 0.78], [0, 0.22], [0.25, 0], [0.75, 0], [1, 0.18]]],
  D: [[[0, 0], [0, 1], [0.65, 1], [0.98, 0.75], [0.98, 0.25], [0.65, 0], [0, 0]]],
  E: [[[1, 1], [0, 1], [0, 0], [1, 0]], [[0, 0.5], [0.75, 0.5]]],
  F: [[[1, 1], [0, 1], [0, 0]], [[0, 0.5], [0.75, 0.5]]],
  G: [[[1, 0.82], [0.75, 1], [0.25, 1], [0, 0.78], [0, 0.22], [0.25, 0], [0.85, 0], [1, 0.2], [1, 0.45], [0.55, 0.45]]],
  H: [[[0, 0], [0, 1]], [[1, 0], [1, 1]], [[0, 0.5], [1, 0.5]]],
  I: [[[0.2, 1], [0.8, 1]], [[0.5, 1], [0.5, 0]], [[0.2, 0], [0.8, 0]]],
  J: [[[0.25, 1], [0.9, 1]], [[0.75, 1], [0.75, 0.2], [0.5, 0], [0.2, 0], [0, 0.25]]],
  K: [[[0, 0], [0, 1]], [[1, 1], [0, 0.45], [1, 0]]],
  L: [[[0, 1], [0, 0], [0.95, 0]]],
  M: [[[0, 0], [0, 1], [0.5, 0.42], [1, 1], [1, 0]]],
  N: [[[0, 0], [0, 1], [1, 0], [1, 1]]],
  O: [[[0.25, 0], [0.75, 0], [1, 0.25], [1, 0.75], [0.75, 1], [0.25, 1], [0, 0.75], [0, 0.25], [0.25, 0]]],
  P: [[[0, 0], [0, 1], [0.75, 1], [1, 0.82], [1, 0.62], [0.75, 0.46], [0, 0.46]]],
  Q: [[[0.25, 0], [0.75, 0], [1, 0.25], [1, 0.75], [0.75, 1], [0.25, 1], [0, 0.75], [0, 0.25], [0.25, 0]], [[0.6, 0.3], [1.05, -0.05]]],
  R: [[[0, 0], [0, 1], [0.75, 1], [1, 0.82], [1, 0.62], [0.75, 0.46], [0, 0.46]], [[0.45, 0.46], [1, 0]]],
  S: [[[1, 0.85], [0.75, 1], [0.25, 1], [0, 0.82], [0, 0.62], [0.25, 0.5], [0.75, 0.5], [1, 0.35], [1, 0.15], [0.75, 0], [0.25, 0], [0, 0.15]]],
  T: [[[0, 1], [1, 1]], [[0.5, 1], [0.5, 0]]],
  U: [[[0, 1], [0, 0.22], [0.25, 0], [0.75, 0], [1, 0.22], [1, 1]]],
  V: [[[0, 1], [0.5, 0], [1, 1]]],
  W: [[[0, 1], [0.25, 0], [0.5, 0.55], [0.75, 0], [1, 1]]],
  X: [[[0, 1], [1, 0]], [[1, 1], [0, 0]]],
  Y: [[[0, 1], [0.5, 0.48], [1, 1]], [[0.5, 0.48], [0.5, 0]]],
  Z: [[[0, 1], [1, 1], [0, 0], [1, 0]]],
  "0": [[[0.2, 0], [0.8, 0], [1, 0.2], [1, 0.8], [0.8, 1], [0.2, 1], [0, 0.8], [0, 0.2], [0.2, 0]], [[0.1, 0.15], [0.9, 0.85]]],
  "1": [[[0.25, 0.8], [0.55, 1], [0.55, 0]], [[0.2, 0], [0.9, 0]]],
  "2": [[[0, 0.8], [0.25, 1], [0.75, 1], [1, 0.8], [1, 0.6], [0, 0], [1, 0]]],
  "3": [[[0, 0.85], [0.25, 1], [0.75, 1], [1, 0.8], [1, 0.6], [0.7, 0.5], [0.4, 0.5]], [[0.7, 0.5], [1, 0.35], [1, 0.18], [0.75, 0], [0.25, 0], [0, 0.15]]],
  "4": [[[0.8, 0], [0.8, 1], [0, 0.32], [1, 0.32]]],
  "5": [[[1, 1], [0.05, 1], [0.05, 0.55], [0.75, 0.55], [1, 0.38], [1, 0.16], [0.75, 0], [0.2, 0], [0, 0.15]]],
  "6": [[[0.85, 0.9], [0.65, 1], [0.25, 1], [0, 0.75], [0, 0.2], [0.25, 0], [0.75, 0], [1, 0.2], [1, 0.4], [0.75, 0.55], [0, 0.55]]],
  "7": [[[0, 1], [1, 1], [0.35, 0]]],
  "8": [[[0.25, 0.5], [0.75, 0.5], [0.95, 0.68], [0.95, 0.85], [0.75, 1], [0.25, 1], [0.05, 0.85], [0.05, 0.68], [0.25, 0.5], [0, 0.35], [0, 0.15], [0.25, 0], [0.75, 0], [1, 0.15], [1, 0.35], [0.75, 0.5]]],
  "9": [[[1, 0.45], [0.25, 0.45], [0, 0.62], [0, 0.84], [0.25, 1], [0.75, 1], [1, 0.8], [1, 0.2], [0.75, 0], [0.2, 0]]],
  "-": [[[0.15, 0.5], [0.85, 0.5]]],
  "+": [[[0.5, 0.2], [0.5, 0.8]], [[0.2, 0.5], [0.8, 0.5]]],
  ".": [[[0.45, 0], [0.55, 0], [0.55, 0.1], [0.45, 0.1], [0.45, 0]]],
  ":": [[[0.45, 0.2], [0.55, 0.2], [0.55, 0.3], [0.45, 0.3], [0.45, 0.2]], [[0.45, 0.65], [0.55, 0.65], [0.55, 0.75], [0.45, 0.75], [0.45, 0.65]]],
  "!": [[[0.5, 1], [0.5, 0.3]], [[0.45, 0], [0.55, 0], [0.55, 0.1], [0.45, 0.1], [0.45, 0]]],
  "/": [[[0.1, 0], [0.9, 1]]],
  " ": [],
};

/**
 * Rotate a 3D point using intrinsic Euler angles Rx -> Ry -> Rz (radians).
 */
export function rotate3D(point, rx, ry, rz) {
  const cx = Math.cos(rx);
  const sx = Math.sin(rx);
  const cy = Math.cos(ry);
  const sy = Math.sin(ry);
  const cz = Math.cos(rz);
  const sz = Math.sin(rz);

  // Rotate around X
  const y1 = point.y * cx - point.z * sx;
  const z1 = point.y * sx + point.z * cx;
  const x1 = point.x;

  // Rotate around Y
  const x2 = x1 * cy + z1 * sy;
  const z2 = -x1 * sy + z1 * cy;
  const y2 = y1;

  // Rotate around Z
  const x3 = x2 * cz - y2 * sz;
  const y3 = x2 * sz + y2 * cz;

  return { x: x3, y: y3, z: z2 };
}

/**
 * Perspective project a 3D point onto the 2D XY plane.
 */
export function project3D(point, cameraDistance = 3.6, fovScale = 2.0) {
  const denom = Math.max(0.25, cameraDistance - point.z);
  const factor = fovScale / denom;
  return {
    x: point.x * factor,
    y: point.y * factor,
  };
}

/**
 * Center and uniformly scale a 2D point list into [-targetRadius, targetRadius].
 */
export function normalizePath(points, targetRadius = 0.82) {
  if (!points || points.length === 0) {
    return [{ x: 0, y: 0 }];
  }
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const pt of points) {
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.y > maxY) maxY = pt.y;
  }
  const cx = (minX + maxX) * 0.5;
  const cy = (minY + maxY) * 0.5;
  const halfExtent = Math.max((maxX - minX) * 0.5, (maxY - minY) * 0.5, 1e-6);
  const scale = targetRadius / halfExtent;
  return points.map((pt) => ({
    x: (pt.x - cx) * scale,
    y: (pt.y - cy) * scale,
  }));
}

/**
 * Resample a polyline path uniformly by arc length to exact `sampleCount` points.
 */
export function resamplePath(points, sampleCount = 512, closed = true) {
  const count = Math.max(2, Math.floor(sampleCount));
  if (!points || points.length === 0) {
    return Array.from({ length: count }, () => ({ x: 0, y: 0 }));
  }
  if (points.length === 1) {
    return Array.from({ length: count }, () => ({ x: points[0].x, y: points[0].y }));
  }

  const segCount = closed ? points.length : points.length - 1;
  const cumLen = new Float64Array(segCount + 1);
  let totalLen = 0;

  for (let i = 0; i < segCount; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    totalLen += Math.hypot(b.x - a.x, b.y - a.y);
    cumLen[i + 1] = totalLen;
  }

  if (totalLen < 1e-8) {
    return Array.from({ length: count }, () => ({ x: points[0].x, y: points[0].y }));
  }

  const out = new Array(count);
  let segIdx = 0;
  for (let i = 0; i < count; i++) {
    const targetDist = closed ? (i / count) * totalLen : (i / (count - 1)) * totalLen;
    while (segIdx < segCount - 1 && cumLen[segIdx + 1] < targetDist) {
      segIdx++;
    }
    const segStart = cumLen[segIdx];
    const segLen = cumLen[segIdx + 1] - segStart;
    const t = segLen > 1e-9 ? (targetDist - segStart) / segLen : 0;
    const a = points[segIdx];
    const b = points[(segIdx + 1) % points.length];
    out[i] = {
      x: a.x + (b.x - a.x) * t,
      y: a.y + (b.y - a.y) * t,
    };
  }
  return out;
}

function buildWalkPath(vertices3D, walkIndices, rx, ry, rz, sampleCount) {
  const projected = vertices3D.map((v) => project3D(rotate3D(v, rx, ry, rz)));
  const poly = walkIndices.slice(0, -1).map((idx) => projected[idx]);
  // Resample first so vertices share equal arc-length density, then clamp safely within [-0.85, 0.85].
  const resampled = resamplePath(poly, sampleCount, true);
  let maxAbs = 0;
  for (const p of resampled) {
    maxAbs = Math.max(maxAbs, Math.abs(p.x), Math.abs(p.y));
  }
  const maxAllowed = 0.86;
  if (maxAbs > maxAllowed) {
    const k = maxAllowed / maxAbs;
    return resampled.map((p) => ({ x: p.x * k, y: p.y * k }));
  }
  return resampled;
}

/**
 * Spinning 3D wireframe cube projected to a continuous closed 2D XY path.
 */
export function generateCubePath(rx = 0.45, ry = 0.65, rz = 0.15, sampleCount = 640) {
  return buildWalkPath(CUBE_VERTICES, CUBE_WALK, rx, ry, rz, sampleCount);
}

/**
 * Spinning 3D wireframe square pyramid projected to a continuous closed 2D XY path.
 */
export function generatePyramidPath(rx = 0.4, ry = 0.65, rz = 0.1, sampleCount = 512) {
  return buildWalkPath(PYRAMID_VERTICES, PYRAMID_WALK, rx, ry, rz, sampleCount);
}

/**
 * Parametric 3D (p, q) Torus Knot rotated in 3D and projected onto XY.
 */
export function generateTorusKnotPath(rx = 0.4, ry = 0.5, rz = 0.2, p = 2, q = 3, sampleCount = 640) {
  const count = Math.max(64, Math.floor(sampleCount));
  const majorR = 1.0;
  const tubeR = 0.42;
  const raw = new Array(count);

  for (let i = 0; i < count; i++) {
    const t = (i / count) * Math.PI * 2;
    const r = majorR + tubeR * Math.cos(q * t);
    const pt3 = {
      x: r * Math.cos(p * t),
      y: r * Math.sin(p * t),
      z: tubeR * Math.sin(q * t),
    };
    raw[i] = project3D(rotate3D(pt3, rx, ry, rz), 3.8, 2.0);
  }
  return normalizePath(raw, 0.82);
}

/**
 * Lissajous curve for harmonic ratio fx : fy and phase offset (radians).
 */
export function generateLissajousPath(fx = 3, fy = 2, phase = Math.PI / 4, sampleCount = 640) {
  const count = Math.max(64, Math.floor(sampleCount));
  const rx = Math.max(1, Math.round(fx));
  const ry = Math.max(1, Math.round(fy));
  const amp = 0.85;
  const out = new Array(count);

  for (let i = 0; i < count; i++) {
    const t = (i / count) * Math.PI * 2;
    out[i] = {
      x: amp * Math.sin(rx * t),
      y: amp * Math.sin(ry * t + phase),
    };
  }
  return out;
}

/**
 * Build continuous XY path from disconnected strokes.
 * Allocates most samples to strokes (slow beam = bright) and few to jumps (fast beam = dim).
 */
function compileStrokesToPath(strokes, sampleCount = 768) {
  if (!strokes || strokes.length === 0) {
    return resamplePath([{ x: -0.3, y: 0 }, { x: 0.3, y: 0 }], sampleCount, true);
  }

  const strokeLens = strokes.map((stroke) => {
    let len = 0;
    for (let i = 0; i < stroke.length - 1; i++) {
      len += Math.hypot(stroke[i + 1].x - stroke[i].x, stroke[i + 1].y - stroke[i].y);
    }
    return Math.max(len, 1e-4);
  });
  const totalStrokeLen = strokeLens.reduce((a, b) => a + b, 0);

  // Reserve 2 samples per transit jump so beam zips rapidly across blank gaps (dimmer trace).
  const jumpSamplesPerGap = 2;
  const totalJumpSamples = strokes.length * jumpSamplesPerGap;
  const drawBudget = Math.max(strokes.length * 4, sampleCount - totalJumpSamples);

  // Distribute integer drawBudget exactly across strokes while preserving velocity contrast.
  const counts = strokeLens.map((len) => Math.max(4, Math.floor((len / totalStrokeLen) * drawBudget)));
  let remaining = drawBudget - counts.reduce((a, b) => a + b, 0);
  let idx = 0;
  while (remaining > 0) {
    counts[idx % counts.length] += 1;
    remaining--;
    idx++;
  }
  while (remaining < 0) {
    const k = idx % counts.length;
    if (counts[k] > 4) {
      counts[k] -= 1;
      remaining++;
    }
    idx++;
    if (idx > counts.length * 10) break;
  }

  const out = [];
  for (let s = 0; s < strokes.length; s++) {
    const stroke = strokes[s];
    const nextStroke = strokes[(s + 1) % strokes.length];
    const sampledStroke = resamplePath(stroke, counts[s], false);
    for (const pt of sampledStroke) {
      out.push(pt);
    }

    const endPt = stroke[stroke.length - 1];
    const nextStart = nextStroke[0];
    for (let j = 1; j <= jumpSamplesPerGap; j++) {
      const t = j / (jumpSamplesPerGap + 1);
      out.push({
        x: endPt.x + (nextStart.x - endPt.x) * t,
        y: endPt.y + (nextStart.y - endPt.y) * t,
      });
    }
  }

  return out.slice(0, sampleCount);
}

/**
 * Vector text generator rendering crisp polyline glyphs for custom strings like "RUST", "XY", "AI".
 */
export function generateTextPath(text = "RUST", sampleCount = 768) {
  const clean = String(text || "XY").toUpperCase().slice(0, 14);
  const chars = [...clean];
  const charAdvance = 1.32;
  const strokes = [];

  for (let idx = 0; idx < chars.length; idx++) {
    const ch = chars[idx];
    const glyph = VECTOR_FONT[ch] ?? VECTOR_FONT[" "];
    const xOffset = idx * charAdvance;
    for (const stroke of glyph) {
      if (stroke.length >= 2) {
        strokes.push(
          stroke.map(([gx, gy]) => ({
            x: xOffset + gx,
            y: gy,
          })),
        );
      }
    }
  }

  if (strokes.length === 0) {
    return generateLissajousPath(1, 1, Math.PI / 2, sampleCount);
  }

  // Normalize all stroke vertices together into [-0.84, 0.84] before compiling velocity path.
  const allPts = strokes.flat();
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  for (const pt of allPts) {
    if (pt.x < minX) minX = pt.x;
    if (pt.x > maxX) maxX = pt.x;
    if (pt.y < minY) minY = pt.y;
    if (pt.y > maxY) maxY = pt.y;
  }
  const cx = (minX + maxX) * 0.5;
  const cy = (minY + maxY) * 0.5;
  const halfExtent = Math.max((maxX - minX) * 0.5, (maxY - minY) * 0.5, 0.5);
  const scale = 0.84 / halfExtent;

  const normStrokes = strokes.map((stroke) =>
    stroke.map((pt) => ({
      x: (pt.x - cx) * scale,
      y: (pt.y - cy) * scale,
    })),
  );

  return compileStrokesToPath(normStrokes, sampleCount);
}

/**
 * Starter presets for the Freehand Draw Pad so users have an immediate shape to hear & remix.
 */
export function getFreehandPreset(kind = "heart", numPoints = 128) {
  const pts = [];
  if (kind === "star") {
    const spikes = 5;
    for (let i = 0; i < spikes * 2; i++) {
      const r = i % 2 === 0 ? 0.82 : 0.34;
      const a = (i / (spikes * 2)) * Math.PI * 2 - Math.PI / 2;
      pts.push({ x: r * Math.cos(a), y: r * Math.sin(a) });
    }
    return resamplePath(pts, numPoints, true);
  }
  // Default: parametric heart
  for (let i = 0; i < numPoints; i++) {
    const t = (i / numPoints) * Math.PI * 2;
    const x = 16 * Math.pow(Math.sin(t), 3);
    const y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
    pts.push({ x, y });
  }
  return normalizePath(pts, 0.8);
}

/**
 * Convert raw freehand pointer points in [-1, 1] into a smooth closed oscilloscope loop.
 */
export function processFreehandPath(rawPoints, sampleCount = 512) {
  if (!rawPoints || rawPoints.length < 2) {
    return getFreehandPreset("heart", sampleCount);
  }
  const clamped = rawPoints.map((p) => ({
    x: Math.max(-0.95, Math.min(0.95, p.x)),
    y: Math.max(-0.95, Math.min(0.95, p.y)),
  }));
  return resamplePath(clamped, sampleCount, true);
}

/**
 * Unified shape generator used by both real-time CRT playback and WAV export.
 */
export function generateShapePath(config, timeSec = 0) {
  const spin = (config.spinSpeed ?? 1.0) * timeSec;
  const rx = (config.tiltX ?? 0.45) + spin * 0.72;
  const ry = (config.tiltY ?? 0.65) + spin * 1.05;
  const rz = (config.tiltZ ?? 0.15) + spin * 0.31;

  switch (config.shape) {
    case "cube":
      return generateCubePath(rx, ry, rz, 640);
    case "pyramid":
      return generatePyramidPath(rx, ry, rz, 512);
    case "torus-knot":
      return generateTorusKnotPath(
        rx,
        ry,
        rz,
        config.torusP ?? 2,
        config.torusQ ?? 3,
        640,
      );
    case "lissajous":
      return generateLissajousPath(
        config.fx ?? 3,
        config.fy ?? 2,
        (config.phaseOffset ?? 0) + (config.phaseDrift ?? 0.6) * timeSec,
        640,
      );
    case "text":
      return generateTextPath(config.text ?? "RUST", 768);
    case "freehand":
      return processFreehandPath(config.freehandPoints, 512);
    default:
      return generateCubePath(rx, ry, rz, 640);
  }
}
