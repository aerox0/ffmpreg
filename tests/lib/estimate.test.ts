import { describe, it, expect } from 'vitest';
import {
  estimateOutputSize,
  estimateAudioSize,
  shouldWarnSize,
} from '../../src/lib/estimate';
import type { TrimRange } from '../../src/types/index';

describe('estimate', () => {
  describe('estimateOutputSize', () => {
    it('returns approximately 300MB for 1.2GB 5030s video at compact (0.25 ratio)', () => {
      const source = { fileSize: 1_200_000_000, duration: 5030 };
      const trim: TrimRange = { start: 0, end: 5030 };
      const result = estimateOutputSize(source, 'compact', trim);
      // 1.2GB * 0.25 = 300MB (decimal)
      expect(result).toBe(300_000_000);
    });

    it('returns approximately 150MB for same video trimmed to half', () => {
      const source = { fileSize: 1_200_000_000, duration: 5030 };
      const trim: TrimRange = { start: 0, end: 2515 };
      const result = estimateOutputSize(source, 'compact', trim);
      // 1.2GB * 0.25 * (2515/5030) ≈ 150MB
      expect(result).toBe(150_000_000);
    });

    it('uses good ratio (0.40) for good preset', () => {
      const source = { fileSize: 1_000_000_000, duration: 1000 };
      const trim: TrimRange = { start: 0, end: 1000 };
      const result = estimateOutputSize(source, 'good', trim);
      // 1GB * 0.40 = 400MB
      expect(result).toBe(400_000_000);
    });

    it('uses high ratio (0.65) for high preset', () => {
      const source = { fileSize: 1_000_000_000, duration: 1000 };
      const trim: TrimRange = { start: 0, end: 1000 };
      const result = estimateOutputSize(source, 'high', trim);
      // 1GB * 0.65 = 650MB
      expect(result).toBe(650_000_000);
    });

    it('handles null trim (no trimming)', () => {
      const source = { fileSize: 500_000_000, duration: 600 };
      const result = estimateOutputSize(source, 'good', null);
      expect(result).toBe(200_000_000);
    });
  });

  describe('estimateAudioSize', () => {
    it('returns approximately 80MB for 5030s audio at 128kbps', () => {
      const result = estimateAudioSize(5030, 128);
      // 128 kbps * 5030s / 8 = 80,480 bytes ≈ 80MB
      expect(result).toBe(80_480_000);
    });

    it('returns approximately 120MB for 5030s audio at 192kbps', () => {
      const result = estimateAudioSize(5030, 192);
      // 192 * 5030 / 8 = 120,720 bytes ≈ 120MB
      expect(result).toBe(120_720_000);
    });

    it('returns 0 for 0 duration', () => {
      const result = estimateAudioSize(0, 128);
      expect(result).toBe(0);
    });
  });

  describe('shouldWarnSize', () => {
    it('returns true when estimated > source (growing file)', () => {
      expect(shouldWarnSize(100, 120)).toBe(true);
    });

    it('returns false when estimated < source (shrinking file)', () => {
      expect(shouldWarnSize(100, 80)).toBe(false);
    });

    it('returns false when estimated === source', () => {
      expect(shouldWarnSize(100, 100)).toBe(false);
    });

    it('returns true for 1% growth', () => {
      expect(shouldWarnSize(10_000_000, 10_100_000)).toBe(true);
    });
  });
});
