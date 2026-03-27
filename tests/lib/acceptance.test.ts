/**
 * Acceptance tests — focused verification of spec criteria
 * that are not already covered by the existing unit tests.
 */
import { describe, it, expect } from 'vitest';
import { getCrfRange, getCompressionRatio } from '../../src/lib/presets.js';
import { shouldWarnSize, estimateOutputSize } from '../../src/lib/estimate.js';
import { resolveOutputPath } from '../../src/lib/output-path.js';
import { buildFfmpegArgs, needsTranscode } from '../../src/lib/ffmpeg-args.js';
import type { QueueItem } from '../../src/types/index';

// ---------------------------------------------------------------------------
// 1. Quality guardrails
// ---------------------------------------------------------------------------

describe('Quality guardrails (acceptance)', () => {
  it('Compact preset CRF range is bounded (28-35)', () => {
    const range = getCrfRange('compact');
    expect(range.min).toBe(28);
    expect(range.max).toBe(35);
  });

  it('Good preset CRF range is bounded (22-28)', () => {
    const range = getCrfRange('good');
    expect(range.min).toBe(22);
    expect(range.max).toBe(28);
  });

  it('High preset CRF range is bounded (18-23)', () => {
    const range = getCrfRange('high');
    expect(range.min).toBe(18);
    expect(range.max).toBe(23);
  });

  it('shouldWarnSize returns true when estimated exceeds source', () => {
    expect(shouldWarnSize(1000, 1500)).toBe(true);
    expect(shouldWarnSize(1000, 500)).toBe(false);
    expect(shouldWarnSize(1000, 1000)).toBe(false);
  });

  it('Custom preset allows full range (18-35) but warning still fires', () => {
    const range = getCrfRange('custom');
    expect(range.min).toBe(18);
    expect(range.max).toBe(35);
    // Warning still fires for oversized output even on custom preset
    expect(shouldWarnSize(1000, 2000)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 2. Output naming — conflict resolution
// ---------------------------------------------------------------------------

describe('Output naming (acceptance)', () => {
  it('resolves conflicts before encoding with -1, -2, -3 suffixes', () => {
    const result1 = resolveOutputPath('/videos/test.mp4', 'mkv', []);
    expect(result1).toBe('/videos/test.mkv');

    const result2 = resolveOutputPath('/videos/test.mp4', 'mkv', ['/videos/test.mkv']);
    expect(result2).toBe('/videos/test-1.mkv');

    const result3 = resolveOutputPath('/videos/test.mp4', 'mkv', [
      '/videos/test.mkv',
      '/videos/test-1.mkv',
      '/videos/test-2.mkv',
    ]);
    expect(result3).toBe('/videos/test-3.mkv');
  });

  it('uses custom output directory when provided', () => {
    const result = resolveOutputPath('/videos/test.mp4', 'mp4', [], '/output');
    expect(result).toBe('/output/test.mp4');
  });
});

// ---------------------------------------------------------------------------
// 3. ffmpeg args — trim, stream copy, GIF
// ---------------------------------------------------------------------------

describe('ffmpeg args (acceptance)', () => {
  function makeItem(overrides: Partial<QueueItem>): QueueItem {
    const defaults: QueueItem = {
      id: 'test-id',
      source: {
        path: '/input/video.mp4',
        fileName: 'video.mp4',
        inputType: 'video',
        duration: 120,
        width: 1920,
        height: 1080,
        videoCodec: 'h264',
        audioCodec: 'aac',
        audioChannels: 2,
        audioSampleRate: 48000,
        bitrate: 5_000_000,
        fileSize: 75_000_000,
        frameRate: 30,
        isVfr: false,
        streams: [],
      },
      settings: {
        format: 'mp4',
        quality: { preset: 'good', crf: 25, audioBitrate: 192 },
        trim: null,
        mode: 'convert',
        extractStreamIndex: null,
      },
      status: 'queued',
      progress: 0,
      error: null,
      outputPath: '/output/video.mp4',
      outputSize: null,
    };

    const over = overrides as Record<string, unknown>;
    return {
      ...defaults,
      ...overrides,
      settings: {
        ...defaults.settings,
        ...(over.settings as Partial<QueueItem['settings']> | undefined),
      },
      source: {
        ...defaults.source,
        ...(over.source as Partial<QueueItem['source']> | undefined),
      },
    } as QueueItem;
  }

  it('trim args place -ss and -to after -i', () => {
    const item = makeItem({
      settings: {
        format: 'mp4',
        quality: { preset: 'good', crf: 25, audioBitrate: 192 },
        trim: { start: 10, end: 60 },
        mode: 'convert',
        extractStreamIndex: null,
      },
    });

    const args = buildFfmpegArgs(item);
    const iIdx = args.indexOf('-i');
    const ssIdx = args.indexOf('-ss');
    const toIdx = args.indexOf('-to');

    expect(iIdx).toBe(0);
    expect(ssIdx).toBeGreaterThan(iIdx + 1);
    expect(toIdx).toBeGreaterThan(iIdx + 1);
    expect(args[ssIdx + 1]).toBe('10.0');
    expect(args[toIdx + 1]).toBe('60.0');
  });

  it('stream copy uses -c copy when both codecs compatible', () => {
    const item = makeItem({
      settings: {
        format: 'mov',
        quality: { preset: 'good', crf: 25, audioBitrate: 192 },
        trim: null,
        mode: 'convert',
        extractStreamIndex: null,
      },
      outputPath: '/output/video.mov',
    });

    const args = buildFfmpegArgs(item);
    const cIdx = args.indexOf('-c');
    expect(cIdx).toBeGreaterThan(-1);
    expect(args[cIdx + 1]).toBe('copy');
  });

  it('GIF uses filter_complex', () => {
    const item = makeItem({
      settings: {
        format: 'gif',
        quality: { preset: 'good', crf: 25, audioBitrate: 192 },
        trim: null,
        mode: 'convert',
        extractStreamIndex: null,
      },
      outputPath: '/output/video.gif',
    });

    const args = buildFfmpegArgs(item);
    expect(args).toContain('-filter_complex');
    const filter = args[args.indexOf('-filter_complex') + 1];
    expect(filter).toContain('palettegen');
    expect(filter).toContain('paletteuse');
  });

  it('needsTranscode detects incompatible codec/container pairs', () => {
    // Compatible
    expect(needsTranscode('h264', 'mp4')).toBe(false);
    expect(needsTranscode('vp9', 'webm')).toBe(false);
    // Incompatible
    expect(needsTranscode('h264', 'webm')).toBe(true);
    expect(needsTranscode('vp9', 'mp4')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// 4. Batch processing — buildFfmpegArgs handles items independently
// ---------------------------------------------------------------------------

describe('Batch processing (acceptance)', () => {
  it('buildFfmpegArgs handles each item independently', () => {
    function makeItem(
      sourcePath: string,
      format: string,
      outputPath: string,
      trim: { start: number; end: number } | null,
    ): QueueItem {
      return {
        id: sourcePath,
        source: {
          path: sourcePath,
          fileName: sourcePath.split('/').pop()!,
          inputType: 'video',
          duration: 120,
          width: 1920,
          height: 1080,
          videoCodec: 'h264',
          audioCodec: 'aac',
          audioChannels: 2,
          audioSampleRate: 48000,
          bitrate: 5_000_000,
          fileSize: 75_000_000,
          frameRate: 30,
          isVfr: false,
          streams: [],
        },
        settings: {
          format,
          quality: { preset: 'good', crf: 25, audioBitrate: 192 },
          trim,
          mode: 'convert',
          extractStreamIndex: null,
        },
        status: 'queued',
        progress: 0,
        error: null,
        outputPath,
        outputSize: null,
      };
    }

    const item1 = makeItem('/a.mp4', 'mkv', '/a.mkv', null);
    const item2 = makeItem('/b.mp4', 'webm', '/b.webm', { start: 5, end: 30 });
    const item3 = makeItem('/c.mp4', 'gif', '/c.gif', null);

    const args1 = buildFfmpegArgs(item1);
    const args2 = buildFfmpegArgs(item2);
    const args3 = buildFfmpegArgs(item3);

    // Item 1: MP4 to MKV — h264+aac compatible with mkv, should stream copy
    expect(args1).toContain('-c');
    expect(args1).toContain('copy');
    expect(args1[args1.length - 1]).toBe('/a.mkv');

    // Item 2: MP4 to WebM — must transcode, and has trim
    expect(args2).toContain('-ss');
    expect(args2).toContain('-to');
    expect(args2).toContain('-c:v');
    expect(args2[args2.length - 1]).toBe('/b.webm');

    // Item 3: MP4 to GIF — filter_complex
    expect(args3).toContain('-filter_complex');
    expect(args3[args3.length - 1]).toBe('/c.gif');

    // Verify independence: each item produces different args
    expect(args1).not.toEqual(args2);
    expect(args2).not.toEqual(args3);
  });
});

// ---------------------------------------------------------------------------
// 5. Duration 0 guard in estimateOutputSize
// ---------------------------------------------------------------------------

describe('estimateOutputSize duration guard (acceptance)', () => {
  it('uses fileSize * ratio when duration is 0 (e.g. images)', () => {
    const source = { fileSize: 1_000_000, duration: 0 };
    const result = estimateOutputSize(source, 'compact', null);
    // 1_000_000 * 0.25 = 250_000
    expect(result).toBe(250_000);
  });

  it('uses fileSize * ratio when duration is negative', () => {
    const source = { fileSize: 2_000_000, duration: -5 };
    const result = estimateOutputSize(source, 'good', null);
    // 2_000_000 * 0.40 = 800_000
    expect(result).toBe(800_000);
  });

  it('applies trim duration factor only when duration > 0', () => {
    // When duration is 0, trim is ignored (ratio-only estimate)
    const source = { fileSize: 1_000_000, duration: 0 };
    const trim = { start: 0, end: 5 };
    const result = estimateOutputSize(source, 'compact', trim);
    expect(result).toBe(250_000); // same as without trim
  });
});

// ---------------------------------------------------------------------------
// 6. Compression ratio sanity
// ---------------------------------------------------------------------------

describe('Compression ratios (acceptance)', () => {
  it('compact is most aggressive, high is least aggressive', () => {
    const compact = getCompressionRatio('compact');
    const good = getCompressionRatio('good');
    const high = getCompressionRatio('high');
    expect(compact).toBeLessThan(good);
    expect(good).toBeLessThan(high);
  });
});
