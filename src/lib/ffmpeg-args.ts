import type { QueueItem } from '../types/index';
import { getCodecForContainer } from './codecs';

export function needsTranscode(sourceCodec: string, targetContainer: string): boolean {
  const target = getCodecForContainer(targetContainer);
  // If source codec matches target codec, copy is possible
  if (sourceCodec === target.video || sourceCodec === target.audio) {
    return false;
  }
  return true;
}

export function buildFfmpegArgs(item: QueueItem): string[] {
  const { source, settings } = item;
  const { format, quality, trim, mode, extractStreamIndex } = settings;
  const args: string[] = [];

  // Input
  args.push('-i', source.path);

  // Stream extraction mode
  if (mode === 'extract' && extractStreamIndex !== null) {
    args.push('-map', `0:${extractStreamIndex}`);
  }

  // Trim
  if (trim) {
    args.push('-ss', String(trim.start), '-to', String(trim.end));
  }

  // Determine codec based on format
  const codecInfo = getCodecForContainer(format);

  // Video codec
  if (codecInfo.video === null) {
    // No video (audio/image format)
  } else if (source.videoCodec && codecInfo.video === source.videoCodec) {
    // Stream copy for matching codec
    args.push('-c:v', 'copy');
  } else {
    args.push('-c:v', codecInfo.video);
    if (format !== 'gif') {
      args.push('-crf', String(quality.crf));
    }
  }

  // Audio codec
  if (codecInfo.audio === null) {
    // No audio
  } else if (source.audioCodec && codecInfo.audio === source.audioCodec && codecInfo.video === null) {
    // Stream copy for matching codec in audio-only formats
    args.push('-c:a', 'copy');
  } else if (codecInfo.audio) {
    args.push('-c:a', codecInfo.audio);
    if (source.inputType !== 'image') {
      args.push('-b:a', `${quality.audioBitrate}k`);
    }
  }

  // GIF special handling: palette-based two-pass
  if (format === 'gif') {
    // For simplicity, we use a single-pass with palette flag
    // Full two-pass would need separate calls
    args.push('-vf', `fps=${15},palettegen=stats_mode=diff`);
  }

  // Image format quality
  if (format === 'jpeg' || format === 'webp') {
    // ffmpeg uses -q:v for image quality (1=worst, 100=best)
    args.push('-q:v', String(quality.crf));
  }

  // Output path — last argument
  const outputExt = format;
  const baseName = source.fileName.replace(/\.[^.]+$/, '');
  const outputPath = `${baseName}.${outputExt}`;
  args.push(outputPath);

  return args;
}
