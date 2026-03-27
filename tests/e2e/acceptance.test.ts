import { describe, it, expect } from 'vitest';
import { isQualityGuarded, getCrfRange, getAvailableFormats } from '../../src/lib/presets';
import { shouldWarnSize, estimateOutputSize } from '../../src/lib/estimate';
import { resolveOutputPath } from '../../src/lib/output-path';
import { buildFfmpegArgs } from '../../src/lib/ffmpeg-args';
import type { QueueItem } from '../../src/types/index';

// ─── Quality Guardrails ───────────────────────────────────────────────────────

describe('Quality guardrails', () => {
  it('Compact preset CRF range is 28-35', () => {
    const range = getCrfRange('compact');
    expect(range.min).toBe(28);
    expect(range.max).toBe(35);
  });

  it('High preset CRF range is 18-23', () => {
    const range = getCrfRange('high');
    expect(range.min).toBe(18);
    expect(range.max).toBe(23);
  });

  it('isQualityGuarded returns true for CRF within preset range', () => {
    expect(isQualityGuarded('compact', 30)).toBe(true);
    expect(isQualityGuarded('compact', 28)).toBe(true);
    expect(isQualityGuarded('compact', 35)).toBe(true);
  });

  it('isQualityGuarded returns false for CRF below preset minimum', () => {
    expect(isQualityGuarded('compact', 18)).toBe(false);
    expect(isQualityGuarded('high', 10)).toBe(false);
  });
});

// ─── Size Estimation Warning ──────────────────────────────────────────────────

describe('Size estimation warning', () => {
  it('fires when estimated size > source size', () => {
    expect(shouldWarnSize(100, 120)).toBe(true);
    expect(shouldWarnSize(100, 101)).toBe(true);
  });

  it('suppressed when estimated size <= source size', () => {
    expect(shouldWarnSize(100, 100)).toBe(false);
    expect(shouldWarnSize(100, 80)).toBe(false);
  });
});

describe('Size estimation', () => {
  it('video estimate with compact preset applies 0.25 ratio', () => {
    const source = {
      fileSize: 1_200_000_000,
      duration: 5030,
      inputType: 'video' as const,
      width: 1920,
      height: 1080,
      videoCodec: 'h264',
      audioCodec: 'aac',
    };
    const result = estimateOutputSize(source, 'compact', null);
    // 1.2GB * 0.25 = 300MB (approx)
    expect(result).toBeGreaterThan(250_000_000);
    expect(result).toBeLessThan(350_000_000);
  });

  it('video estimate with trim applies duration ratio', () => {
    const source = {
      fileSize: 1_200_000_000,
      duration: 5030,
      inputType: 'video' as const,
      width: 1920,
      height: 1080,
      videoCodec: 'h264',
      audioCodec: 'aac',
    };
    const trim = { start: 0, end: 2515 };
    const result = estimateOutputSize(source, 'compact', trim);
    // 1.2GB * 0.25 * (2515/5030) ≈ 150MB
    expect(result).toBeGreaterThan(120_000_000);
    expect(result).toBeLessThan(180_000_000);
  });
});

// ─── Output Path Conflicts ───────────────────────────────────────────────────

describe('Output path conflicts', () => {
  it('no conflict returns clean path', () => {
    const result = resolveOutputPath('/videos/test.mp4', 'mkv', []);
    expect(result).toBe('/videos/test.mkv');
  });

  it('single conflict increments suffix', () => {
    const result = resolveOutputPath('/videos/test.mp4', 'mkv', ['/videos/test.mkv']);
    expect(result).toBe('/videos/test-1.mkv');
  });

  it('multiple conflicts increments until free', () => {
    const result = resolveOutputPath('/videos/test.mp4', 'mkv', [
      '/videos/test.mkv',
      '/videos/test-1.mkv',
      '/videos/test-2.mkv',
    ]);
    expect(result).toBe('/videos/test-3.mkv');
  });

  it('custom output dir is used when set', () => {
    const result = resolveOutputPath('/videos/test.mp4', 'mkv', [], '/output/');
    expect(result).toBe('/output/test.mkv');
  });
});

// ─── Trim Accuracy (frame snapping for CFR) ─────────────────────────────────

describe('Trim accuracy', () => {
  it('buildFfmpegArgs includes -ss and -to for trim', () => {
    const item = makeVideoItem({
      trim: { start: 10.5, end: 60.0 },
    });
    const args = buildFfmpegArgs(item);
    expect(args).toContain('-ss');
    expect(args).toContain('10.5');
    expect(args).toContain('-to');
    expect(args).toContain('60');
  });

  it('CFR content trims to frame boundaries', () => {
    // 30fps CFR video: frame duration = 1/30 ≈ 0.0333s
    const item = makeVideoItem({
      source: { frameRate: 30, isVfr: false },
      trim: { start: 10.0, end: 60.0 },
    });
    const args = buildFfmpegArgs(item);
    const ssIndex = args.indexOf('-ss');
    // -ss value should be snapped to nearest frame (10.0 is already on frame boundary for 30fps)
    expect(args[ssIndex + 1]).toBe('10');
  });
});

// ─── Image Format Coverage ────────────────────────────────────────────────────

describe('Image format coverage', () => {
  it('video input shows video + extract formats', () => {
    const formats = getAvailableFormats('video');
    expect(formats).toContain('mp4');
    expect(formats).toContain('mkv');
    expect(formats).toContain('webm');
  });

  it('audio input shows audio formats only', () => {
    const formats = getAvailableFormats('audio');
    expect(formats).toContain('mp3');
    expect(formats).toContain('aac');
    expect(formats).toContain('wav');
    expect(formats).toContain('flac');
    expect(formats).not.toContain('mp4');
  });

  it('image input shows image formats only', () => {
    const formats = getAvailableFormats('image');
    expect(formats).toEqual(['png', 'jpeg', 'webp']);
  });
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeVideoItem(overrides: Partial<{
  source: Partial<{
    frameRate: number;
    isVfr: boolean;
  }>;
  trim: { start: number; end: number } | null;
}> = {}): QueueItem {
  return {
    id: 'test-1',
    source: {
      path: '/videos/test.mp4',
      fileName: 'test.mp4',
      fileSize: 1_200_000_000,
      inputType: 'video',
      width: 1920,
      height: 1080,
      duration: 5030,
      videoCodec: 'h264',
      audioCodec: 'aac',
      audioChannels: 2,
      audioSampleRate: 48000,
      bitrate: 5_000_000,
      frameRate: 30,
      isVfr: false,
      streams: [],
      ...overrides.source,
    },
    settings: {
      format: 'mp4',
      quality: { preset: 'good', crf: 23, audioBitrate: 192 },
      trim: null,
      mode: 'convert',
      extractStreamIndex: null,
      ...overrides,
    },
    status: 'queued',
    progress: 0,
    error: null,
    outputPath: '/videos/test.mkv',
    outputSize: null,
  };
}
