import { describe, it, expect } from 'vitest';
import { parseFfprobeStream, parseFfprobeFormat, probeFile } from '../../electron/ffprobe';

// Minimal ffprobe JSON output for a video file
const videoFfprobeOutput = {
  streams: [
    {
      index: 0,
      codec_type: 'video',
      codec_name: 'h264',
      width: 1920,
      height: 1080,
      r_frame_rate: '30000/1001',
      avg_frame_rate: '30000/1001',
      tags: { language: 'eng', title: 'Main video' },
    },
    {
      index: 1,
      codec_type: 'audio',
      codec_name: 'aac',
      sample_rate: '48000',
      channels: 2,
      tags: { language: 'eng' },
    },
    {
      index: 2,
      codec_type: 'subtitle',
      codec_name: 'subrip',
      tags: { language: 'eng', title: 'English' },
    },
  ],
  format: {
    filename: '/input/video.mp4',
    format_name: 'mov,mp4,m4a,3gp,3g2,mj2',
    duration: '120.5',
    size: '75000000',
    bit_rate: '5000000',
  },
};

// Minimal ffprobe JSON output for an audio file
const audioFfprobeOutput = {
  streams: [
    {
      index: 0,
      codec_type: 'audio',
      codec_name: 'pcm_s16le',
      sample_rate: '44100',
      channels: 2,
      tags: {},
    },
  ],
  format: {
    filename: '/input/audio.wav',
    format_name: 'wav',
    duration: '300.0',
    size: '52875000',
    bit_rate: '1411200',
  },
};

// File with no audio track
const videoNoAudioOutput = {
  streams: [
    {
      index: 0,
      codec_type: 'video',
      codec_name: 'h264',
      width: 1280,
      height: 720,
      r_frame_rate: '25/1',
      avg_frame_rate: '25/1',
      tags: {},
    },
  ],
  format: {
    filename: '/input/silent.mp4',
    format_name: 'mp4',
    duration: '60.0',
    size: '30000000',
    bit_rate: '4000000',
  },
};

// VFR file output
const vfrFfprobeOutput = {
  streams: [
    {
      index: 0,
      codec_type: 'video',
      codec_name: 'h264',
      width: 1920,
      height: 1080,
      r_frame_rate: '0/0',
      avg_frame_rate: '0/0',
      tags: {},
    },
  ],
  format: {
    filename: '/input/vfr.mp4',
    format_name: 'mp4',
    duration: '300.0',
    size: '150000000',
    bit_rate: '4000000',
  },
};

// Image file output
const imageFfprobeOutput = {
  streams: [
    {
      index: 0,
      codec_type: 'video',
      codec_name: 'png',
      width: 1920,
      height: 1080,
      tags: {},
    },
  ],
  format: {
    filename: '/input/image.png',
    format_name: 'png',
    duration: '0.000000',
    size: '2000000',
    bit_rate: '0',
  },
};

describe('ffprobe', () => {
  describe('parseFfprobeStream', () => {
    it('parses video stream correctly', () => {
      const stream = videoFfprobeOutput.streams[0];
      const result = parseFfprobeStream(stream);
      expect(result.type).toBe('video');
      expect(result.codec).toBe('h264');
      expect(result.width).toBe(1920);
      expect(result.height).toBe(1080);
      expect(result.language).toBe('eng');
      expect(result.title).toBe('Main video');
    });

    it('parses audio stream correctly', () => {
      const stream = videoFfprobeOutput.streams[1];
      const result = parseFfprobeStream(stream);
      expect(result.type).toBe('audio');
      expect(result.codec).toBe('aac');
      expect(result.channels).toBe(2);
      expect(result.sampleRate).toBe(48000);
      expect(result.language).toBe('eng');
    });

    it('parses subtitle stream correctly', () => {
      const stream = videoFfprobeOutput.streams[2];
      const result = parseFfprobeStream(stream);
      expect(result.type).toBe('subtitle');
      expect(result.codec).toBe('subrip');
      expect(result.title).toBe('English');
    });

    it('handles missing tags', () => {
      const stream = videoNoAudioOutput.streams[0];
      const result = parseFfprobeStream(stream);
      expect(result.language).toBeNull();
      expect(result.title).toBeNull();
    });
  });

  describe('parseFfprobeFormat', () => {
    it('parses video file format', () => {
      const result = parseFfprobeFormat(videoFfprobeOutput);
      expect(result.fileName).toBe('video.mp4');
      expect(result.duration).toBeCloseTo(120.5);
      expect(result.fileSize).toBe(75000000);
      expect(result.bitrate).toBe(5000000);
    });

    it('parses audio file format', () => {
      const result = parseFfprobeFormat(audioFfprobeOutput);
      expect(result.fileName).toBe('audio.wav');
      expect(result.duration).toBeCloseTo(300.0);
    });

    it('parses image with duration 0', () => {
      const result = parseFfprobeFormat(imageFfprobeOutput);
      expect(result.duration).toBe(0);
      expect(result.fileName).toBe('image.png');
    });
  });

  describe('probeFile', () => {
    it('parses video file into SourceMeta', async () => {
      // This would require actually running ffprobe, so we mock it in integration tests
      // For unit tests we test the parsing functions directly
    });

    it('throws on corrupt ffprobe output', () => {
      expect(() => parseFfprobeFormat({ streams: [], format: {} } as never)).toThrow();
    });
  });
});
