import { describe, it, expect } from 'vitest';
import { buildFfmpegArgs, type EncodeItem } from './ffmpeg-args';
import { getCodecForContainer } from './codecs';

describe('ffmpeg-args', () => {
  describe('buildFfmpegArgs', () => {
    const baseItem: EncodeItem = {
      id: 'test-1',
      sourcePath: '/input/video.mp4',
      outputPath: '/output/video.mkv',
      targetFormat: 'mkv',
      preset: 'good',
      crf: 25,
      audioBitrate: 192,
      duration: 120,
      videoCodec: 'h264',
      audioCodec: 'aac',
      width: 1920,
      height: 1080,
      frameRate: 30,
      isVfr: false,
      inputType: 'video',
    };

    it('builds basic ffmpeg args for video conversion', () => {
      const args = buildFfmpegArgs(baseItem);
      
      expect(args).toContain('-i');
      expect(args).toContain('/input/video.mp4');
      expect(args).toContain('-c:v');
      expect(args).toContain('libx264');
      expect(args).toContain('-crf');
      expect(args).toContain('25');
      expect(args).toContain('-preset');
      expect(args).toContain('medium');
      expect(args).toContain('-c:a');
      expect(args).toContain('aac');
      expect(args).toContain('-b:a');
      expect(args).toContain('192k');
      expect(args).toContain('-y');
      expect(args[args.length - 1]).toBe('/output/video.mkv');
    });

    it('builds args for mp3 output', () => {
      const mp3Item: EncodeItem = {
        ...baseItem,
        outputPath: '/output/audio.mp3',
        targetFormat: 'mp3',
      };
      
      const args = buildFfmpegArgs(mp3Item);
      
      expect(args).toContain('-i');
      expect(args).toContain('/input/video.mp4');
      expect(args).toContain('-c:a');
      expect(args).toContain('libmp3lame');
      expect(args).toContain('-b:a');
      expect(args).toContain('192k');
    });

    it('includes trim start when specified', () => {
      const trimmedItem: EncodeItem = {
        ...baseItem,
        trimStart: 10,
      };
      
      const args = buildFfmpegArgs(trimmedItem);
      
      expect(args).toContain('-ss');
      expect(args).toContain('10');
    });

    it('includes trim end when specified', () => {
      const trimmedItem: EncodeItem = {
        ...baseItem,
        trimEnd: 60,
      };
      
      const args = buildFfmpegArgs(trimmedItem);
      
      expect(args).toContain('-to');
      expect(args).toContain('60');
    });

    it('includes both trim start and end when both specified', () => {
      const trimmedItem: EncodeItem = {
        ...baseItem,
        trimStart: 10,
        trimEnd: 60,
      };
      
      const args = buildFfmpegArgs(trimmedItem);
      
      expect(args).toContain('-ss');
      expect(args).toContain('10');
      expect(args).toContain('-to');
      expect(args).toContain('60');
    });

    it('clamps CRF to preset bounds', () => {
      const outOfRangeItem: EncodeItem = {
        ...baseItem,
        crf: 50, // Way outside good range (22-28)
      };
      
      const args = buildFfmpegArgs(outOfRangeItem);
      
      // Should clamp to max (28)
      const crfIndex = args.indexOf('-crf');
      expect(parseInt(args[crfIndex + 1])).toBe(28);
    });

    it('uses stream copy when source and target codecs match', () => {
      const streamCopyItem: EncodeItem = {
        ...baseItem,
        videoCodec: 'libx264',
        audioCodec: 'aac',
        outputPath: '/output/video_copy.mp4',
        targetFormat: 'mp4',
      };
      
      const args = buildFfmpegArgs(streamCopyItem);
      
      expect(args).toContain('-c:v');
      expect(args).toContain('copy');
      expect(args).toContain('-c:a');
      expect(args).toContain('copy');
      // Should not contain CRF for stream copy
      expect(args).not.toContain('-crf');
    });

    it('encodes when codecs do not match', () => {
      const encodeItem: EncodeItem = {
        ...baseItem,
        videoCodec: 'h264',
        audioCodec: 'aac',
        outputPath: '/output/video.webm',
        targetFormat: 'webm', // Uses VP9 and Opus
      };
      
      const args = buildFfmpegArgs(encodeItem);
      
      expect(args).toContain('-c:v');
      expect(args).toContain('libvpx-vp9');
      expect(args).toContain('-c:a');
      expect(args).toContain('libopus');
      expect(args).toContain('-crf');
    });

    it('handles wav output format', () => {
      const wavItem: EncodeItem = {
        ...baseItem,
        outputPath: '/output/audio.wav',
        targetFormat: 'wav',
      };
      
      const args = buildFfmpegArgs(wavItem);
      
      expect(args).toContain('-c:a');
      expect(args).toContain('pcm_s16le');
    });

    it('handles flac output format', () => {
      const flacItem: EncodeItem = {
        ...baseItem,
        outputPath: '/output/audio.flac',
        targetFormat: 'flac',
      };
      
      const args = buildFfmpegArgs(flacItem);
      
      expect(args).toContain('-c:a');
      expect(args).toContain('flac');
      // flac is lossless, so no bitrate
      expect(args).not.toContain('-b:a');
    });

    it('handles ogg output format', () => {
      const oggItem: EncodeItem = {
        ...baseItem,
        outputPath: '/output/audio.ogg',
        targetFormat: 'ogg',
      };
      
      const args = buildFfmpegArgs(oggItem);
      
      expect(args).toContain('-c:a');
      expect(args).toContain('libvorbis');
      expect(args).toContain('-b:a');
      expect(args).toContain('192k');
    });
  });

  describe('buildFfmpegArgs for images', () => {
    const imageItem: EncodeItem = {
      id: 'test-img',
      sourcePath: '/input/video.mp4',
      outputPath: '/output/frame.png',
      targetFormat: 'png',
      preset: 'good',
      crf: 80,
      audioBitrate: 192,
      duration: 120,
      videoCodec: 'h264',
      audioCodec: 'aac',
      inputType: 'video',
    };

    it('includes -frames:v 1 for png', () => {
      const args = buildFfmpegArgs(imageItem);
      
      expect(args).toContain('-frames:v');
      expect(args).toContain('1');
    });

    it('handles jpeg output with quality', () => {
      const jpegItem: EncodeItem = {
        ...imageItem,
        outputPath: '/output/frame.jpeg',
        targetFormat: 'jpeg',
      };
      
      const args = buildFfmpegArgs(jpegItem);
      
      expect(args).toContain('-frames:v');
      expect(args).toContain('1');
      expect(args).toContain('-q:v');
    });

    it('handles webp output with quality', () => {
      const webpItem: EncodeItem = {
        ...imageItem,
        outputPath: '/output/frame.webp',
        targetFormat: 'webp',
      };
      
      const args = buildFfmpegArgs(webpItem);
      
      expect(args).toContain('-frames:v');
      expect(args).toContain('1');
      expect(args).toContain('-quality');
    });
  });
});

describe('codecs', () => {
  describe('getCodecForContainer', () => {
    it('returns correct codecs for mp4', () => {
      const codecs = getCodecForContainer('mp4');
      expect(codecs.video).toBe('libx264');
      expect(codecs.audio).toBe('aac');
    });

    it('returns correct codecs for webm', () => {
      const codecs = getCodecForContainer('webm');
      expect(codecs.video).toBe('libvpx-vp9');
      expect(codecs.audio).toBe('libopus');
    });

    it('returns correct codecs for gif', () => {
      const codecs = getCodecForContainer('gif');
      expect(codecs.video).toBe('gif');
      expect(codecs.audio).toBeNull();
    });

    it('returns null codecs for image formats', () => {
      const pngCodecs = getCodecForContainer('png');
      expect(pngCodecs.video).toBeNull();
      expect(pngCodecs.audio).toBeNull();

      const jpegCodecs = getCodecForContainer('jpeg');
      expect(jpegCodecs.video).toBeNull();
      expect(jpegCodecs.audio).toBeNull();
    });

    it('handles container names case-insensitively', () => {
      const upper = getCodecForContainer('MP4');
      const lower = getCodecForContainer('mp4');
      expect(upper).toEqual(lower);
    });

    it('handles container names with dots', () => {
      const codecs = getCodecForContainer('.mp4');
      expect(codecs.video).toBe('libx264');
    });

    it('returns null codecs for unknown formats', () => {
      const codecs = getCodecForContainer('unknown');
      expect(codecs.video).toBeNull();
      expect(codecs.audio).toBeNull();
    });
  });
});
