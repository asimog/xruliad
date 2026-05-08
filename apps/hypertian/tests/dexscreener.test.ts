import { describe, expect, it } from 'vitest';
import { toSyntheticCandles } from '../src/lib/dexscreener';

describe('toSyntheticCandles', () => {
  it('builds a rolling OHLC series from price snapshots', () => {
    const candles = toSyntheticCandles([
      { priceUsd: 1, timestamp: 100, volume: 10 },
      { priceUsd: 1.5, timestamp: 200, volume: 20 },
      { priceUsd: 1.25, timestamp: 300, volume: 30 },
    ]);

    expect(candles).toEqual([
      { time: 100, open: 1, high: 1, low: 1, close: 1, volume: 10 },
      { time: 200, open: 1, high: 1.5, low: 1, close: 1.5, volume: 20 },
      { time: 300, open: 1.5, high: 1.5, low: 1.25, close: 1.25, volume: 30 },
    ]);
  });
});
