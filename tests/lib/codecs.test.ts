import { describe, it, expect } from 'vitest';
import { getCodecForContainer } from '../../src/lib/codecs';

describe('codecs', () => {
  describe('getCodecForContainer', () => {
    it('returns libx264 + aac for mp4', () => {
      const result = getCodecForContainer('mp4');
      expect(result.video).toBe('libx264');
      expect(result.audio).toBe('aac');
    });

    it('returns libx264 + aac for mov', () => {
      const result = getCodecForContainer('mov');
      expect(result.video).toBe('libx264');
      expect(result.audio).toBe('aac');
    });

    it('returns libx264 + aac for mkv', () => {
      const result = getCodecForContainer('mkv');
      expect(result.video).toBe('libx264');
      expect(result.audio).toBe('aac');
    });

    it('returns libvpx-vp9 + libopus for webm', () => {
      const result = getCodecForContainer('webm');
      expect(result.video).toBe('libvpx-vp9');
      expect(result.audio).toBe('libopus');
    });

    it('returns libx264 + libmp3lame for avi', () => {
      const result = getCodecForContainer('avi');
      expect(result.video).toBe('libx264');
      expect(result.audio).toBe('libmp3lame');
    });

    it('returns null video + null audio for gif', () => {
      const result = getCodecForContainer('gif');
      expect(result.video).toBeNull();
      expect(result.audio).toBeNull();
    });

    it('returns null video + libmp3lame for mp3', () => {
      const result = getCodecForContainer('mp3');
      expect(result.video).toBeNull();
      expect(result.audio).toBe('libmp3lame');
    });

    it('returns null video + aac for aac', () => {
      const result = getCodecForContainer('aac');
      expect(result.video).toBeNull();
      expect(result.audio).toBe('aac');
    });

    it('returns null video + pcm_s16le for wav', () => {
      const result = getCodecForContainer('wav');
      expect(result.video).toBeNull();
      expect(result.audio).toBe('pcm_s16le');
    });

    it('returns null video + flac for flac', () => {
      const result = getCodecForContainer('flac');
      expect(result.video).toBeNull();
      expect(result.audio).toBe('flac');
    });

    it('returns null video + libvorbis for ogg', () => {
      const result = getCodecForContainer('ogg');
      expect(result.video).toBeNull();
      expect(result.audio).toBe('libvorbis');
    });

    it('throws for unknown container', () => {
      expect(() => getCodecForContainer('xyz' as never)).toThrow();
    });
  });
});
