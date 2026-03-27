import { describe, it, expect } from 'vitest';
import { parseFfprobeOutput } from '../../electron/ffprobe';

// ---------------------------------------------------------------------------
// Mock ffprobe JSON fixtures
// ---------------------------------------------------------------------------

/** Typical MP4 with H.264 video + AAC audio */
const MOCK_VIDEO_MP4 = {
  streams: [
    {
      index: 0,
      codec_type: 'video',
      codec_name: 'h264',
      codec_tag_string: 'avc1',
      width: 1920,
      height: 1080,
      avg_frame_rate: '30/1',
      r_frame_rate: '30/1',
      tags: { language: 'und' },
    },
    {
      index: 1,
      codec_type: 'audio',
      codec_name: 'aac',
      channels: 2,
      sample_rate: '48000',
      tags: { language: 'eng', title: 'Stereo' },
    },
  ],
  format: {
    filename: '/input/video.mp4',
    duration: '120.5',
    bit_rate: '5000000',
    size: '75312500',
  },
};

/** WAV audio-only file */
const MOCK_AUDIO_WAV = {
  streams: [
    {
      index: 0,
      codec_type: 'audio',
      codec_name: 'pcm_s16le',
      channels: 2,
      sample_rate: '44100',
      tags: { language: 'und' },
    },
  ],
  format: {
    filename: '/input/audio.wav',
    duration: '60.0',
    bit_rate: '1411200',
    size: '10584000',
  },
};

/** Video with no audio track */
const MOCK_VIDEO_NO_AUDIO = {
  streams: [
    {
      index: 0,
      codec_type: 'video',
      codec_name: 'h265',
      codec_tag_string: 'hvc1',
      width: 3840,
      height: 2160,
      avg_frame_rate: '60/1',
      r_frame_rate: '60/1',
      tags: {},
    },
  ],
  format: {
    filename: '/input/silent.mp4',
    duration: '30.0',
    bit_rate: '20000000',
    size: '75000000',
  },
};

/** VFR video (avg_frame_rate differs from r_frame_rate significantly) */
const MOCK_VFR_VIDEO = {
  streams: [
    {
      index: 0,
      codec_type: 'video',
      codec_name: 'h264',
      codec_tag_string: 'avc1',
      width: 1280,
      height: 720,
      avg_frame_rate: '30/1',
      r_frame_rate: '900/1', // wildly different from avg_frame_rate
      tags: {},
    },
    {
      index: 1,
      codec_type: 'audio',
      codec_name: 'aac',
      channels: 2,
      sample_rate: '48000',
      tags: {},
    },
  ],
  format: {
    filename: '/input/vfr.mkv',
    duration: '45.0',
    bit_rate: '3000000',
    size: '16875000',
  },
};

/** Image file */
const MOCK_IMAGE = {
  streams: [
    {
      index: 0,
      codec_type: 'video',
      codec_name: 'mjpeg',
      codec_tag_string: 'jpeg',
      width: 800,
      height: 600,
      avg_frame_rate: '0/0',
      r_frame_rate: '0/0',
      tags: {},
    },
  ],
  format: {
    filename: '/input/photo.jpg',
    duration: null,
    bit_rate: null,
    size: '150000',
  },
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('parseFfprobeOutput', () => {
  it('parses video file (MP4 with H.264 + AAC) into correct SourceMeta', () => {
    const result = parseFfprobeOutput(MOCK_VIDEO_MP4, '/input/video.mp4');

    expect(result.path).toBe('/input/video.mp4');
    expect(result.fileName).toBe('video.mp4');
    expect(result.inputType).toBe('video');
    expect(result.duration).toBeCloseTo(120.5);
    expect(result.width).toBe(1920);
    expect(result.height).toBe(1080);
    expect(result.videoCodec).toBe('h264');
    expect(result.audioCodec).toBe('aac');
    expect(result.audioChannels).toBe(2);
    expect(result.audioSampleRate).toBe(48000);
    expect(result.bitrate).toBe(5_000_000);
    expect(result.fileSize).toBe(75_312_500);
    expect(result.frameRate).toBe(30);
    expect(result.isVfr).toBe(false);
    expect(result.streams).toHaveLength(2);

    // Check stream parsing
    expect(result.streams[0].type).toBe('video');
    expect(result.streams[0].codec).toBe('h264');
    expect(result.streams[0].index).toBe(0);
    expect(result.streams[0].language).toBe('und');

    expect(result.streams[1].type).toBe('audio');
    expect(result.streams[1].codec).toBe('aac');
    expect(result.streams[1].channels).toBe(2);
    expect(result.streams[1].sampleRate).toBe(48000);
    expect(result.streams[1].title).toBe('Stereo');
  });

  it('parses audio-only file (WAV) with inputType "audio" and videoCodec null', () => {
    const result = parseFfprobeOutput(MOCK_AUDIO_WAV, '/input/audio.wav');

    expect(result.inputType).toBe('audio');
    expect(result.videoCodec).toBeNull();
    expect(result.audioCodec).toBe('pcm_s16le');
    expect(result.width).toBe(0);
    expect(result.height).toBe(0);
    expect(result.audioChannels).toBe(2);
    expect(result.audioSampleRate).toBe(44100);
    expect(result.duration).toBeCloseTo(60.0);
    expect(result.frameRate).toBeNull();
    expect(result.isVfr).toBe(false);
    expect(result.streams).toHaveLength(1);
    expect(result.streams[0].type).toBe('audio');
  });

  it('handles video with no audio track', () => {
    const result = parseFfprobeOutput(MOCK_VIDEO_NO_AUDIO, '/input/silent.mp4');

    expect(result.inputType).toBe('video');
    expect(result.videoCodec).toBe('h265');
    expect(result.audioCodec).toBeNull();
    expect(result.audioChannels).toBe(0);
    expect(result.audioSampleRate).toBe(0);
    expect(result.streams).toHaveLength(1);
  });

  it('detects VFR file when r_frame_rate differs from avg_frame_rate', () => {
    const result = parseFfprobeOutput(MOCK_VFR_VIDEO, '/input/vfr.mkv');

    expect(result.isVfr).toBe(true);
    expect(result.frameRate).toBeNull(); // null for VFR
    expect(result.inputType).toBe('video');
  });

  it('parses image with duration 0', () => {
    const result = parseFfprobeOutput(MOCK_IMAGE, '/input/photo.jpg');

    expect(result.inputType).toBe('image');
    expect(result.duration).toBe(0);
    expect(result.width).toBe(800);
    expect(result.height).toBe(600);
    expect(result.videoCodec).toBe('mjpeg');
    expect(result.frameRate).toBeNull();
    expect(result.isVfr).toBe(false);
    expect(result.bitrate).toBe(0);
  });

  it('throws descriptive error on corrupt/empty output', () => {
    expect(() => parseFfprobeOutput(null, '/bad/file.mp4')).toThrow();
    expect(() => parseFfprobeOutput({}, '/bad/file.mp4')).toThrow();
    expect(() => parseFfprobeOutput({ streams: [] }, '/bad/file.mp4')).toThrow();
  });

  it('handles missing format fields gracefully', () => {
    const minimal = {
      streams: [
        {
          index: 0,
          codec_type: 'video',
          codec_name: 'h264',
          width: 640,
          height: 480,
          avg_frame_rate: '24/1',
          r_frame_rate: '24/1',
        },
      ],
      format: {},
    };

    const result = parseFfprobeOutput(minimal, '/input/minimal.mp4');

    expect(result.duration).toBe(0);
    expect(result.bitrate).toBe(0);
    expect(result.fileSize).toBe(0);
    expect(result.inputType).toBe('video');
    expect(result.frameRate).toBe(24);
  });

  it('parses avg_frame_rate fraction correctly (e.g. "24000/1001")', () => {
    const ntsc = {
      streams: [
        {
          index: 0,
          codec_type: 'video',
          codec_name: 'h264',
          width: 1920,
          height: 1080,
          avg_frame_rate: '24000/1001',
          r_frame_rate: '24000/1001',
        },
      ],
      format: { duration: '10.0', size: '1000' },
    };

    const result = parseFfprobeOutput(ntsc, '/input/ntsc.mp4');
    expect(result.frameRate).toBeCloseTo(24000 / 1001, 2);
    expect(result.isVfr).toBe(false);
  });
});
