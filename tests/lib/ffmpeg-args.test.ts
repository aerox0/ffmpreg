import { describe, it, expect } from 'vitest';
import { buildFfmpegArgs, needsTranscode } from '../../src/lib/ffmpeg-args.js';
import type { QueueItem } from '../../src/types/index.js';

/** Helper to build a minimal QueueItem with sensible defaults. */
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
      quality: {
        preset: 'good',
        crf: 25,
        audioBitrate: 192,
      },
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

// ---------------------------------------------------------------------------
// 1. Video convert — MP4 with Good preset
// ---------------------------------------------------------------------------
describe('buildFfmpegArgs — video convert (MP4 good preset)', () => {
  it('includes -c:v libx264 with midpoint CRF', () => {
    const item = makeItem({});
    const args = buildFfmpegArgs(item);
    const vIdx = args.indexOf('-c:v');
    expect(vIdx).toBeGreaterThan(-1);
    expect(args[vIdx + 1]).toBe('libx264');

    const crfIdx = args.indexOf('-crf');
    expect(crfIdx).toBeGreaterThan(-1);
    // good preset midpoint of 22-28 is 25
    expect(args[crfIdx + 1]).toBe('25');
  });

  it('includes -c:a aac with correct audio bitrate', () => {
    const item = makeItem({});
    const args = buildFfmpegArgs(item);
    const caIdx = args.indexOf('-c:a');
    expect(caIdx).toBeGreaterThan(-1);
    expect(args[caIdx + 1]).toBe('aac');

    const baIdx = args.indexOf('-b:a');
    expect(baIdx).toBeGreaterThan(-1);
    expect(args[baIdx + 1]).toBe('192k');
  });

  it('starts with -i sourcePath and ends with outputPath', () => {
    const item = makeItem({});
    const args = buildFfmpegArgs(item);
    const iIdx = args.indexOf('-i');
    expect(iIdx).toBe(0);
    expect(args[iIdx + 1]).toBe('/input/video.mp4');
    expect(args[args.length - 1]).toBe('/output/video.mp4');
  });
});

// ---------------------------------------------------------------------------
// 2. Audio convert — WAV to MP3
// ---------------------------------------------------------------------------
describe('buildFfmpegArgs — audio convert (WAV -> MP3)', () => {
  it('includes audio codec and bitrate, no video codec args', () => {
    const item = makeItem({
      source: {
        path: '/input/audio.wav',
        fileName: 'audio.wav',
        inputType: 'audio',
        duration: 200,
        width: 0,
        height: 0,
        videoCodec: null,
        audioCodec: 'pcm_s16le',
        audioChannels: 2,
        audioSampleRate: 44100,
        bitrate: 1_411_000,
        fileSize: 35_000_000,
        frameRate: null,
        isVfr: false,
        streams: [],
      },
      settings: {
        format: 'mp3',
        quality: { preset: 'good', crf: 25, audioBitrate: 192 },
        trim: null,
        mode: 'convert',
        extractStreamIndex: null,
      },
      outputPath: '/output/audio.mp3',
    });

    const args = buildFfmpegArgs(item);

    // Should have audio codec
    const caIdx = args.indexOf('-c:a');
    expect(caIdx).toBeGreaterThan(-1);
    expect(args[caIdx + 1]).toBe('libmp3lame');

    // Should have audio bitrate
    const baIdx = args.indexOf('-b:a');
    expect(baIdx).toBeGreaterThan(-1);
    expect(args[baIdx + 1]).toBe('192k');

    // Should NOT have video codec args
    expect(args.indexOf('-c:v')).toBe(-1);
    expect(args.indexOf('-crf')).toBe(-1);

    // Ends with output path
    expect(args[args.length - 1]).toBe('/output/audio.mp3');
  });
});

// ---------------------------------------------------------------------------
// 3. Image convert — PNG to JPEG
// ---------------------------------------------------------------------------
describe('buildFfmpegArgs — image convert (PNG -> JPEG)', () => {
  it('uses -q:v with correct quality value', () => {
    const item = makeItem({
      source: {
        path: '/input/photo.png',
        fileName: 'photo.png',
        inputType: 'image',
        duration: 0,
        width: 800,
        height: 600,
        videoCodec: null,
        audioCodec: null,
        audioChannels: 0,
        audioSampleRate: 0,
        bitrate: 0,
        fileSize: 500_000,
        frameRate: null,
        isVfr: false,
        streams: [],
      },
      settings: {
        format: 'jpeg',
        quality: { preset: 'good', crf: 80, audioBitrate: 192 },
        trim: null,
        mode: 'convert',
        extractStreamIndex: null,
      },
      outputPath: '/output/photo.jpg',
    });

    const args = buildFfmpegArgs(item);

    const qvIdx = args.indexOf('-q:v');
    expect(qvIdx).toBeGreaterThan(-1);
    expect(args[qvIdx + 1]).toBe('80');

    // No video/audio codec args for image
    expect(args.indexOf('-c:v')).toBe(-1);
    expect(args.indexOf('-c:a')).toBe(-1);
    expect(args.indexOf('-crf')).toBe(-1);
    expect(args.indexOf('-b:a')).toBe(-1);

    expect(args[args.length - 1]).toBe('/output/photo.jpg');
  });
});

// ---------------------------------------------------------------------------
// 4. With trim — -ss and -to after -i
// ---------------------------------------------------------------------------
describe('buildFfmpegArgs — with trim', () => {
  it('places -ss and -to flags after -i', () => {
    const item = makeItem({
      settings: {
        format: 'mp4',
        quality: { preset: 'good', crf: 25, audioBitrate: 192 },
        trim: { start: 10.5, end: 60.0 },
        mode: 'convert',
        extractStreamIndex: null,
      },
    });

    const args = buildFfmpegArgs(item);

    const iIdx = args.indexOf('-i');
    expect(iIdx).toBe(0);

    const ssIdx = args.indexOf('-ss');
    const toIdx = args.indexOf('-to');

    // Both must exist and be after -i source
    expect(ssIdx).toBeGreaterThan(iIdx + 1);
    expect(toIdx).toBeGreaterThan(iIdx + 1);

    expect(args[ssIdx + 1]).toBe('10.5');
    expect(args[toIdx + 1]).toBe('60.0');
  });
});

// ---------------------------------------------------------------------------
// 5. GIF — filter_complex
// ---------------------------------------------------------------------------
describe('buildFfmpegArgs — GIF output', () => {
  it('uses filter_complex with fps and palette', () => {
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

    // Should have filter_complex
    const fcIdx = args.indexOf('-filter_complex');
    expect(fcIdx).toBeGreaterThan(-1);

    const filter = args[fcIdx + 1];
    // Good preset: fps=15, paletteSize=256
    expect(filter).toContain('fps=15');
    expect(filter).toContain('palettegen=max_colors=256');
    expect(filter).toContain('paletteuse');

    // No standard codec args for GIF
    expect(args.indexOf('-c:v')).toBe(-1);
    expect(args.indexOf('-crf')).toBe(-1);

    expect(args[args.length - 1]).toBe('/output/video.gif');
  });
});

// ---------------------------------------------------------------------------
// 6. Stream copy — when source codec matches target
// ---------------------------------------------------------------------------
describe('buildFfmpegArgs — stream copy', () => {
  it('uses -c copy when source codec is compatible with target container', () => {
    // h264 video, aac audio -> mp4 (both compatible)
    const item = makeItem({
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
        format: 'mov',
        quality: { preset: 'good', crf: 25, audioBitrate: 192 },
        trim: null,
        mode: 'convert',
        extractStreamIndex: null,
      },
      outputPath: '/output/video.mov',
    });

    const args = buildFfmpegArgs(item);

    // Should use stream copy since h264+aac are compatible with mov
    expect(args).toContain('-c');
    expect(args).toContain('copy');

    // Should NOT have individual codec or quality flags
    expect(args.indexOf('-c:v')).toBe(-1);
    expect(args.indexOf('-c:a')).toBe(-1);
    expect(args.indexOf('-crf')).toBe(-1);
    expect(args.indexOf('-b:a')).toBe(-1);
  });
});

// ---------------------------------------------------------------------------
// 7. Stream extraction
// ---------------------------------------------------------------------------
describe('buildFfmpegArgs — stream extraction', () => {
  it('extracts audio stream with -map and -c:a copy', () => {
    const item = makeItem({
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
        streams: [
          { index: 0, type: 'video', codec: 'h264', language: null, title: null },
          { index: 1, type: 'audio', codec: 'aac', language: 'eng', channels: 2, sampleRate: 48000, title: null },
        ],
      },
      settings: {
        format: 'aac',
        quality: { preset: 'good', crf: 25, audioBitrate: 192 },
        trim: null,
        mode: 'extract',
        extractStreamIndex: 1,
      },
      outputPath: '/output/track.aac',
    });

    const args = buildFfmpegArgs(item);

    // Should map the audio stream
    const mapIdx = args.indexOf('-map');
    expect(mapIdx).toBeGreaterThan(-1);
    // extractStreamIndex=1 is the second stream (audio), map as 0:a:0
    expect(args[mapIdx + 1]).toBe('0:a:0');

    // Should copy without re-encoding
    const caIdx = args.indexOf('-c:a');
    expect(caIdx).toBeGreaterThan(-1);
    expect(args[caIdx + 1]).toBe('copy');

    expect(args[args.length - 1]).toBe('/output/track.aac');
  });

  it('extracts video stream with -map 0:v:0 and -c copy', () => {
    const item = makeItem({
      source: {
        path: '/input/video.mkv',
        fileName: 'video.mkv',
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
        streams: [
          { index: 0, type: 'video', codec: 'h264', language: null, title: null },
          { index: 1, type: 'audio', codec: 'aac', language: 'eng', channels: 2, sampleRate: 48000, title: null },
        ],
      },
      settings: {
        format: 'mp4',
        quality: { preset: 'good', crf: 25, audioBitrate: 192 },
        trim: null,
        mode: 'extract',
        extractStreamIndex: 0,
      },
      outputPath: '/output/video_only.mp4',
    });

    const args = buildFfmpegArgs(item);

    const mapIdx = args.indexOf('-map');
    expect(mapIdx).toBeGreaterThan(-1);
    expect(args[mapIdx + 1]).toBe('0:v:0');

    expect(args).toContain('-c');
    expect(args).toContain('copy');
  });
});

// ---------------------------------------------------------------------------
// 8. needsTranscode
// ---------------------------------------------------------------------------
describe('needsTranscode', () => {
  describe('compatible pairs (returns false)', () => {
    it('h264 -> mp4', () => expect(needsTranscode('h264', 'mp4')).toBe(false));
    it('h264 -> mov', () => expect(needsTranscode('h264', 'mov')).toBe(false));
    it('h264 -> mkv', () => expect(needsTranscode('h264', 'mkv')).toBe(false));
    it('h264 -> avi', () => expect(needsTranscode('h264', 'avi')).toBe(false));
    it('aac -> mp4', () => expect(needsTranscode('aac', 'mp4')).toBe(false));
    it('aac -> mov', () => expect(needsTranscode('aac', 'mov')).toBe(false));
    it('aac -> mkv', () => expect(needsTranscode('aac', 'mkv')).toBe(false));
    it('aac -> aac', () => expect(needsTranscode('aac', 'aac')).toBe(false));
    it('mp3 -> mp3', () => expect(needsTranscode('mp3', 'mp3')).toBe(false));
    it('mp3 -> avi', () => expect(needsTranscode('mp3', 'avi')).toBe(false));
    it('mp3 -> mkv', () => expect(needsTranscode('mp3', 'mkv')).toBe(false));
    it('vp9 -> webm', () => expect(needsTranscode('vp9', 'webm')).toBe(false));
    it('opus -> webm', () => expect(needsTranscode('opus', 'webm')).toBe(false));
    it('opus -> ogg', () => expect(needsTranscode('opus', 'ogg')).toBe(false));
    it('vorbis -> ogg', () => expect(needsTranscode('vorbis', 'ogg')).toBe(false));
    it('vorbis -> mkv', () => expect(needsTranscode('vorbis', 'mkv')).toBe(false));
    it('flac -> flac', () => expect(needsTranscode('flac', 'flac')).toBe(false));
    it('flac -> mkv', () => expect(needsTranscode('flac', 'mkv')).toBe(false));
    it('pcm_s16le -> wav', () => expect(needsTranscode('pcm_s16le', 'wav')).toBe(false));
    it('gif -> gif', () => expect(needsTranscode('gif', 'gif')).toBe(false));
  });

  describe('incompatible pairs (returns true)', () => {
    it('h264 -> webm', () => expect(needsTranscode('h264', 'webm')).toBe(true));
    it('vp9 -> mp4', () => expect(needsTranscode('vp9', 'mp4')).toBe(true));
    it('aac -> mp3', () => expect(needsTranscode('aac', 'mp3')).toBe(true));
    it('opus -> mp4', () => expect(needsTranscode('opus', 'mp4')).toBe(true));
    it('flac -> mp3', () => expect(needsTranscode('flac', 'mp3')).toBe(true));
    it('unknown codec -> mp4', () => expect(needsTranscode('av1', 'mp4')).toBe(true));
    it('h264 -> ogg', () => expect(needsTranscode('h264', 'ogg')).toBe(true));
  });
});
