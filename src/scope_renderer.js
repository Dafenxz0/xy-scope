/**
 * Tektronix-inspired CRT Phosphor Persistence Renderer with variable-velocity beam brightness.
 */

export const PHOSPHOR_PALETTES = {
  green: {
    name: "P31 Green",
    bg: [3, 9, 5],
    halo: "rgba(32, 230, 96, 1)",
    core: "rgba(185, 255, 200, 1)",
    grid: "rgba(70, 195, 110, 0.16)",
    axis: "rgba(95, 225, 135, 0.30)",
  },
  amber: {
    name: "P3 Amber",
    bg: [10, 6, 2],
    halo: "rgba(255, 148, 20, 1)",
    core: "rgba(255, 228, 165, 1)",
    grid: "rgba(240, 165, 60, 0.16)",
    axis: "rgba(255, 185, 85, 0.30)",
  },
  cyan: {
    name: "P11 Cyan",
    bg: [3, 7, 12],
    halo: "rgba(30, 205, 255, 1)",
    core: "rgba(205, 248, 255, 1)",
    grid: "rgba(80, 195, 245, 0.16)",
    axis: "rgba(110, 220, 255, 0.30)",
  },
};

export class ScopeRenderer {
  constructor(phosphorCanvas, graticuleCanvas) {
    this.phosphorCanvas = phosphorCanvas;
    this.graticuleCanvas = graticuleCanvas;
    this.ctx = phosphorCanvas.getContext("2d", { alpha: false });
    this.gratCtx = graticuleCanvas.getContext("2d");
    this.width = 600;
    this.height = 600;
    this.dpr = 1;
    this.paletteKey = "green";

    if (!this.ctx || !this.gratCtx) {
      throw new Error("Canvas 2D context is unavailable.");
    }
  }

  resize(cssWidth, cssHeight, dpr = 1) {
    const safeDpr = Math.max(1, Math.min(2, dpr));
    const w = Math.max(240, Math.floor(cssWidth * safeDpr));
    const h = Math.max(240, Math.floor(cssHeight * safeDpr));

    if (this.phosphorCanvas.width === w && this.phosphorCanvas.height === h) {
      return;
    }

    this.width = w;
    this.height = h;
    this.dpr = safeDpr;
    this.phosphorCanvas.width = w;
    this.phosphorCanvas.height = h;
    this.graticuleCanvas.width = w;
    this.graticuleCanvas.height = h;

    this.clearPhosphor();
    this.drawGraticule();
  }

  setPalette(key) {
    if (PHOSPHOR_PALETTES[key] && key !== this.paletteKey) {
      this.paletteKey = key;
      this.clearPhosphor();
      this.drawGraticule();
    }
  }

  clearPhosphor() {
    const [r, g, b] = PHOSPHOR_PALETTES[this.paletteKey].bg;
    this.ctx.globalCompositeOperation = "source-over";
    this.ctx.globalAlpha = 1;
    this.ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    this.ctx.fillRect(0, 0, this.width, this.height);
  }

  drawGraticule() {
    const ctx = this.gratCtx;
    const w = this.width;
    const h = this.height;
    const pal = PHOSPHOR_PALETTES[this.paletteKey];

    ctx.clearRect(0, 0, w, h);

    const divsX = 10;
    const divsY = 8;
    const pad = Math.round(Math.min(w, h) * 0.04);
    const plotW = w - pad * 2;
    const plotH = h - pad * 2;
    const stepX = plotW / divsX;
    const stepY = plotH / divsY;
    const cx = pad + plotW * 0.5;
    const cy = pad + plotH * 0.5;

    ctx.lineWidth = Math.max(1, this.dpr * 0.85);
    ctx.strokeStyle = pal.grid;

    // Major division grid
    ctx.beginPath();
    for (let i = 0; i <= divsX; i++) {
      const x = Math.round(pad + i * stepX) + 0.5;
      ctx.moveTo(x, pad);
      ctx.lineTo(x, pad + plotH);
    }
    for (let j = 0; j <= divsY; j++) {
      const y = Math.round(pad + j * stepY) + 0.5;
      ctx.moveTo(pad, y);
      ctx.lineTo(pad + plotW, y);
    }
    ctx.stroke();

    // Center axes & fine 0.2-division calibration ticks
    ctx.strokeStyle = pal.axis;
    ctx.beginPath();
    ctx.moveTo(pad, cy);
    ctx.lineTo(pad + plotW, cy);
    ctx.moveTo(cx, pad);
    ctx.lineTo(cx, pad + plotH);

    const tickHalf = 4 * this.dpr;
    for (let i = 0; i <= divsX * 5; i++) {
      const x = pad + (i / 5) * stepX;
      ctx.moveTo(x, cy - tickHalf);
      ctx.lineTo(x, cy + tickHalf);
    }
    for (let j = 0; j <= divsY * 5; j++) {
      const y = pad + (j / 5) * stepY;
      ctx.moveTo(cx - tickHalf, y);
      ctx.lineTo(cx + tickHalf, y);
    }
    ctx.stroke();

    // Subtle CRT corner glass vignette
    const grad = ctx.createRadialGradient(cx, cy, Math.min(w, h) * 0.32, cx, cy, Math.max(w, h) * 0.72);
    grad.addColorStop(0, "rgba(0, 0, 0, 0)");
    grad.addColorStop(1, "rgba(0, 0, 0, 0.52)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  /**
   * Render one frame of stereo XY samples onto the phosphor canvas and return signal metrics.
   */
  renderFrame(leftSamples, rightSamples, options = {}) {
    const {
      persistence = 0.78,
      focus = 1.6,
      intensity = 1.0,
      zoom = 0.92,
    } = options;

    const pal = PHOSPHOR_PALETTES[this.paletteKey];
    const [bgR, bgG, bgB] = pal.bg;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;
    const cx = w * 0.5;
    const cy = h * 0.5;
    const scale = Math.min(w, h) * 0.44 * zoom;

    // Phosphor decay pass
    const fadeAlpha = Math.max(0.03, Math.min(0.95, 1 - persistence));
    ctx.globalCompositeOperation = "source-over";
    ctx.globalAlpha = 1;
    ctx.fillStyle = `rgba(${bgR}, ${bgG}, ${bgB}, ${fadeAlpha.toFixed(3)})`;
    ctx.fillRect(0, 0, w, h);

    const len = Math.min(leftSamples.length, rightSamples.length);
    if (len < 2) {
      return { rmsL: 0, rmsR: 0, peakL: 0, peakR: 0 };
    }

    // Measure telemetry and estimate characteristic segment speed for velocity brightness
    let sumSqL = 0;
    let sumSqR = 0;
    let peakL = 0;
    let peakR = 0;
    let totalStep = 0;

    for (let i = 0; i < len; i++) {
      const lx = leftSamples[i];
      const ry = rightSamples[i];
      sumSqL += lx * lx;
      sumSqR += ry * ry;
      if (Math.abs(lx) > peakL) peakL = Math.abs(lx);
      if (Math.abs(ry) > peakR) peakR = Math.abs(ry);
      if (i > 0) {
        totalStep += Math.hypot(lx - leftSamples[i - 1], ry - rightSamples[i - 1]);
      }
    }

    const avgStep = Math.max(totalStep / (len - 1), 0.002);

    // Bucket segments into 8 velocity-brightness bins for fast batched Canvas2D drawing
    const BINS = 8;
    const bins = Array.from({ length: BINS }, () => []);

    for (let i = 1; i < len; i++) {
      const x0 = leftSamples[i - 1];
      const y0 = rightSamples[i - 1];
      const x1 = leftSamples[i];
      const y1 = rightSamples[i];

      const dist = Math.hypot(x1 - x0, y1 - y0);
      const relVel = dist / avgStep;
      // Slower beam dwell -> higher brightness; rapid transit -> dim line
      const bright = Math.max(0.08, Math.min(1.0, 1.35 / (0.45 + relVel * 0.9)));
      const binIdx = Math.min(BINS - 1, Math.floor(bright * BINS));
      bins[binIdx].push(cx + x0 * scale, cy - y0 * scale, cx + x1 * scale, cy - y1 * scale);
    }

    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    // Pass 1: Soft phosphor bloom halo
    ctx.strokeStyle = pal.halo;
    ctx.lineWidth = focus * 3.4 * this.dpr;
    for (let b = 0; b < BINS; b++) {
      const segs = bins[b];
      if (segs.length === 0) continue;
      const weight = (b + 1) / BINS;
      ctx.globalAlpha = Math.min(0.45, weight * 0.24 * intensity);
      ctx.beginPath();
      for (let i = 0; i < segs.length; i += 4) {
        ctx.moveTo(segs[i], segs[i + 1]);
        ctx.lineTo(segs[i + 2], segs[i + 3]);
      }
      ctx.stroke();
    }

    // Pass 2: Crisp electron beam core
    ctx.strokeStyle = pal.core;
    ctx.lineWidth = focus * 1.15 * this.dpr;
    for (let b = 0; b < BINS; b++) {
      const segs = bins[b];
      if (segs.length === 0) continue;
      const weight = (b + 1) / BINS;
      ctx.globalAlpha = Math.min(0.98, (0.12 + weight * 0.85) * intensity);
      ctx.beginPath();
      for (let i = 0; i < segs.length; i += 4) {
        ctx.moveTo(segs[i], segs[i + 1]);
        ctx.lineTo(segs[i + 2], segs[i + 3]);
      }
      ctx.stroke();
    }
    ctx.restore();

    return {
      rmsL: Math.sqrt(sumSqL / len),
      rmsR: Math.sqrt(sumSqR / len),
      peakL,
      peakR,
    };
  }
}
