import { avg, rms } from "@/lib/music/audio/analyser";

export type AudioFeatures = {
  bass: number;
  mid: number;
  high: number;
  volume: number;
};

const ZERO_FEATURES: AudioFeatures = {
  bass: 0,
  mid: 0,
  high: 0,
  volume: 0,
};

export class AudioEngine {
  ctx: AudioContext | null = null;
  analyser: AnalyserNode | null = null;
  source: MediaElementAudioSourceNode | null = null;

  audio = new Audio();

  freqData = new Uint8Array(1024);
  timeData = new Uint8Array(1024);

  constructor() {
    this.audio.preload = "auto";
  }

  private ensureContext(): void {
    if (this.ctx && this.analyser) return;

    this.ctx = new AudioContext();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;

    this.freqData = new Uint8Array(this.analyser.frequencyBinCount);
    this.timeData = new Uint8Array(this.analyser.frequencyBinCount);

    if (!this.source) {
      this.source = this.ctx.createMediaElementSource(this.audio);
    }

    this.source.connect(this.analyser);
    this.analyser.connect(this.ctx.destination);
  }

  async resume(): Promise<void> {
    this.ensureContext();
    if (this.ctx?.state === "suspended") {
      await this.ctx.resume();
    }
  }

  async load(url: string): Promise<void> {
    this.ensureContext();
    this.audio.pause();

    // Avoid forcing CORS mode for local/blob media URLs.
    if (/^https?:\/\//i.test(url)) {
      this.audio.crossOrigin = "anonymous";
    } else {
      this.audio.removeAttribute("crossorigin");
    }

    this.audio.src = url;

    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        cleanup();
        reject(new Error("Audio load timed out."));
      }, 15_000);

      const onReady = () => {
        cleanup();
        resolve();
      };
      const onError = () => {
        cleanup();
        const mediaError = this.audio.error;
        const details = mediaError ? ` (code ${mediaError.code})` : "";
        reject(new Error(`Failed to load audio${details}.`));
      };
      const cleanup = () => {
        window.clearTimeout(timeout);
        this.audio.removeEventListener("loadeddata", onReady);
        this.audio.removeEventListener("canplay", onReady);
        this.audio.removeEventListener("error", onError);
      };

      this.audio.addEventListener("loadeddata", onReady);
      this.audio.addEventListener("canplay", onReady);
      this.audio.addEventListener("error", onError);
      this.audio.load();
    });
  }

  async play(): Promise<void> {
    await this.resume();
    await this.audio.play();
  }

  pause(): void {
    this.audio.pause();
  }

  update(): AudioFeatures {
    if (!this.analyser) return ZERO_FEATURES;

    this.analyser.getByteFrequencyData(this.freqData);
    this.analyser.getByteTimeDomainData(this.timeData);

    return this.extractFeatures();
  }

  extractFeatures(): AudioFeatures {
    const bass = avg(this.freqData, 0, 50);
    const mid = avg(this.freqData, 50, 150);
    const high = avg(this.freqData, 150, 300);
    const volume = rms(this.timeData);

    return { bass, mid, high, volume };
  }

  getState() {
    return {
      playing: !this.audio.paused,
      currentTime: this.audio.currentTime || 0,
      duration: Number.isFinite(this.audio.duration) ? this.audio.duration : 0,
    };
  }

  dispose(): void {
    this.pause();
    this.audio.removeAttribute("src");
    this.audio.load();
    this.source?.disconnect();
    this.analyser?.disconnect();
    if (this.ctx && this.ctx.state !== "closed") {
      void this.ctx.close();
    }
    // Clean up references to prevent reuse of a closed AudioContext
    this.ctx = null;
    this.analyser = null;
    this.source = null;
  }
}
