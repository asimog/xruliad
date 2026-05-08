export class BpmTracker {
  private beatTimes: number[] = [];

  reset(): void {
    this.beatTimes = [];
  }

  addBeat(nowMs: number): void {
    this.beatTimes.push(nowMs);
    if (this.beatTimes.length > 24) {
      this.beatTimes.shift();
    }
  }

  getBpm(): number {
    if (this.beatTimes.length < 2) return 0;

    let total = 0;
    let count = 0;
    for (let i = 1; i < this.beatTimes.length; i += 1) {
      const dt = this.beatTimes[i] - this.beatTimes[i - 1];
      if (dt > 0) {
        total += dt;
        count += 1;
      }
    }

    if (count === 0) return 0;
    const avgMs = total / count;
    return Math.round(60000 / avgMs);
  }
}
