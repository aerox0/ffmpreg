import { describe, it, expect } from 'vitest';
import { getCodecForContainer } from '../../src/lib/codecs.js';

describe('getCodecForContainer', () => {
  it('returns H.264 + AAC for mp4', () => {
    expect(getCodecForContainer('mp4')).toEqual({ video: 'libx264', audio: 'aac' });
  });

  it('returns H.264 + AAC for mov', () => {
    expect(getCodecForContainer('mov')).toEqual({ video: 'libx264', audio: 'aac' });
  });

  it('returns H.264 + AAC for mkv', () => {
    expect(getCodecForContainer('mkv')).toEqual({ video: 'libx264', audio: 'aac' });
  });

  it('returns VP9 + Opus for webm', () => {
    expect(getCodecForContainer('webm')).toEqual({ video: 'libvpx-vp9', audio: 'libopus' });
  });

  it('returns H.264 + MP3 for avi', () => {
    expect(getCodecForContainer('avi')).toEqual({ video: 'libx264', audio: 'libmp3lame' });
  });

  it('returns GIF + null for gif', () => {
    expect(getCodecForContainer('gif')).toEqual({ video: 'gif', audio: null });
  });

  it('returns null + MP3 for mp3', () => {
    expect(getCodecForContainer('mp3')).toEqual({ video: null, audio: 'libmp3lame' });
  });

  it('returns null + AAC for aac', () => {
    expect(getCodecForContainer('aac')).toEqual({ video: null, audio: 'aac' });
  });

  it('returns null + PCM for wav', () => {
    expect(getCodecForContainer('wav')).toEqual({ video: null, audio: 'pcm_s16le' });
  });

  it('returns null + FLAC for flac', () => {
    expect(getCodecForContainer('flac')).toEqual({ video: null, audio: 'flac' });
  });

  it('returns null + Vorbis for ogg', () => {
    expect(getCodecForContainer('ogg')).toEqual({ video: null, audio: 'libvorbis' });
  });

  it('returns nulls for unknown container', () => {
    expect(getCodecForContainer('xyz')).toEqual({ video: null, audio: null });
  });
});
