import type { InputType, PresetName, QualitySettings } from '../types/index.js';

const CRF_RANGES: Record<PresetName, { min: number; max: number }> = {
  compact: { min: 28, max: 35 },
  good: { min: 22, max: 28 },
  high: { min: 18, max: 23 },
  custom: { min: 18, max: 35 },
};

const AUDIO_BITRATES: Record<PresetName, number> = {
  compact: 128,
  good: 192,
  high: 256,
  custom: 192,
};

const AUDIO_BITRATE_RANGES: Record<PresetName, { min: number; max: number }> = {
  compact: { min: 128, max: 128 },
  good: { min: 192, max: 192 },
  high: { min: 256, max: 256 },
  custom: { min: 128, max: 320 },
};

const GIF_PRESETS: Record<PresetName, { fps: number; paletteSize: number }> = {
  compact: { fps: 10, paletteSize: 128 },
  good: { fps: 15, paletteSize: 256 },
  high: { fps: 24, paletteSize: 256 },
  custom: { fps: 15, paletteSize: 256 },
};

const COMPRESSION_RATIOS: Record<PresetName, number> = {
  compact: 0.25,
  good: 0.40,
  high: 0.65,
  custom: 0.40,
};

const IMAGE_QUALITY_RANGES: Record<string, Record<PresetName, { min: number; max: number }>> = {
  jpeg: {
    compact: { min: 60, max: 70 },
    good: { min: 75, max: 85 },
    high: { min: 90, max: 95 },
    custom: { min: 60, max: 95 },
  },
  webp: {
    compact: { min: 60, max: 70 },
    good: { min: 75, max: 85 },
    high: { min: 90, max: 95 },
    custom: { min: 60, max: 95 },
  },
};

const FORMATS_BY_INPUT_TYPE: Record<InputType, string[]> = {
  video: ['mp4', 'mov', 'mkv', 'webm', 'avi', 'gif'],
  audio: ['mp3', 'aac', 'wav', 'flac', 'ogg'],
  image: ['png', 'jpeg', 'webp'],
};

export function getCrfRange(preset: PresetName): { min: number; max: number } {
  return CRF_RANGES[preset];
}

export function getAudioBitrate(preset: PresetName): number {
  return AUDIO_BITRATES[preset];
}

export function getAudioBitrateRange(preset: PresetName): { min: number; max: number } {
  return AUDIO_BITRATE_RANGES[preset];
}

export function getGifPreset(preset: PresetName): { fps: number; paletteSize: number } {
  return GIF_PRESETS[preset];
}

export function getImageQualityRange(
  format: string,
  preset: PresetName,
): { min: number; max: number } | null {
  const formatRanges = IMAGE_QUALITY_RANGES[format];
  if (!formatRanges) return null;
  return formatRanges[preset] ?? null;
}

export function getCompressionRatio(preset: PresetName): number {
  return COMPRESSION_RATIOS[preset];
}

export function getDefaultQuality(preset: PresetName): QualitySettings {
  const crfRange = CRF_RANGES[preset];
  return {
    preset,
    crf: Math.round((crfRange.min + crfRange.max) / 2),
    audioBitrate: AUDIO_BITRATES[preset],
  };
}

export function isQualityGuarded(preset: PresetName, crf: number): boolean {
  if (preset === 'custom') return false;
  const range = CRF_RANGES[preset];
  return crf < range.min || crf > range.max;
}

export function getAvailableFormats(inputType: InputType): string[] {
  return FORMATS_BY_INPUT_TYPE[inputType];
}
