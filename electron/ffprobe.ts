import { spawn } from 'node:child_process';
import type { SourceMeta, MediaStream, InputType } from '../src/types/index';
import path from 'node:path';
import ffmpegStatic from 'ffmpeg-static';
import { existsSync } from 'node:fs';

interface FfprobeStream {
  index: number;
  codec_type: string;
  codec_name: string;
  width?: number;
  height?: number;
  r_frame_rate?: string;
  avg_frame_rate?: string;
  sample_rate?: string;
  channels?: number;
  tags?: Record<string, string>;
}

interface FfprobeFormat {
  filename: string;
  format_name: string;
  duration?: string;
  size?: string;
  bit_rate?: string;
}

interface FfprobeOutput {
  streams: FfprobeStream[];
  format: FfprobeFormat;
}

export function parseFfprobeStream(s: FfprobeStream): MediaStream {
  return {
    index: s.index,
    type: s.codec_type as 'video' | 'audio' | 'subtitle',
    codec: s.codec_name,
    language: s.tags?.language ?? null,
    channels: s.channels,
    sampleRate: s.sample_rate ? parseInt(s.sample_rate, 10) : undefined,
    title: s.tags?.title ?? null,
    width: s.width,
    height: s.height,
  };
}

export function parseFfprobeFormat(
  output: FfprobeOutput,
): Omit<SourceMeta, 'streams'> & { streams: MediaStream[] } {
  const { streams, format } = output;

  const videoStream = streams.find((s) => s.codec_type === 'video');
  const audioStream = streams.find((s) => s.codec_type === 'audio');

  // Determine frame rate and detect VFR
  let frameRate: number | null = null;
  let isVfr = false;
  if (videoStream?.r_frame_rate) {
    const [num, den] = videoStream.r_frame_rate.split('/').map(Number);
    if (den !== 0 && num / den > 0) {
      frameRate = num / den;
    }
    // VFR detection: avg_frame_rate differs significantly from r_frame_rate
    if (videoStream.avg_frame_rate && videoStream.avg_frame_rate !== videoStream.r_frame_rate) {
      isVfr = true;
    }
    // Also check for r_frame_rate = 0/0 which indicates VFR
    if (videoStream.r_frame_rate === '0/0') {
      isVfr = true;
      frameRate = null;
    }
  }

  const duration = format.duration ? parseFloat(format.duration) : 0;
  const fileSize = format.size ? parseInt(format.size, 10) : 0;
  const bitrate = format.bit_rate ? parseInt(format.bit_rate, 10) : 0;

  // Determine input type
  let inputType: InputType = 'video';
  if (streams.every((s) => s.codec_type === 'audio')) {
    inputType = 'audio';
  } else if (duration < 0.5 && streams.some((s) => s.codec_type === 'video')) {
    // Very short duration with a video stream indicates a still image (e.g., JPEG, PNG)
    // rather than a video clip. ffprobe reports ~0.04s for single-frame images.
    inputType = 'image';
  }

  const parsedStreams = streams.map(parseFfprobeStream);

  return {
    path: format.filename,
    fileName: path.basename(format.filename),
    inputType,
    duration,
    width: videoStream?.width ?? 0,
    height: videoStream?.height ?? 0,
    videoCodec: videoStream?.codec_name ?? null,
    audioCodec: audioStream?.codec_name ?? null,
    audioChannels: audioStream?.channels ?? 0,
    audioSampleRate: audioStream?.sample_rate ? parseInt(audioStream.sample_rate, 10) : 0,
    bitrate,
    fileSize,
    frameRate,
    isVfr,
    streams: parsedStreams,
  };
}

export function probeFile(filePath: string): Promise<SourceMeta> {
  return new Promise((resolve, reject) => {
    if (!ffmpegStatic) {
      reject(new Error('ffmpeg-static binary not found'));
      return;
    }

    // In packaged app, extraResources ffmpeg.exe is at process.resourcesPath
    let ffprobePath: string;
    const resourcesFfprobe = process.resourcesPath
      ? path.join(process.resourcesPath, 'ffprobe.exe')
      : null;
    if (resourcesFfprobe && existsSync(resourcesFfprobe)) {
      ffprobePath = resourcesFfprobe;
    } else {
      // Dev mode: use ffprobe from resources/ffmpeg directory
      ffprobePath = path.join(process.cwd(), 'resources', 'ffmpeg', 'ffprobe.exe');
    }

    const args = [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      filePath,
    ];

    const proc = spawn(ffprobePath, args);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (chunk) => { stdout += chunk; });
    proc.stderr.on('data', (chunk) => { stderr += chunk; });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe exited with code ${code}: ${stderr}`));
        return;
      }
      if (!stdout.trim()) {
        reject(new Error(`ffprobe produced no output for ${filePath}`));
        return;
      }
      try {
        const output = JSON.parse(stdout) as FfprobeOutput;
        if (!output.format || !output.streams) {
          throw new Error(`Invalid ffprobe output for ${filePath}`);
        }
        const result = parseFfprobeFormat(output);
        resolve(result as SourceMeta);
      } catch (err) {
        reject(new Error(`Failed to parse ffprobe output: ${err instanceof Error ? err.message : String(err)}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn ffprobe: ${err.message}`));
    });
  });
}
