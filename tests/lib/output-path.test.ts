import { describe, it, expect } from 'vitest';
import { resolveOutputPath, getOutputDir } from '../../src/lib/output-path.js';

describe('resolveOutputPath', () => {
  it('resolves with no conflict', () => {
    const result = resolveOutputPath('/videos/test.mp4', 'mkv', []);
    expect(result).toBe('/videos/test.mkv');
  });

  it('appends -1 when path conflicts', () => {
    const result = resolveOutputPath('/videos/test.mp4', 'mkv', ['/videos/test.mkv']);
    expect(result).toBe('/videos/test-1.mkv');
  });

  it('skips conflicting names to find next free slot', () => {
    const existing = ['/videos/test.mkv', '/videos/test-1.mkv', '/videos/test-2.mkv'];
    const result = resolveOutputPath('/videos/test.mp4', 'mkv', existing);
    expect(result).toBe('/videos/test-3.mkv');
  });

  it('uses custom output directory', () => {
    const result = resolveOutputPath('/videos/test.mp4', 'mkv', [], '/output');
    expect(result).toBe('/output/test.mkv');
  });

  it('finds free slot with custom output directory', () => {
    const result = resolveOutputPath('/videos/test.mp4', 'mkv', ['/output/test.mkv'], '/output');
    expect(result).toBe('/output/test-1.mkv');
  });
});

describe('getOutputDir', () => {
  it('returns customDir when provided', () => {
    expect(getOutputDir('/videos/test.mp4', '/custom/output')).toBe('/custom/output');
  });

  it('returns source directory when customDir is null', () => {
    expect(getOutputDir('/videos/test.mp4', null)).toBe('/videos');
  });

  it('returns source directory when customDir is null for nested path', () => {
    expect(getOutputDir('/home/user/media/video.mp4', null)).toBe('/home/user/media');
  });
});
