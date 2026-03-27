import { describe, it, expect } from 'vitest';
import { resolveOutputPath, getOutputDir } from '../../src/lib/output-path';

describe('output-path', () => {
  describe('resolveOutputPath', () => {
    it('returns .mkv extension when converting test.mp4 to mkv', () => {
      const result = resolveOutputPath('/videos/test.mp4', 'mkv', []);
      expect(result).toBe('/videos/test.mkv');
    });

    it('returns original name when no conflict', () => {
      const result = resolveOutputPath('/videos/test.mp4', 'mkv', []);
      expect(result).toBe('/videos/test.mkv');
    });

    it('returns -1 suffix when conflict exists', () => {
      const result = resolveOutputPath('/videos/test.mp4', 'mkv', ['/videos/test.mkv']);
      expect(result).toBe('/videos/test-1.mkv');
    });

    it('increments suffix for multiple conflicts', () => {
      const existing = ['/videos/test.mkv', '/videos/test-1.mkv', '/videos/test-2.mkv'];
      const result = resolveOutputPath('/videos/test.mp4', 'mkv', existing);
      expect(result).toBe('/videos/test-3.mkv');
    });

    it('uses custom output dir when provided', () => {
      const result = resolveOutputPath('/videos/test.mp4', 'mkv', [], '/custom/output');
      expect(result).toBe('/custom/output/test.mkv');
    });

    it('handles filename with dots correctly', () => {
      const result = resolveOutputPath('/videos/my.video.file.mp4', 'mkv', []);
      expect(result).toBe('/videos/my.video.file.mkv');
    });
  });

  describe('getOutputDir', () => {
    it('returns source directory when customDir is null', () => {
      const result = getOutputDir('/videos/test.mp4', null);
      expect(result).toBe('/videos');
    });

    it('returns custom dir when set', () => {
      const result = getOutputDir('/videos/test.mp4', '/custom/output');
      expect(result).toBe('/custom/output');
    });

    it('returns custom dir even when source is root', () => {
      const result = getOutputDir('/test.mp4', '/custom/output');
      expect(result).toBe('/custom/output');
    });
  });
});
