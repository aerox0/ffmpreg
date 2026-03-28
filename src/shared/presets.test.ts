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
} from './presets';

describe('presets', () => {
  describe('CRF ranges', () => {
    it('compact preset has CRF range 28-35', () => {
      const range = getCrfRange('compact');
      expect(range.min).toBe(28);
      expect(range.max).toBe(35);
      expect(range.default).toBe(31);
    });

    it('good preset has CRF range 22-28', () => {
      const range = getCrfRange('good');
      expect(range.min).toBe(22);
      expect(range.max).toBe(28);
      expect(range.default).toBe(25);
    });

    it('high preset has CRF range 18-23', () => {
      const range = getCrfRange('high');
      expect(range.min).toBe(18);
      expect(range.max).toBe(23);
      expect(range.default).toBe(20);
    });

    it('custom preset has CRF range 18-35', () => {
      const range = getCrfRange('custom');
      expect(range.min).toBe(18);
      expect(range.max).toBe(35);
      expect(range.default).toBe(25);
    });
  });

  describe('isQualityGuarded', () => {
    it('returns true for CRF within compact bounds', () => {
      expect(isQualityGuarded('compact', 28)).toBe(true);
      expect(isQualityGuarded('compact', 31)).toBe(true);
      expect(isQualityGuarded('compact', 35)).toBe(true);
    });

    it('returns false for CRF outside compact bounds', () => {
      expect(isQualityGuarded('compact', 27)).toBe(false);
      expect(isQualityGuarded('compact', 36)).toBe(false);
    });

    it('returns true for CRF within good bounds', () => {
      expect(isQualityGuarded('good', 22)).toBe(true);
      expect(isQualityGuarded('good', 25)).toBe(true);
      expect(isQualityGuarded('good', 28)).toBe(true);
    });

    it('returns false for CRF outside good bounds', () => {
      expect(isQualityGuarded('good', 21)).toBe(false);
      expect(isQualityGuarded('good', 29)).toBe(false);
    });

    it('returns true for CRF within high bounds', () => {
      expect(isQualityGuarded('high', 18)).toBe(true);
      expect(isQualityGuarded('high', 20)).toBe(true);
      expect(isQualityGuarded('high', 23)).toBe(true);
    });

    it('returns false for CRF outside high bounds', () => {
      expect(isQualityGuarded('high', 17)).toBe(false);
      expect(isQualityGuarded('high', 24)).toBe(false);
    });

    it('returns true for CRF within custom bounds', () => {
      expect(isQualityGuarded('custom', 18)).toBe(true);
      expect(isQualityGuarded('custom', 25)).toBe(true);
      expect(isQualityGuarded('custom', 35)).toBe(true);
    });

    it('returns false for CRF outside custom bounds', () => {
      expect(isQualityGuarded('custom', 17)).toBe(false);
      expect(isQualityGuarded('custom', 36)).toBe(false);
    });
  });

  describe('getDefaultQuality', () => {
    it('returns correct defaults for compact', () => {
      const quality = getDefaultQuality('compact');
      expect(quality.preset).toBe('compact');
      expect(quality.crf).toBe(31);
      expect(quality.audioBitrate).toBe(128);
    });

    it('returns correct defaults for good', () => {
      const quality = getDefaultQuality('good');
      expect(quality.preset).toBe('good');
      expect(quality.crf).toBe(25);
      expect(quality.audioBitrate).toBe(192);
    });

    it('returns correct defaults for high', () => {
      const quality = getDefaultQuality('high');
      expect(quality.preset).toBe('high');
      expect(quality.crf).toBe(20);
      expect(quality.audioBitrate).toBe(256);
    });

    it('returns correct defaults for custom', () => {
      const quality = getDefaultQuality('custom');
      expect(quality.preset).toBe('custom');
      expect(quality.crf).toBe(25);
      expect(quality.audioBitrate).toBe(192);
    });
  });

  describe('getAvailableFormats', () => {
    it('returns video formats for video input', () => {
      const formats = getAvailableFormats('video');
      expect(formats).toContain('mp4');
      expect(formats).toContain('mov');
      expect(formats).toContain('mkv');
      expect(formats).toContain('webm');
      expect(formats).toContain('avi');
      expect(formats).toContain('gif');
      expect(formats).toContain('mp3');
      expect(formats).toContain('aac');
      expect(formats).toContain('wav');
      expect(formats).toContain('flac');
      expect(formats).toContain('ogg');
      expect(formats.length).toBe(11);
    });

    it('returns audio-only formats for audio input', () => {
      const formats = getAvailableFormats('audio');
      expect(formats).toContain('mp3');
      expect(formats).toContain('aac');
      expect(formats).toContain('wav');
      expect(formats).toContain('flac');
      expect(formats).toContain('ogg');
      expect(formats).not.toContain('mp4');
      expect(formats).not.toContain('gif');
      expect(formats.length).toBe(5);
    });

    it('returns image formats for image input', () => {
      const formats = getAvailableFormats('image');
      expect(formats).toContain('png');
      expect(formats).toContain('jpeg');
      expect(formats).toContain('webp');
      expect(formats.length).toBe(3);
    });
  });

  describe('audio bitrate ranges', () => {
    it('compact uses 128kbps audio', () => {
      const range = getAudioBitrateRange('compact');
      expect(range.min).toBe(128);
      expect(range.max).toBe(128);
      expect(range.default).toBe(128);
    });

    it('good uses 192kbps audio', () => {
      const range = getAudioBitrateRange('good');
      expect(range.min).toBe(192);
      expect(range.max).toBe(192);
      expect(range.default).toBe(192);
    });

    it('high uses 256kbps audio', () => {
      const range = getAudioBitrateRange('high');
      expect(range.min).toBe(256);
      expect(range.max).toBe(256);
      expect(range.default).toBe(256);
    });

    it('custom allows 128-320kbps audio', () => {
      const range = getAudioBitrateRange('custom');
      expect(range.min).toBe(128);
      expect(range.max).toBe(320);
      expect(range.default).toBe(192);
    });
  });

  describe('GIF presets', () => {
    it('compact has fps=10 and paletteSize=128', () => {
      const preset = getGifPreset('compact');
      expect(preset.fps).toBe(10);
      expect(preset.paletteSize).toBe(128);
    });

    it('good has fps=15 and paletteSize=256', () => {
      const preset = getGifPreset('good');
      expect(preset.fps).toBe(15);
      expect(preset.paletteSize).toBe(256);
    });

    it('high has fps=24 and paletteSize=256', () => {
      const preset = getGifPreset('high');
      expect(preset.fps).toBe(24);
      expect(preset.paletteSize).toBe(256);
    });
  });

  describe('compression ratios', () => {
    it('compact has ratio 0.25', () => {
      expect(getCompressionRatio('compact')).toBe(0.25);
    });

    it('good has ratio 0.40', () => {
      expect(getCompressionRatio('good')).toBe(0.40);
    });

    it('high has ratio 0.65', () => {
      expect(getCompressionRatio('high')).toBe(0.65);
    });

    it('custom defaults to 0.40', () => {
      expect(getCompressionRatio('custom')).toBe(0.40);
    });
  });

  describe('image quality ranges', () => {
    it('jpeg compact has range 60-70', () => {
      const range = getImageQualityRange('jpeg', 'compact');
      expect(range.min).toBe(60);
      expect(range.max).toBe(70);
      expect(range.default).toBe(65);
    });

    it('jpeg good has range 75-85', () => {
      const range = getImageQualityRange('jpeg', 'good');
      expect(range.min).toBe(75);
      expect(range.max).toBe(85);
      expect(range.default).toBe(80);
    });

    it('jpeg high has range 90-95', () => {
      const range = getImageQualityRange('jpeg', 'high');
      expect(range.min).toBe(90);
      expect(range.max).toBe(95);
      expect(range.default).toBe(92);
    });

    it('webp has same ranges as jpeg', () => {
      const jpegRange = getImageQualityRange('jpeg', 'good');
      const webpRange = getImageQualityRange('webp', 'good');
      expect(webpRange).toEqual(jpegRange);
    });

    it('png is lossless with 0 range', () => {
      const range = getImageQualityRange('png', 'good');
      expect(range.min).toBe(0);
      expect(range.max).toBe(0);
      expect(range.default).toBe(0);
    });
  });
});
