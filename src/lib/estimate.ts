import type { PresetName, TrimRange } from '../types/index';
import { getCompressionRatio } from './presets';

export function estimateOutputSize(
  source: { fileSize: number; duration: number },
  preset: PresetName,
  trim: TrimRange | null,
): number {
  const ratio = getCompressionRatio(preset);
  const duration = trim ? trim.end - trim.start : source.duration;
  const durationRatio = source.duration > 0 ? duration / source.duration : 1;
  return Math.round(source.fileSize * ratio * durationRatio);
}

export function estimateAudioSize(duration: number, bitrateKbps: number): number {
  // bitrateKbps * duration (seconds) / 8 = bytes
  return Math.round((bitrateKbps * 1000 * duration) / 8);
}

export function shouldWarnSize(sourceSize: number, estimatedSize: number): boolean {
  return estimatedSize > sourceSize;
}
