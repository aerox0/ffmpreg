import { describe, it, expect } from 'vitest';
import { estimateOutputSize, estimateAudioSize, shouldWarnSize } from '../../src/lib/estimate.js';

describe('estimateOutputSize', () => {
  it('estimates compact preset without trim', () => {
    const source = { fileSize: 1_200_000_000, duration: 120 };
    const result = estimateOutputSize(source, 'compact', null);
    // 1_200_000_000 * 0.25 * 1 = 300_000_000
    expect(result).toBe(300_000_000);
  });

  it('estimates compact preset with trim to half duration', () => {
    const source = { fileSize: 1_200_000_000, duration: 120 };
    const trim = { start: 0, end: 60 };
    const result = estimateOutputSize(source, 'compact', trim);
    // 1_200_000_000 * 0.25 * (60 / 120) = 150_000_000
    expect(result).toBe(150_000_000);
  });

  it('estimates good preset without trim', () => {
    const source = { fileSize: 1_000_000_000, duration: 100 };
    const result = estimateOutputSize(source, 'good', null);
    // 1_000_000_000 * 0.40 = 400_000_000
    expect(result).toBe(400_000_000);
  });

  it('estimates high preset without trim', () => {
    const source = { fileSize: 500_000_000, duration: 60 };
    const result = estimateOutputSize(source, 'high', null);
    // 500_000_000 * 0.65 = 325_000_000
    expect(result).toBe(325_000_000);
  });

  it('estimates with trim spanning partial duration', () => {
    const source = { fileSize: 800_000_000, duration: 200 };
    const trim = { start: 50, end: 150 };
    const result = estimateOutputSize(source, 'compact', trim);
    // 800_000_000 * 0.25 * (100 / 200) = 100_000_000
    expect(result).toBe(100_000_000);
  });
});

describe('estimateAudioSize', () => {
  it('estimates audio size for 128kbps at 5030s', () => {
    const result = estimateAudioSize(5030, 128);
    // 128 * 1000 * 5030 / 8 = 80_480_000
    expect(result).toBe(80_480_000);
  });

  it('estimates audio size for 256kbps at 60s', () => {
    const result = estimateAudioSize(60, 256);
    // 256 * 1000 * 60 / 8 = 1_920_000
    expect(result).toBe(1_920_000);
  });
});

describe('shouldWarnSize', () => {
  it('returns true when estimated is larger than source', () => {
    expect(shouldWarnSize(100, 120)).toBe(true);
  });

  it('returns false when estimated is smaller than source', () => {
    expect(shouldWarnSize(100, 80)).toBe(false);
  });

  it('returns false when sizes are equal', () => {
    expect(shouldWarnSize(100, 100)).toBe(false);
  });
});
