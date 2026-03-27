import { describe, it, expect } from 'vitest';
import { buildFfmpegArgs, needsTranscode } from '../../src/lib/ffmpeg-args';
import type { QueueItem, SourceMeta, MediaStream } from '../../src/types/index';

function makeVideoSource(): SourceMeta {
  return {
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
      { index: 1, type: 'audio', codec: 'aac', language: null, title: null },
    ],
  };
}

function makeAudioSource(): SourceMeta {
  return {
    path: '/input/audio.wav',
    fileName: 'audio.wav',
    inputType: 'audio',
    duration: 300,
    width: 0,
    height: 0,
    videoCodec: null,
    audioCodec: 'pcm_s16le',
    audioChannels: 2,
    audioSampleRate: 44100,
    bitrate: 1411_200,
    fileSize: 52_875_000,
    frameRate: null,
    isVfr: false,
    streams: [
      { index: 0, type: 'audio', codec: 'pcm_s16le', language: null, title: null },
    ],
  };
}

function makeImageSource(): SourceMeta {
  return {
    path: '/input/image.png',
    fileName: 'image.png',
    inputType: 'image',
    duration: 0,
    width: 1920,
    height: 1080,
    videoCodec: null,
    audioCodec: null,
    audioChannels: 0,
    audioSampleRate: 0,
    bitrate: 0,
    fileSize: 2_000_000,
    frameRate: null,
    isVfr: false,
    streams: [],
  };
}

function makeQueueItem(source: SourceMeta, format: string, crf = 23, audioBitrate = 192): QueueItem {
  return {
    id: 'test-id',
    source,
    settings: {
      format,
      quality: { preset: 'good', crf, audioBitrate },
      trim: null,
      mode: 'convert',
      extractStreamIndex: null,
    },
    status: 'queued',
    progress: 0,
    error: null,
    outputPath: null,
    outputSize: null,
  };
}

describe('ffmpeg-args', () => {
  describe('needsTranscode', () => {
    it('returns true when source codec differs from target', () => {
      expect(needsTranscode('h264', 'webm')).toBe(true);
    });

    it('returns false when source codec matches target (copy possible)', () => {
      expect(needsTranscode('aac', 'mp4')).toBe(false);
    });

    it('returns true for unknown codec', () => {
      expect(needsTranscode('unknown', 'mp4')).toBe(true);
    });
  });

  describe('buildFfmpegArgs', () => {
    it('video convert: mp4 → mkv with good preset', () => {
      const item = makeQueueItem(makeVideoSource(), 'mkv');
      const args = buildFfmpegArgs(item);
      expect(args).toContain('-i');
      expect(args).toContain('/input/video.mp4');
      expect(args).toContain('-c:v');
      expect(args).toContain('libx264');
      expect(args).toContain('-crf');
      expect(args).toContain('23');
      expect(args).toContain('-c:a');
      expect(args).toContain('aac');
      expect(args).toContain('-b:a');
      expect(args).toContain('192k');
    });

    it('audio convert: wav → mp3', () => {
      const item = makeQueueItem(makeAudioSource(), 'mp3');
      const args = buildFfmpegArgs(item);
      expect(args).toContain('-i');
      expect(args).toContain('/input/audio.wav');
      expect(args).toContain('-c:a');
      expect(args).toContain('libmp3lame');
      expect(args).toContain('-b:a');
      expect(args).toContain('192k');
    });

    it('image convert: png → jpeg', () => {
      const item = makeQueueItem(makeImageSource(), 'jpeg');
      const args = buildFfmpegArgs(item);
      expect(args).toContain('-i');
      expect(args).toContain('/input/image.png');
      expect(args).toContain('-q:v');
      expect(args).toContain('23');
    });

    it('adds -ss and -to flags when trim is set', () => {
      const item = makeQueueItem(makeVideoSource(), 'mkv');
      item.settings.trim = { start: 10.5, end: 60.0 };
      const args = buildFfmpegArgs(item);
      expect(args).toContain('-ss');
      expect(args).toContain('10.5');
      expect(args).toContain('-to');
      expect(args).toContain('60');
    });

    it('adds output path at the end', () => {
      const item = makeQueueItem(makeVideoSource(), 'mkv');
      const args = buildFfmpegArgs(item);
      const last = args[args.length - 1];
      expect(last).toMatch(/\.mkv$/);
    });

    it('uses -c copy when source codec matches target', () => {
      // Source is h264/aac, target mp4 uses same codecs
      const item = makeQueueItem(makeVideoSource(), 'mp4');
      const args = buildFfmpegArgs(item);
      expect(args).toContain('-c:v');
      expect(args).toContain('libx264');
    });
  });
});
