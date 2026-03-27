import type { QueueItem } from '../types/index';
import { getCodecForContainer } from './codecs';
import { getCrfRange, getGifPreset, getImageQualityRange } from './presets';

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

export function needsTranscode(sourceCodec: string, targetContainer: string): boolean {
  const containers = COMPATIBLE_CONTAINERS[sourceCodec];
  if (!containers) return true;
  return !containers.has(targetContainer);
}

function fmtTime(n: number): string {
  return Number.isInteger(n) ? `${n}.0` : String(n);
}

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
    return buildExtractArgs(source, extractStreamIndex, outputPath!);
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
    return buildAudioArgs(source, format, sourceFormat, audioBitrate, trim, outputPath!);
  }

  // -- Video conversion ------------------------------------------------------
  return buildVideoArgs(source, format, sourceFormat, preset, crf, audioBitrate, trim, outputPath!);
}

// ---------------------------------------------------------------------------
// Internal builders
// ---------------------------------------------------------------------------

function buildExtractArgs(
  source: { path: string; streams: { index: number; type: string; codec: string }[] },
  extractIndex: number | null,
  outputPath: string,
): string[] {
  const args: string[] = ['-i', source.path];

  if (extractIndex !== null && source.streams.length > 0) {
    const stream = source.streams[extractIndex];
    if (stream) {
      if (stream.type === 'audio') {
        const audioOrdinal = source.streams
          .filter((s) => s.type === 'audio')
          .indexOf(stream);
        args.push('-map', `0:a:${audioOrdinal >= 0 ? audioOrdinal : 0}`);
        args.push('-c:a', 'copy');
      } else if (stream.type === 'video') {
        args.push('-map', '0:v:0');
        args.push('-c', 'copy');
      }
    }
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

  const range = getImageQualityRange(format, preset as 'compact' | 'good' | 'high' | 'custom');
  let qualityValue = crf;
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
  audioBitrate: number,
  trim: { start: number; end: number } | null,
  outputPath: string,
): string[] {
  const args: string[] = ['-i', source.path];

  if (trim) {
    args.push('-ss', fmtTime(trim.start), '-to', fmtTime(trim.end));
  }

  const codecs = getCodecForContainer(format);

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
  const effectiveCrf = crf || midpointCrf;

  const isFormatChange = sourceFormat !== format;
  const canCopyVideo = isFormatChange && source.videoCodec && !needsTranscode(source.videoCodec, format);
  const canCopyAudio = isFormatChange && source.audioCodec && !needsTranscode(source.audioCodec, format);

  if (canCopyVideo && canCopyAudio) {
    args.push('-c', 'copy');
  } else {
    if (canCopyVideo) {
      args.push('-c:v', 'copy');
    } else if (codecs.video) {
      args.push('-c:v', codecs.video, '-crf', String(effectiveCrf));
    }

    if (canCopyAudio) {
      args.push('-c:a', 'copy');
    } else if (codecs.audio) {
      args.push('-c:a', codecs.audio, '-b:a', `${audioBitrate}k`);
    }
  }

  args.push(outputPath);
  return args;
}
