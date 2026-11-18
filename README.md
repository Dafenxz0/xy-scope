# XY-SCOPE — Musical Vector Oscilloscope CRT

[![CI & Deploy Pages](https://github.com/Dafenxz0/xy-scope/actions/workflows/ci.yml/badge.svg)](https://github.com/Dafenxz0/xy-scope/actions/workflows/ci.yml)

**Live Demo:** [https://dafenxz0.github.io/xy-scope/](https://dafenxz0.github.io/xy-scope/)

An interactive browser-based **XY Musical Oscilloscope CRT** inspired by classic Tektronix analog vector scopes. Stereo Web Audio synthesis directly drives the X (Left channel) and Y (Right channel) beam deflections so **what you hear is literally what draws the image on the phosphor screen**.

## How XY Audio Works

On a real analog oscilloscope in **X-Y mode**, the horizontal timebase is replaced by a second voltage input:

- **Left Audio Channel (`L`) $\rightarrow$ Horizontal Deflection (`X`)**
- **Right Audio Channel (`R`) $\rightarrow$ Vertical Deflection (`Y`)**

When a continuous 2D closed vector path $(x(t), y(t))$ is sampled at audio rate (e.g. `44.1 kHz`) and played back in stereo, the electron beam traces the geometry across the phosphor screen at the fundamental pitch frequency $f_0$. Changing $f_0$ shifts the audible musical pitch without altering the geometry, while changing harmonic ratios like `3:2` produces an audible musical **perfect fifth** alongside a Lissajous figure.

Slower beam dwell points deposit more energy into the phosphor (brighter glow), while rapid beam transits between disconnected vector text strokes appear fainter—matching authentic analog CRT velocity modulation.

## Features

- **Real-Time Web Audio Stereo Synth & Dual Analyser Scope**
  - Clean user-gesture `AudioContext` startup with Play / Mute toggle and `DynamicsCompressorNode` + `tanh` soft-limiter safety protection.
  - Feeds dual `ChannelSplitterNode` $\rightarrow$ L/R `AnalyserNode` time-domain buffers directly into the CRT renderer.
- **Built-In Vector Generators**
  1. **3D Wireframe Cube & Pyramid:** Real Euler rotation matrices (`Rx · Ry · Rz`) and perspective projection traversed along edge-only closed walks.
  2. **3D Torus Knot:** Parametric $(p, q)$ 3D knot rotating in perspective space.
  3. **Lissajous Harmonics:** Configurable $f_x : f_y$ ratios (`1:1`, `2:1` Octave, `3:2` Fifth, `4:3` Fourth, `5:4` Maj3) and continuous phase drift.
  4. **Vector Text Generator:** Crisp multi-stroke polyline font for custom strings (`"RUST"`, `"XY"`, `"AI"`, `"SCOPE"`, etc.) with velocity-modulated inter-glyph transits.
  5. **Freehand Draw Pad:** Drag directly across the CRT screen to draw any loop and immediately hear and see it in stereo.
- **CRT Phosphor Persistence Display**
  - Selectable **P31 Green**, **P3 Amber**, and **P11 Cyan** phosphor palettes.
  - Adjustable phosphor persistence decay, beam focus, intensity, and calibrated `10×8` graticule overlay.
- **Stereo `.wav` Export**
  - Downloads a standard **44.1 kHz, 16-bit PCM, 2-channel RIFF `.wav`** clip of the active animated shape—ready to play into an external hardware oscilloscope or DAW.

## Controls

| Control | Function |
| --- | --- |
| **Play / Mute Audio** | Starts/suspends live Web Audio stereo synthesis and `AnalyserNode` readout |
| **Export Stereo .wav** | Renders and downloads a 2.5s 44.1 kHz 16-bit stereo `.wav` file |
| **Vector Generator** | Switch between `3D Cube`, `3D Pyramid`, `Torus Knot`, `Lissajous`, `Vector Text`, and `Freehand Pad` |
| **Fundamental Pitch** | Adjusts beam scan frequency (`40 Hz – 330 Hz`) |
| **Output Gain** | Adjusts stereo signal amplitude before the safety soft-limiter |
| **CRT Optics** | Choose phosphor color (`P31 Green`, `P3 Amber`, `P11 Cyan`), `Persistence`, `Beam Focus`, and `Intensity` |

## Architecture

- [`src/shapes.js`](src/shapes.js) — 3D rotation/projection, uniform arc-length resampling, Cube/Pyramid walks, Torus Knot, Lissajous, Vector Text, and Freehand path processing.
- [`src/synth.js`](src/synth.js) — `StereoOscilloscopeSynth` wavetable synthesizer, `tanh` soft-limiter, and RIFF 16-bit stereo `.wav` encoder.
- [`src/audio_engine.js`](src/audio_engine.js) — Web Audio `AudioContext`, safety compressor, `ChannelSplitterNode`, and dual L/R `AnalyserNode` management.
- [`src/scope_renderer.js`](src/scope_renderer.js) — Dual-layer CRT phosphor persistence renderer with velocity-modulated beam brightness and calibrated graticule.
- [`src/main.js`](src/main.js) — Instrument UI wiring, Freehand pointer pad, and 60 FPS render loop.

## Local Development & Tests

Requires Node.js 20+ (no external npm dependencies):

```bash
npm run check
npm test
```

Serve the static files locally (e.g. `npx serve .` or `python -m http.server`) and open in a modern browser.

## License

[MIT](LICENSE)
