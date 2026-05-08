export class BeatDetector {
  private lastBeatMs = 0;
  private readonly minIntervalMs = 180;
  private readonly historySize = 48;
  private fluxHistory: number[] = [];
  private previousSpectrum: Float32Array | null = null;
  private previousFlux = 0;

  reset(): void {
    this.lastBeatMs = 0;
    this.fluxHistory = [];
    this.previousSpectrum = null;
    this.previousFlux = 0;
  }

  detect(bass: number, spectrum?: Uint8Array): boolean {
    const now = performance.now();

    if (!spectrum || spectrum.length === 0) {
      if (bass > 0.6 && now - this.lastBeatMs > this.minIntervalMs) {
        this.lastBeatMs = now;
        return true;
      }
      return false;
    }

    if (!this.previousSpectrum || this.previousSpectrum.length !== spectrum.length) {
      this.previousSpectrum = new Float32Array(spectrum.length);
      for (let i = 0; i < spectrum.length; i += 1) {
        this.previousSpectrum[i] = spectrum[i] / 255;
      }
      return false;
    }

    let flux = 0;
    let weightTotal = 0;
    const maxBin = Math.min(spectrum.length, 220);

    for (let i = 2; i < maxBin; i += 1) {
      const current = spectrum[i] / 255;
      const prev = this.previousSpectrum[i];
      const diff = Math.max(0, current - prev);
      const emphasis = i < 64 ? 1.6 : i < 140 ? 1.2 : 0.75;

      flux += diff * emphasis;
      weightTotal += emphasis;
      this.previousSpectrum[i] = current;
    }

    flux = weightTotal > 0 ? flux / weightTotal : 0;

    let mean = 0;
    for (let i = 0; i < this.fluxHistory.length; i += 1) {
      mean += this.fluxHistory[i];
    }
    mean = this.fluxHistory.length > 0 ? mean / this.fluxHistory.length : 0;

    let variance = 0;
    for (let i = 0; i < this.fluxHistory.length; i += 1) {
      const d = this.fluxHistory[i] - mean;
      variance += d * d;
    }
    variance = this.fluxHistory.length > 0 ? variance / this.fluxHistory.length : 0;
    const stdDev = Math.sqrt(variance);

    const threshold = mean + stdDev * 1.35 + 0.003;
    const minFluxFloor = Math.max(0.01, mean * 0.55);
    const rising = flux > this.previousFlux * 1.08;
    const cooldownPassed = now - this.lastBeatMs > this.minIntervalMs;
    const lowBandGuard = bass > 0.07;

    const isBeat =
      flux > threshold &&
      flux > minFluxFloor &&
      rising &&
      cooldownPassed &&
      lowBandGuard;

    this.fluxHistory.push(flux);
    if (this.fluxHistory.length > this.historySize) {
      this.fluxHistory.shift();
    }
    this.previousFlux = flux;

    if (isBeat) {
      this.lastBeatMs = now;
    }

    return isBeat;
  }
}
