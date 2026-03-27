import { describe, it, expect } from 'vitest';
import {
  getCrfRange,
  getAudioBitrateRange,
  getGifPreset,
  getImageQualityRange,
  getCompressionRatio,
  getDefaultQuality,
  isQualityGuarded,
  getAvailableFormats,
} from '../../src/lib/presets';

describe('presets', () => {
  describe('getCrfRange', () => {
    it('returns { min: 28, max: 35 } for compact', () => {
      expect(getCrfRange('compact')).toEqual({ min: 28, max: 35 });
    });

    it('returns { min: 22, max: 28 } for good', () => {
      expect(getCrfRange('good')).toEqual({ min: 22, max: 28 });
    });

    it('returns { min: 18, max: 23 } for high', () => {
      expect(getCrfRange('high')).toEqual({ min: 18, max: 23 });
    });

    it('returns { min: 18, max: 35 } for custom', () => {
      expect(getCrfRange('custom')).toEqual({ min: 18, max: 35 });
    });
  });

  describe('getAudioBitrateRange', () => {
    it('returns { min: 128, max: 128 } for compact (fixed 128k)', () => {
      expect(getAudioBitrateRange('compact')).toEqual({ min: 128, max: 128 });
    });

    it('returns { min: 192, max: 192 } for good (fixed 192k)', () => {
      expect(getAudioBitrateRange('good')).toEqual({ min: 192, max: 192 });
    });

    it('returns { min: 256, max: 256 } for high (fixed 256k)', () => {
      expect(getAudioBitrateRange('high')).toEqual({ min: 256, max: 256 });
    });

    it('returns { min: 128, max: 320 } for custom', () => {
      expect(getAudioBitrateRange('custom')).toEqual({ min: 128, max: 320 });
    });
  });

  describe('getGifPreset', () => {
    it('returns { fps: 10, paletteSize: 128 } for compact', () => {
      expect(getGifPreset('compact')).toEqual({ fps: 10, paletteSize: 128 });
    });

    it('returns { fps: 15, paletteSize: 256 } for good', () => {
      expect(getGifPreset('good')).toEqual({ fps: 15, paletteSize: 256 });
    });

    it('returns { fps: 24, paletteSize: 256 } for high', () => {
      expect(getGifPreset('high')).toEqual({ fps: 24, paletteSize: 256 });
    });
  });

  describe('getImageQualityRange', () => {
    it('returns { min: 60, max: 70 } for jpeg compact', () => {
      expect(getImageQualityRange('jpeg', 'compact')).toEqual({ min: 60, max: 70 });
    });

    it('returns { min: 75, max: 85 } for jpeg good', () => {
      expect(getImageQualityRange('jpeg', 'good')).toEqual({ min: 75, max: 85 });
    });

    it('returns { min: 90, max: 95 } for jpeg high', () => {
      expect(getImageQualityRange('jpeg', 'high')).toEqual({ min: 90, max: 95 });
    });

    it('returns null for png (lossless)', () => {
      expect(getImageQualityRange('png', 'good')).toBeNull();
    });

    it('returns { min: 90, max: 95 } for webp high', () => {
      expect(getImageQualityRange('webp', 'high')).toEqual({ min: 90, max: 95 });
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
  });

  describe('getDefaultQuality', () => {
    it('returns mid-range CRF and 192k for good', () => {
      const q = getDefaultQuality('good');
      expect(q.preset).toBe('good');
      expect(q.crf).toBe(25); // mid of 22-28
      expect(q.audioBitrate).toBe(192);
    });

    it('returns mid-range CRF and 128k for compact', () => {
      const q = getDefaultQuality('compact');
      expect(q.preset).toBe('compact');
      expect(q.crf).toBe(31); // mid of 28-35
      expect(q.audioBitrate).toBe(128);
    });
  });

  describe('isQualityGuarded', () => {
    it('returns true for compact crf 31 (within range)', () => {
      expect(isQualityGuarded('compact', 31)).toBe(true);
    });

    it('returns true for compact crf 35 (at max)', () => {
      expect(isQualityGuarded('compact', 35)).toBe(true);
    });

    it('returns false for compact crf 18 (below min)', () => {
      expect(isQualityGuarded('compact', 18)).toBe(false);
    });

    it('returns false for compact crf 36 (above max)', () => {
      expect(isQualityGuarded('compact', 36)).toBe(false);
    });

    it('returns true for high crf 20 (within range)', () => {
      expect(isQualityGuarded('high', 20)).toBe(true);
    });

    it('returns false for high crf 24 (above max)', () => {
      expect(isQualityGuarded('high', 24)).toBe(false);
    });
  });

  describe('getAvailableFormats', () => {
    it('returns video containers + extract option for video input', () => {
      const formats = getAvailableFormats('video');
      expect(formats).toContain('mp4');
      expect(formats).toContain('mkv');
      expect(formats).toContain('webm');
      expect(formats).toContain('gif');
      expect(formats).toContain('mp3');
      expect(formats).toContain('aac');
      expect(formats).toContain('wav');
    });

    it('returns audio formats only for audio input', () => {
      const formats = getAvailableFormats('audio');
      expect(formats).toContain('mp3');
      expect(formats).toContain('aac');
      expect(formats).toContain('wav');
      expect(formats).toContain('flac');
      expect(formats).not.toContain('mp4');
      expect(formats).not.toContain('mkv');
    });

    it('returns image formats only for image input', () => {
      const formats = getAvailableFormats('image');
      expect(formats).toEqual(['png', 'jpeg', 'webp']);
    });
  });
});
