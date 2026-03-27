import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { path as ffprobePath } from 'ffprobe-static';
import type { SourceMeta, MediaStream, InputType } from '../src/types/index';

const execFileAsync = promisify(execFile);

// ---------------------------------------------------------------------------
// ffprobe binary path
// ---------------------------------------------------------------------------

function getFfprobePath(): string {
  if (!ffprobePath) {
    throw new Error('ffprobe-static did not resolve a binary path');
  }
  return ffprobePath;
}

// ---------------------------------------------------------------------------
// Parsing
// ---------------------------------------------------------------------------

function parseFrameRate(rate: string | undefined): number | null {
  if (!rate || rate === '0/0') return null;
  const parts = rate.split('/');
  if (parts.length === 2) {
    const num = Number(parts[0]);
    const den = Number(parts[1]);
    if (den === 0 || !isFinite(num) || !isFinite(den)) return null;
    return num / den;
  }
  const n = Number(rate);
  return isFinite(n) ? n : null;
}

function isVfrStream(stream: Record<string, unknown>): boolean {
  const avgRate = parseFrameRate(stream.avg_frame_rate as string | undefined);
  const rRate = parseFrameRate(stream.r_frame_rate as string | undefined);

  // If both parse and differ by more than 1%, it's VFR
  if (avgRate !== null && rRate !== null && avgRate > 0) {
    const diff = Math.abs(rRate - avgRate) / avgRate;
    if (diff > 0.01) return true;
  }

  return false;
}

function parseStream(raw: Record<string, unknown>): MediaStream {
  const codecType = String(raw.codec_type ?? '');
  const language =
    raw.tags && typeof raw.tags === 'object'
      ? ((raw.tags as Record<string, unknown>).language as string) ?? null
      : null;
  const title =
    raw.tags && typeof raw.tags === 'object'
      ? ((raw.tags as Record<string, unknown>).title as string) ?? null
      : null;

  return {
    index: Number(raw.index ?? 0),
    type: codecType as 'video' | 'audio' | 'subtitle',
    codec: String(raw.codec_name ?? ''),
    language,
    ...(codecType === 'audio'
      ? {
          channels: Number(raw.channels ?? 0),
          sampleRate: Number(raw.sample_rate ?? 0),
        }
      : {}),
    title,
  };
}

/**
 * Parse raw ffprobe JSON output into a SourceMeta object.
 * Exported separately so tests can exercise the parser without running ffprobe.
 */
export function parseFfprobeOutput(
  json: { streams?: unknown[]; format?: Record<string, unknown> } | null | undefined,
  filePath: string,
): SourceMeta {
  if (!json || !json.streams || !Array.isArray(json.streams) || json.streams.length === 0) {
    throw new Error(`ffprobe returned no streams for ${filePath}`);
  }

  const streams = json.streams as Record<string, unknown>[];
  const format = json.format ?? {};

  const videoStreams = streams.filter((s) => s.codec_type === 'video');
  const audioStreams = streams.filter((s) => s.codec_type === 'audio');

  const firstVideo = videoStreams[0];
  const firstAudio = audioStreams[0];

  // Determine inputType
  let inputType: InputType;
  if (videoStreams.length > 0) {
    // If duration is missing/zero it might be an image; check codec heuristic
    const dur = format.duration != null ? parseFloat(String(format.duration)) : 0;
    const isImageCodec =
      firstVideo &&
      ['mjpeg', 'png', 'webp', 'bmp', 'tiff', 'gif'].includes(
        String(firstVideo.codec_name),
      );
    if (isImageCodec && (isNaN(dur) || dur < 1)) {
      inputType = 'image';
    } else {
      inputType = 'video';
    }
  } else if (audioStreams.length > 0) {
    inputType = 'audio';
  } else {
    inputType = 'image'; // fallback
  }

  // Frame rate & VFR detection
  const vfr = firstVideo ? isVfrStream(firstVideo) : false;
  const frameRate = firstVideo ? parseFrameRate(String(firstVideo.avg_frame_rate)) : null;
  const finalFrameRate = vfr ? null : frameRate;

  // Duration — 0 for images
  const rawDuration = format.duration != null ? parseFloat(String(format.duration)) : 0;
  const duration = inputType === 'image' ? 0 : isNaN(rawDuration) ? 0 : rawDuration;

  return {
    path: filePath,
    fileName: path.basename(filePath),
    inputType,
    duration,
    width: firstVideo ? Number(firstVideo.width ?? 0) : 0,
    height: firstVideo ? Number(firstVideo.height ?? 0) : 0,
    videoCodec: firstVideo ? String(firstVideo.codec_name) : null,
    audioCodec: firstAudio ? String(firstAudio.codec_name) : null,
    audioChannels: firstAudio ? Number(firstAudio.channels ?? 0) : 0,
    audioSampleRate: firstAudio ? Number(firstAudio.sample_rate ?? 0) : 0,
    bitrate: format.bit_rate ? parseInt(String(format.bit_rate), 10) : 0,
    fileSize: format.size ? parseInt(String(format.size), 10) : 0,
    frameRate: finalFrameRate,
    isVfr: vfr,
    streams: streams.map(parseStream),
  };
}

// ---------------------------------------------------------------------------
// probeFile — runs ffprobe binary
// ---------------------------------------------------------------------------

/**
 * Probe a media file using ffprobe and return parsed metadata.
 */
export async function probeFile(filePath: string, ffprobeBin?: string): Promise<SourceMeta> {
  const ffprobe = ffprobeBin ?? getFfprobePath();

  const args = [
    '-v', 'quiet',
    '-print_format', 'json',
    '-show_format',
    '-show_streams',
    filePath,
  ];

  let stdout: string;
  try {
    const result = await execFileAsync(ffprobe, args, { maxBuffer: 50 * 1024 * 1024 });
    stdout = result.stdout;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`ffprobe failed for ${filePath}: ${msg}`);
  }

  let json: unknown;
  try {
    json = JSON.parse(stdout);
  } catch {
    throw new Error(`ffprobe returned unparseable output for ${filePath}`);
  }

  return parseFfprobeOutput(
    json as { streams?: unknown[]; format?: Record<string, unknown> } | null,
    filePath,
  );
}
