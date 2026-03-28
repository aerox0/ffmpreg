/**
 * Build ffmpeg argument list for encoding.
 */

import { getCodecForContainer, isStreamCopyable } from './codecs';
import { getCrfRange, getGifPreset, getImageQualityRange, getAudioBitrateRange } from './presets';

export interface EncodeItem {
  id: string;
  sourcePath: string;
  outputPath: string;
  targetFormat: string;
  trimStart?: number;
  trimEnd?: number;
  preset: 'compact' | 'good' | 'high' | 'custom';
  crf: number;
  audioBitrate: number;
  // Metadata from ffprobe
  duration?: number;
  videoCodec?: string | null;
  audioCodec?: string | null;
  width?: number;
  height?: number;
  frameRate?: number;
  isVfr?: boolean;
  inputType?: 'video' | 'audio' | 'image';
}

export function buildFfmpegArgs(item: EncodeItem): string[] {
  const args: string[] = [];

  // Input file
  args.push('-i', item.sourcePath);

  // Trim settings (-ss before -i for faster seeking, -to for end)
  if (item.trimStart !== undefined && item.trimStart > 0) {
    args.push('-ss', item.trimStart.toString());
  }
  if (item.trimEnd !== undefined && item.trimEnd > 0) {
    args.push('-to', item.trimEnd.toString());
  }

  // Handle different output formats
  const targetLower = item.targetFormat.toLowerCase();

  // Check for image formats
  if (targetLower === 'png' || targetLower === 'jpeg' || targetLower === 'webp') {
    return buildImageArgs(item, args, targetLower);
  }

  // Check for GIF
  if (targetLower === 'gif') {
    return buildGifArgs(item, args);
  }

  // Video/Audio encoding
  const codecs = getCodecForContainer(item.targetFormat);

  // Determine if we can use stream copy
  const canStreamCopy = item.videoCodec && item.audioCodec && 
    isStreamCopyable(item.videoCodec, item.audioCodec, item.targetFormat);

  if (canStreamCopy) {
    // Use stream copy - no re-encoding
    args.push('-c:v', 'copy');
    args.push('-c:a', 'copy');
  } else {
    // Video codec
    if (codecs.video) {
      args.push('-c:v', codecs.video);
      
      // Apply CRF for H.264/VP9
      if (codecs.video === 'libx264' || codecs.video === 'libvpx-vp9') {
        // Ensure CRF is within bounds for the preset
        const crfRange = getCrfRange(item.preset);
        const crf = Math.max(crfRange.min, Math.min(crfRange.max, item.crf));
        args.push('-crf', crf.toString());
        args.push('-preset', 'medium');
      }
    }

    // Audio codec
    if (codecs.audio) {
      args.push('-c:a', codecs.audio);
      
      // Apply audio bitrate for audio codecs that support it
      if (codecs.audio !== 'pcm_s16le' && codecs.audio !== 'flac') {
        const bitrateRange = getAudioBitrateRange(item.preset);
        const bitrate = Math.max(bitrateRange.min, Math.min(bitrateRange.max, item.audioBitrate));
        args.push('-b:a', `${bitrate}k`);
      }
    }
  }

  // Overwrite output file without asking
  args.push('-y');

  // Output path (must be last)
  args.push(item.outputPath);

  return args;
}

function buildImageArgs(item: EncodeItem, args: string[], format: string): string[] {
  // For images, output a single frame
  args.push('-frames:v', '1');

  if (format === 'jpeg' || format === 'webp') {
    const qualityRange = getImageQualityRange(format, item.preset);
    const quality = Math.max(qualityRange.min, Math.min(qualityRange.max, item.crf));
    
    if (format === 'jpeg') {
      args.push('-q:v', quality.toString());
    } else if (format === 'webp') {
      args.push('-quality', quality.toString());
    }
  }

  // PNG is lossless - no quality settings needed

  args.push('-y');
  args.push(item.outputPath);

  return args;
}

function buildGifArgs(item: EncodeItem, args: string[]): string[] {
  const gifPreset = getGifPreset(item.preset);
  
  // For GIF, we use a palette-based approach
  // First pass: generate palette
  args.push('-vf', `fps=${gifPreset.fps},scale=480:-1:flags=lanczos,palettegen=stats_mode=diff`);

  args.push('-y');
  args.push(item.outputPath.replace(/\.gif$/i, '_palette.gif'));

  return args;
}

export function buildGifFinalArgs(item: EncodeItem, palettePath: string): string[] {
  const args: string[] = [];
  const gifPreset = getGifPreset(item.preset);

  // Input file
  args.push('-i', item.sourcePath);

  // Trim settings
  if (item.trimStart !== undefined && item.trimStart > 0) {
    args.push('-ss', item.trimStart.toString());
  }
  if (item.trimEnd !== undefined && item.trimEnd > 0) {
    args.push('-to', item.trimEnd.toString());
  }

  // Apply palette and create GIF
  args.push('-i', palettePath);
  args.push('-filter_complex', `fps=${gifPreset.fps},scale=480:-1:flags=lanczos[x];[x][1:v]paletteuse=dither=bayer:bayer_scale=5`);

  args.push('-y');
  args.push(item.outputPath);

  return args;
}

/**
 * Check if a format is an image format
 */
export function isImageFormat(format: string): boolean {
  const lower = format.toLowerCase();
  return lower === 'png' || lower === 'jpeg' || lower === 'webp';
}

/**
 * Check if a format is GIF
 */
export function isGifFormat(format: string): boolean {
  return format.toLowerCase() === 'gif';
}
