/**
 * Web Audio stereo engine driving real-time L/R AnalyserNode buffers and safety-limited playback.
 */
export class StereoAudioEngine {
  constructor(synth) {
    this.synth = synth;
    this.ctx = null;
    this.node = null;
    this.masterGain = null;
    this.compressor = null;
    this.splitter = null;
    this.analyserL = null;
    this.analyserR = null;
    this.playing = false;
    this.freqHz = 82.41;
    this.gain = 0.65;
    this.sampleRate = 44100;
  }

  isSupported() {
    return typeof window !== "undefined" && Boolean(window.AudioContext || window.webkitAudioContext);
  }

  async start() {
    if (!this.isSupported()) {
      return { ok: false, error: "Web Audio API is not supported in this browser." };
    }

    try {
      if (!this.ctx) {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        this.ctx = new AudioCtx();
        this.sampleRate = this.ctx.sampleRate || 44100;

        this.node = this.ctx.createScriptProcessor(1024, 0, 2);
        this.node.onaudioprocess = (event) => {
          const outL = event.outputBuffer.getChannelData(0);
          const outR = event.outputBuffer.getChannelData(1);
          if (!this.playing) {
            outL.fill(0);
            outR.fill(0);
            return;
          }
          this.synth.synthesizeBlock(outL, outR, this.sampleRate, this.freqHz, this.gain);
        };

        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 0.85;

        this.compressor = this.ctx.createDynamicsCompressor();
        this.compressor.threshold.value = -6;
        this.compressor.knee.value = 6;
        this.compressor.ratio.value = 12;
        this.compressor.attack.value = 0.002;
        this.compressor.release.value = 0.08;

        this.splitter = this.ctx.createChannelSplitter(2);
        this.analyserL = this.ctx.createAnalyser();
        this.analyserR = this.ctx.createAnalyser();
        this.analyserL.fftSize = 2048;
        this.analyserR.fftSize = 2048;

        this.node.connect(this.masterGain);
        this.masterGain.connect(this.splitter);
        this.splitter.connect(this.analyserL, 0);
        this.splitter.connect(this.analyserR, 1);

        this.masterGain.connect(this.compressor);
        this.compressor.connect(this.ctx.destination);
      }

      if (this.ctx.state === "suspended") {
        await this.ctx.resume();
      }
      this.playing = true;
      return { ok: true, sampleRate: this.sampleRate };
    } catch (err) {
      this.playing = false;
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  }

  async stop() {
    this.playing = false;
    if (this.ctx && this.ctx.state === "running") {
      try {
        await this.ctx.suspend();
      } catch {
        // Ignore suspend errors during teardown
      }
    }
  }

  setParams({ freqHz, gain }) {
    if (Number.isFinite(freqHz)) this.freqHz = freqHz;
    if (Number.isFinite(gain)) this.gain = gain;
  }

  /**
   * Populate left/right Float32Arrays from live Web Audio AnalyserNodes when playing.
   * Returns true if live analyser buffers were read.
   */
  readLiveBuffers(leftOut, rightOut) {
    if (!this.playing || !this.analyserL || !this.analyserR) {
      return false;
    }
    this.analyserL.getFloatTimeDomainData(leftOut);
    this.analyserR.getFloatTimeDomainData(rightOut);
    return true;
  }
}
