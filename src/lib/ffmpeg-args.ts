import type { QueueItem } from '../types/index.js';
import { getCodecForContainer } from './codecs.js';
import { getCrfRange, getGifPreset, getImageQualityRange } from './presets.js';

/**
 * Hardcoded compatibility allowlist: source codec -> set of containers
 * that accept that codec natively (no transcoding needed).
 */
const COMPATIBLE_CONTAINERS: Record<string, Set<string>> = {
  h264: new Set(['mp4', 'mov', 'mkv', 'avi']),
  aac: new Set(['mp4', 'mov', 'mkv', 'aac']),
  mp3: new Set(['mp3', 'avi', 'mkv']),
  vp9: new Set(['webm']),
  opus: new Set(['webm', 'ogg']),
  vorbis: new Set(['ogg', 'mkv']),
  flac: new Set(['flac', 'mkv']),
  pcm_s16le: new Set(['wav']),
  gif: new Set(['gif']),
};

/**
 * Returns true when transcoding IS required (source codec is NOT directly
 * compatible with the target container).
 */
export function needsTranscode(sourceCodec: string, targetContainer: string): boolean {
  const containers = COMPATIBLE_CONTAINERS[sourceCodec];
  if (!containers) return true;
  return !containers.has(targetContainer);
}

/**
 * Builds an ffmpeg CLI argument array for the given QueueItem.
 *
 * Output-side seeking (-ss/-to after -i) is used for frame-accurate trimming.
 */
/** Format a number as a string, preserving at least one decimal place. */
function fmtTime(n: number): string {
  return Number.isInteger(n) ? `${n}.0` : String(n);
}

/**
 * Extract the container/format hint from a file path extension.
 */
function extFromPath(p: string): string {
  const dot = p.lastIndexOf('.');
  return dot >= 0 ? p.slice(dot + 1).toLowerCase() : '';
}

export function buildFfmpegArgs(item: QueueItem): string[] {
  const { source, settings, outputPath } = item;
  const { format, quality, trim, mode, extractStreamIndex } = settings;
  const { preset, crf, audioBitrate } = quality;
  const sourceFormat = extFromPath(source.path);

  // -- Stream extraction mode ------------------------------------------------
  if (mode === 'extract') {
    return buildExtractArgs(source.path, source.streams, extractStreamIndex, outputPath!);
  }

  // -- GIF (filter-complex two-pass) -----------------------------------------
  if (format === 'gif') {
    return buildGifArgs(source.path, preset, trim, outputPath!);
  }

  // -- Image conversion ------------------------------------------------------
  if (source.inputType === 'image') {
    return buildImageArgs(source.path, format, preset, crf, outputPath!);
  }

  // -- Audio-only conversion -------------------------------------------------
  if (source.inputType === 'audio') {
    return buildAudioArgs(source, format, sourceFormat, preset, audioBitrate, trim, outputPath!);
  }

  // -- Video conversion ------------------------------------------------------
  return buildVideoArgs(source, format, sourceFormat, preset, crf, audioBitrate, trim, outputPath!);
}

// ---------------------------------------------------------------------------
// Internal builders
// ---------------------------------------------------------------------------

function buildExtractArgs(
  sourcePath: string,
  streams: { index: number; type: string }[],
  extractIndex: number | null,
  outputPath: string,
): string[] {
  const args: string[] = ['-i', sourcePath];
  let streamType: string | null = null;

  if (extractIndex !== null && streams.length > 0) {
    const stream = streams[extractIndex];
    if (stream) {
      streamType = stream.type;
      if (stream.type === 'audio') {
        // Determine the audio stream ordinal (nth audio stream)
        const audioOrdinal = streams
          .filter((s) => s.type === 'audio')
          .indexOf(stream);
        args.push('-map', `0:a:${audioOrdinal >= 0 ? audioOrdinal : 0}`);
      } else if (stream.type === 'video') {
        args.push('-map', '0:v:0');
      } else {
        // Generic fallback
        args.push('-map', `0:${extractIndex}`);
      }
    }
  }

  // Use stream-specific copy flag when possible
  if (streamType === 'audio') {
    args.push('-c:a', 'copy');
  } else if (streamType === 'video') {
    args.push('-c', 'copy');
  } else {
    args.push('-c', 'copy');
  }

  args.push(outputPath);
  return args;
}

function buildGifArgs(
  sourcePath: string,
  preset: string,
  trim: { start: number; end: number } | null,
  outputPath: string,
): string[] {
  const { fps, paletteSize } = getGifPreset(preset as 'compact' | 'good' | 'high' | 'custom');

  const args: string[] = ['-i', sourcePath];

  if (trim) {
    args.push('-ss', fmtTime(trim.start), '-to', fmtTime(trim.end));
  }

  const filter = `[0:v] fps=${fps},split [a][b]; [a] palettegen=max_colors=${paletteSize} [p]; [b][p] paletteuse`;
  args.push('-filter_complex', filter, outputPath);

  return args;
}

function buildImageArgs(
  sourcePath: string,
  format: string,
  preset: string,
  crf: number,
  outputPath: string,
): string[] {
  const args: string[] = ['-i', sourcePath];

  // Derive quality value: use the CRF field if set, otherwise midpoint of the range
  let qualityValue = crf;
  const range = getImageQualityRange(format, preset as 'compact' | 'good' | 'high' | 'custom');
  if (range && !qualityValue) {
    qualityValue = Math.round((range.min + range.max) / 2);
  }

  if (qualityValue) {
    args.push('-q:v', String(qualityValue));
  }

  args.push(outputPath);
  return args;
}

function buildAudioArgs(
  source: { path: string; audioCodec: string | null },
  format: string,
  sourceFormat: string,
  preset: string,
  audioBitrate: number,
  trim: { start: number; end: number } | null,
  outputPath: string,
): string[] {
  const args: string[] = ['-i', source.path];

  if (trim) {
    args.push('-ss', fmtTime(trim.start), '-to', fmtTime(trim.end));
  }

  const codecs = getCodecForContainer(format);

  // Stream copy only when changing container but codec is compatible.
  // If format is the same, the user wants a re-encode.
  const isFormatChange = sourceFormat !== format;
  const canCopyAudio = isFormatChange && source.audioCodec && !needsTranscode(source.audioCodec, format);

  if (canCopyAudio) {
    args.push('-c:a', 'copy');
  } else if (codecs.audio) {
    args.push('-c:a', codecs.audio, '-b:a', `${audioBitrate}k`);
  }

  args.push(outputPath);
  return args;
}

function buildVideoArgs(
  source: {
    path: string;
    videoCodec: string | null;
    audioCodec: string | null;
  },
  format: string,
  sourceFormat: string,
  preset: string,
  crf: number,
  audioBitrate: number,
  trim: { start: number; end: number } | null,
  outputPath: string,
): string[] {
  const args: string[] = ['-i', source.path];

  if (trim) {
    args.push('-ss', fmtTime(trim.start), '-to', fmtTime(trim.end));
  }

  const codecs = getCodecForContainer(format);
  const crfRange = getCrfRange(preset as 'compact' | 'good' | 'high' | 'custom');
  const midpointCrf = Math.round((crfRange.min + crfRange.max) / 2);

  // Use provided CRF if non-zero, otherwise fall back to midpoint
  const effectiveCrf = crf || midpointCrf;

  // Stream copy only when changing container but codecs are compatible.
  // If format is the same, the user wants a re-encode (quality change, etc.).
  const isFormatChange = sourceFormat !== format;
  const canCopyVideo = isFormatChange && source.videoCodec && !needsTranscode(source.videoCodec, format);
  const canCopyAudio = isFormatChange && source.audioCodec && !needsTranscode(source.audioCodec, format);

  if (canCopyVideo && canCopyAudio) {
    // Both tracks compatible — simple stream copy
    args.push('-c', 'copy');
  } else {
    // Video codec
    if (canCopyVideo) {
      args.push('-c:v', 'copy');
    } else if (codecs.video) {
      args.push('-c:v', codecs.video, '-crf', String(effectiveCrf));
    }

    // Audio codec
    if (canCopyAudio) {
      args.push('-c:a', 'copy');
    } else if (codecs.audio) {
      args.push('-c:a', codecs.audio, '-b:a', `${audioBitrate}k`);
    }
  }

  args.push(outputPath);
  return args;
}
