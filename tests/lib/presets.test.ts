import { describe, it, expect } from 'vitest';
import {
  getCrfRange,
  getAudioBitrate,
  getAudioBitrateRange,
  getGifPreset,
  getImageQualityRange,
  getCompressionRatio,
  getDefaultQuality,
  isQualityGuarded,
  getAvailableFormats,
} from '../../src/lib/presets.js';

describe('getCrfRange', () => {
  it('returns correct range for compact', () => {
    expect(getCrfRange('compact')).toEqual({ min: 28, max: 35 });
  });

  it('returns correct range for good', () => {
    expect(getCrfRange('good')).toEqual({ min: 22, max: 28 });
  });

  it('returns correct range for high', () => {
    expect(getCrfRange('high')).toEqual({ min: 18, max: 23 });
  });

  it('returns correct range for custom', () => {
    expect(getCrfRange('custom')).toEqual({ min: 18, max: 35 });
  });
});

describe('getAudioBitrate', () => {
  it('returns 128 for compact', () => {
    expect(getAudioBitrate('compact')).toBe(128);
  });

  it('returns 192 for good', () => {
    expect(getAudioBitrate('good')).toBe(192);
  });

  it('returns 256 for high', () => {
    expect(getAudioBitrate('high')).toBe(256);
  });

  it('returns 192 for custom', () => {
    expect(getAudioBitrate('custom')).toBe(192);
  });
});

describe('getAudioBitrateRange', () => {
  it('returns fixed range for compact', () => {
    expect(getAudioBitrateRange('compact')).toEqual({ min: 128, max: 128 });
  });

  it('returns fixed range for good', () => {
    expect(getAudioBitrateRange('good')).toEqual({ min: 192, max: 192 });
  });

  it('returns fixed range for high', () => {
    expect(getAudioBitrateRange('high')).toEqual({ min: 256, max: 256 });
  });

  it('returns full range for custom', () => {
    expect(getAudioBitrateRange('custom')).toEqual({ min: 128, max: 320 });
  });
});

describe('getGifPreset', () => {
  it('returns correct preset for compact', () => {
    expect(getGifPreset('compact')).toEqual({ fps: 10, paletteSize: 128 });
  });

  it('returns correct preset for good', () => {
    expect(getGifPreset('good')).toEqual({ fps: 15, paletteSize: 256 });
  });

  it('returns correct preset for high', () => {
    expect(getGifPreset('high')).toEqual({ fps: 24, paletteSize: 256 });
  });

  it('returns default preset for custom', () => {
    expect(getGifPreset('custom')).toEqual({ fps: 15, paletteSize: 256 });
  });
});

describe('getImageQualityRange', () => {
  describe('jpeg', () => {
    it('returns compact range', () => {
      expect(getImageQualityRange('jpeg', 'compact')).toEqual({ min: 60, max: 70 });
    });

    it('returns good range', () => {
      expect(getImageQualityRange('jpeg', 'good')).toEqual({ min: 75, max: 85 });
    });

    it('returns high range', () => {
      expect(getImageQualityRange('jpeg', 'high')).toEqual({ min: 90, max: 95 });
    });

    it('returns custom range', () => {
      expect(getImageQualityRange('jpeg', 'custom')).toEqual({ min: 60, max: 95 });
    });
  });

  describe('webp', () => {
    it('returns compact range', () => {
      expect(getImageQualityRange('webp', 'compact')).toEqual({ min: 60, max: 70 });
    });

    it('returns good range', () => {
      expect(getImageQualityRange('webp', 'good')).toEqual({ min: 75, max: 85 });
    });

    it('returns high range', () => {
      expect(getImageQualityRange('webp', 'high')).toEqual({ min: 90, max: 95 });
    });

    it('returns custom range', () => {
      expect(getImageQualityRange('webp', 'custom')).toEqual({ min: 60, max: 95 });
    });
  });

  describe('png', () => {
    it('returns null (lossless, no quality slider)', () => {
      expect(getImageQualityRange('png', 'good')).toBeNull();
    });
  });

  it('returns null for unknown format', () => {
    expect(getImageQualityRange('bmp', 'good')).toBeNull();
  });
});

describe('getCompressionRatio', () => {
  it('returns 0.25 for compact', () => {
    expect(getCompressionRatio('compact')).toBe(0.25);
  });

  it('returns 0.40 for good', () => {
    expect(getCompressionRatio('good')).toBe(0.40);
  });

  it('returns 0.65 for high', () => {
    expect(getCompressionRatio('high')).toBe(0.65);
  });

  it('returns 0.40 for custom', () => {
    expect(getCompressionRatio('custom')).toBe(0.40);
  });
});

describe('getDefaultQuality', () => {
  it('returns midpoint CRF for compact', () => {
    const q = getDefaultQuality('compact');
    expect(q.preset).toBe('compact');
    expect(q.crf).toBe(32); // midpoint of 28-35
    expect(q.audioBitrate).toBe(128);
  });

  it('returns midpoint CRF for good', () => {
    const q = getDefaultQuality('good');
    expect(q.preset).toBe('good');
    expect(q.crf).toBe(25); // midpoint of 22-28
    expect(q.audioBitrate).toBe(192);
  });

  it('returns midpoint CRF for high', () => {
    const q = getDefaultQuality('high');
    expect(q.preset).toBe('high');
    expect(q.crf).toBe(21); // midpoint of 18-23 (20.5 rounded to 21)
    expect(q.audioBitrate).toBe(256);
  });

  it('returns midpoint CRF for custom', () => {
    const q = getDefaultQuality('custom');
    expect(q.preset).toBe('custom');
    expect(q.crf).toBe(27); // midpoint of 18-35 (26.5 rounded to 27)
    expect(q.audioBitrate).toBe(192);
  });
});

describe('isQualityGuarded', () => {
  describe('compact (range 28-35)', () => {
    it('returns true when CRF is below range', () => {
      expect(isQualityGuarded('compact', 20)).toBe(true);
    });

    it('returns true when CRF is above range', () => {
      expect(isQualityGuarded('compact', 40)).toBe(true);
    });

    it('returns false when CRF is at min boundary', () => {
      expect(isQualityGuarded('compact', 28)).toBe(false);
    });

    it('returns false when CRF is at max boundary', () => {
      expect(isQualityGuarded('compact', 35)).toBe(false);
    });

    it('returns false when CRF is within range', () => {
      expect(isQualityGuarded('compact', 30)).toBe(false);
    });
  });

  describe('custom', () => {
    it('always returns false (unguarded)', () => {
      expect(isQualityGuarded('custom', 1)).toBe(false);
      expect(isQualityGuarded('custom', 50)).toBe(false);
    });
  });
});

describe('getAvailableFormats', () => {
  it('returns video formats', () => {
    expect(getAvailableFormats('video')).toEqual(['mp4', 'mov', 'mkv', 'webm', 'avi', 'gif']);
  });

  it('returns audio formats', () => {
    expect(getAvailableFormats('audio')).toEqual(['mp3', 'aac', 'wav', 'flac', 'ogg']);
  });

  it('returns image formats', () => {
    expect(getAvailableFormats('image')).toEqual(['png', 'jpeg', 'webp']);
  });
});
