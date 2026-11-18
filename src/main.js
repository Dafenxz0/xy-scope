import { generateShapePath, getFreehandPreset } from "./shapes.js";
import { StereoOscilloscopeSynth, renderStereoWavBuffer } from "./synth.js";
import { StereoAudioEngine } from "./audio_engine.js";
import { ScopeRenderer } from "./scope_renderer.js";

const SHAPE_LABELS = {
  cube: "3D Cube",
  pyramid: "3D Pyramid",
  "torus-knot": "Torus Knot",
  lissajous: "Lissajous",
  text: "Vector Text",
  freehand: "Freehand Pad",
};

const state = {
  shape: "cube",
  spinSpeed: 1.0,
  torusP: 2,
  torusQ: 3,
  fx: 3,
  fy: 2,
  phaseDrift: 0.6,
  text: "RUST",
  freehandPoints: getFreehandPreset("heart", 128),
  freqHz: 82.4,
  gain: 0.65,
  phosphor: "green",
  persistence: 0.78,
  focus: 1.6,
  intensity: 1.05,
};

function $(id) {
  return document.getElementById(id);
}

function showError(message) {
  const banner = $("error-banner");
  if (!banner) return;
  if (message) {
    banner.textContent = message;
    banner.hidden = false;
  } else {
    banner.hidden = true;
    banner.textContent = "";
  }
}

function init() {
  const phosphorCanvas = $("crt-phosphor");
  const graticuleCanvas = $("crt-graticule");
  const crtWrap = $("crt-wrap");

  let renderer;
  try {
    renderer = new ScopeRenderer(phosphorCanvas, graticuleCanvas);
  } catch (err) {
    showError(`Display initialization error: ${err instanceof Error ? err.message : String(err)}`);
    return;
  }

  const synth = new StereoOscilloscopeSynth(1024);
  const audio = new StereoAudioEngine(synth);
  synth.updatePath(generateShapePath(state, 0), false);

  const liveL = new Float32Array(2048);
  const liveR = new Float32Array(2048);

  const resizeScope = () => {
    const rect = crtWrap.getBoundingClientRect();
    renderer.resize(rect.width, rect.height, window.devicePixelRatio || 1);
  };
  resizeScope();
  window.addEventListener("resize", resizeScope);

  const syncControlVisibility = () => {
    const is3D = state.shape === "cube" || state.shape === "pyramid" || state.shape === "torus-knot";
    $("params-3d").hidden = !is3D;
    $("torus-controls").hidden = state.shape !== "torus-knot";
    $("params-lissajous").hidden = state.shape !== "lissajous";
    $("params-text").hidden = state.shape !== "text";
    $("params-freehand").hidden = state.shape !== "freehand";
    $("draw-hint").hidden = state.shape !== "freehand";
    crtWrap.classList.toggle("draw-active", state.shape === "freehand");
    $("telem-source").textContent = SHAPE_LABELS[state.shape] || state.shape;
  };

  const refreshShapeNow = (crossfade = true) => {
    synth.updatePath(generateShapePath(state, performance.now() * 0.001), crossfade);
  };

  // Shape selector buttons
  $("shape-buttons").addEventListener("click", (ev) => {
    const btn = ev.target.closest("button[data-shape]");
    if (!btn) return;
    state.shape = btn.dataset.shape;
    for (const el of $("shape-buttons").querySelectorAll("button")) {
      el.classList.toggle("active", el === btn);
    }
    syncControlVisibility();
    refreshShapeNow(true);
  });

  // 3D & Torus controls
  $("ctrl-spin").addEventListener("input", (ev) => {
    state.spinSpeed = Number(ev.target.value);
    $("val-spin").textContent = `${state.spinSpeed.toFixed(2)}x`;
  });
  $("ctrl-torus-p").addEventListener("input", (ev) => {
    state.torusP = Number(ev.target.value);
    $("val-torus-p").textContent = String(state.torusP);
    refreshShapeNow(false);
  });
  $("ctrl-torus-q").addEventListener("input", (ev) => {
    state.torusQ = Number(ev.target.value);
    $("val-torus-q").textContent = String(state.torusQ);
    refreshShapeNow(false);
  });

  // Lissajous controls
  const updateLissajousChips = () => {
    for (const chip of $("lissajous-presets").querySelectorAll(".chip")) {
      const match = Number(chip.dataset.fx) === state.fx && Number(chip.dataset.fy) === state.fy;
      chip.classList.toggle("active", match);
    }
  };
  $("lissajous-presets").addEventListener("click", (ev) => {
    const chip = ev.target.closest("button[data-fx]");
    if (!chip) return;
    state.fx = Number(chip.dataset.fx);
    state.fy = Number(chip.dataset.fy);
    $("ctrl-fx").value = String(state.fx);
    $("ctrl-fy").value = String(state.fy);
    $("val-fx").textContent = String(state.fx);
    $("val-fy").textContent = String(state.fy);
    updateLissajousChips();
    refreshShapeNow(true);
  });
  $("ctrl-fx").addEventListener("input", (ev) => {
    state.fx = Number(ev.target.value);
    $("val-fx").textContent = String(state.fx);
    updateLissajousChips();
    refreshShapeNow(false);
  });
  $("ctrl-fy").addEventListener("input", (ev) => {
    state.fy = Number(ev.target.value);
    $("val-fy").textContent = String(state.fy);
    updateLissajousChips();
    refreshShapeNow(false);
  });
  $("ctrl-drift").addEventListener("input", (ev) => {
    state.phaseDrift = Number(ev.target.value);
    $("val-drift").textContent = state.phaseDrift.toFixed(2);
  });

  // Vector text controls
  $("ctrl-text").addEventListener("input", (ev) => {
    state.text = ev.target.value || "XY";
    refreshShapeNow(true);
  });
  $("text-presets").addEventListener("click", (ev) => {
    const chip = ev.target.closest("button[data-text]");
    if (!chip) return;
    state.text = chip.dataset.text;
    $("ctrl-text").value = state.text;
    refreshShapeNow(true);
  });

  // Freehand draw pad pointer interaction directly on CRT
  let isDrawing = false;
  let draftStroke = [];

  const pointerToNormalized = (ev) => {
    const rect = crtWrap.getBoundingClientRect();
    const nx = ((ev.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1;
    const ny = 1 - ((ev.clientY - rect.top) / Math.max(1, rect.height)) * 2;
    const invScale = 1 / 0.88;
    return {
      x: Math.max(-0.95, Math.min(0.95, nx * invScale)),
      y: Math.max(-0.95, Math.min(0.95, ny * invScale)),
    };
  };

  crtWrap.addEventListener("pointerdown", (ev) => {
    if (state.shape !== "freehand") return;
    isDrawing = true;
    crtWrap.setPointerCapture(ev.pointerId);
    draftStroke = [pointerToNormalized(ev)];
  });

  crtWrap.addEventListener("pointermove", (ev) => {
    if (!isDrawing || state.shape !== "freehand") return;
    const pt = pointerToNormalized(ev);
    const prev = draftStroke[draftStroke.length - 1];
    if (!prev || Math.hypot(pt.x - prev.x, pt.y - prev.y) > 0.015) {
      draftStroke.push(pt);
      if (draftStroke.length >= 2) {
        state.freehandPoints = draftStroke.slice();
        refreshShapeNow(false);
      }
    }
  });

  const finishStroke = () => {
    if (!isDrawing) return;
    isDrawing = false;
    if (draftStroke.length >= 3) {
      state.freehandPoints = draftStroke.slice();
      refreshShapeNow(true);
    }
  };
  crtWrap.addEventListener("pointerup", finishStroke);
  crtWrap.addEventListener("pointercancel", finishStroke);

  $("btn-freehand-clear").addEventListener("click", () => {
    state.freehandPoints = [{ x: -0.05, y: 0 }, { x: 0.05, y: 0 }];
    renderer.clearPhosphor();
    refreshShapeNow(true);
  });
  $("btn-freehand-heart").addEventListener("click", () => {
    state.freehandPoints = getFreehandPreset("heart", 128);
    refreshShapeNow(true);
  });
  $("btn-freehand-star").addEventListener("click", () => {
    state.freehandPoints = getFreehandPreset("star", 128);
    refreshShapeNow(true);
  });

  // Audio controls
  $("ctrl-freq").addEventListener("input", (ev) => {
    state.freqHz = Number(ev.target.value);
    $("val-freq").textContent = `${state.freqHz.toFixed(1)} Hz`;
    $("telem-freq").textContent = `${state.freqHz.toFixed(1)} Hz`;
    audio.setParams({ freqHz: state.freqHz });
  });
  $("ctrl-gain").addEventListener("input", (ev) => {
    state.gain = Number(ev.target.value);
    $("val-gain").textContent = `${Math.round(state.gain * 100)}%`;
    audio.setParams({ gain: state.gain });
  });

  // CRT optics controls
  $("phosphor-buttons").addEventListener("click", (ev) => {
    const chip = ev.target.closest("button[data-phosphor]");
    if (!chip) return;
    state.phosphor = chip.dataset.phosphor;
    for (const el of $("phosphor-buttons").querySelectorAll(".chip")) {
      el.classList.toggle("active", el === chip);
    }
    renderer.setPalette(state.phosphor);
  });
  $("ctrl-persist").addEventListener("input", (ev) => {
    state.persistence = Number(ev.target.value);
    $("val-persist").textContent = state.persistence.toFixed(2);
  });
  $("ctrl-focus").addEventListener("input", (ev) => {
    state.focus = Number(ev.target.value);
    $("val-focus").textContent = `${state.focus.toFixed(1)} px`;
  });
  $("ctrl-intensity").addEventListener("input", (ev) => {
    state.intensity = Number(ev.target.value);
    $("val-intensity").textContent = state.intensity.toFixed(2);
  });

  // Play / Mute Web Audio button
  const btnAudio = $("btn-audio");
  const badge = $("signal-badge");
  btnAudio.addEventListener("click", async () => {
    showError("");
    if (audio.playing) {
      await audio.stop();
      btnAudio.textContent = "Play Audio";
      btnAudio.classList.remove("playing");
      badge.textContent = "PREVIEW (MUTED)";
      badge.className = "badge badge-preview";
      return;
    }

    audio.setParams({ freqHz: state.freqHz, gain: state.gain });
    const res = await audio.start();
    if (!res.ok) {
      showError(`Web Audio error: ${res.error}`);
      return;
    }
    btnAudio.textContent = "Mute Audio";
    btnAudio.classList.add("playing");
    badge.textContent = "LIVE WEB AUDIO ANALYSER";
    badge.className = "badge badge-live";
    $("telem-rate").textContent = `${(res.sampleRate / 1000).toFixed(1)} kHz`;
  });

  // Export Stereo .wav button
  $("btn-export-wav").addEventListener("click", () => {
    try {
      showError("");
      const wavBytes = renderStereoWavBuffer({
        shapeConfig: { ...state },
        durationSec: 2.5,
        sampleRate: 44100,
        freqHz: state.freqHz,
        gain: Math.max(0.45, state.gain),
        animated: true,
        startTimeSec: performance.now() * 0.001,
      });
      const blob = new Blob([wavBytes], { type: "audio/wav" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `xy-scope-${state.shape}.wav`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      showError(`WAV export failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  syncControlVisibility();

  // Main 60 FPS animation loop
  let lastHudTime = 0;
  const tick = (nowMs) => {
    const timeSec = nowMs * 0.001;
    const isAnimated =
      state.shape === "cube" ||
      state.shape === "pyramid" ||
      state.shape === "torus-knot" ||
      state.shape === "lissajous";

    if (isAnimated) {
      synth.updatePath(generateShapePath(state, timeSec), false);
    }

    let sampleL = liveL;
    let sampleR = liveR;
    const usingAnalyser = audio.readLiveBuffers(liveL, liveR);
    if (!usingAnalyser) {
      const preview = synth.samplePreview(1024, 44100, state.freqHz, Math.max(0.5, state.gain));
      sampleL = preview.left;
      sampleR = preview.right;
    }

    const stats = renderer.renderFrame(sampleL, sampleR, {
      persistence: state.persistence,
      focus: state.focus,
      intensity: state.intensity,
      zoom: 0.92,
    });

    if (nowMs - lastHudTime > 90) {
      $("telem-rms-l").textContent = stats.rmsL.toFixed(2);
      $("telem-rms-r").textContent = stats.rmsR.toFixed(2);
      lastHudTime = nowMs;
    }

    requestAnimationFrame(tick);
  };

  requestAnimationFrame(tick);
}

window.addEventListener("DOMContentLoaded", init);
