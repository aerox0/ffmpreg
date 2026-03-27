import type { PresetName, TrimRange } from '../types/index.js';
import { getCompressionRatio } from './presets.js';

export function estimateOutputSize(
  source: { fileSize: number; duration: number },
  preset: PresetName,
  trim: TrimRange | null,
): number {
  const ratio = getCompressionRatio(preset);
  if (source.duration <= 0) {
    return Math.round(source.fileSize * ratio);
  }
  const trimDuration = trim ? trim.end - trim.start : source.duration;
  const durationFactor = trimDuration / source.duration;
  return Math.round(source.fileSize * ratio * durationFactor);
}

export function estimateAudioSize(duration: number, bitrateKbps: number): number {
  return Math.round(bitrateKbps * 1000 * duration / 8);
}

export function shouldWarnSize(sourceSize: number, estimatedSize: number): boolean {
  return estimatedSize > sourceSize;
}
