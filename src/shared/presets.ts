/**
 * Quality presets with bounded CRF ranges and audio bitrate settings.
 */

export type PresetName = 'compact' | 'good' | 'high' | 'custom';

export interface CrfRange {
  min: number;
  max: number;
  default: number;
}

export interface AudioBitrateRange {
  min: number;
  max: number;
  default: number;
}

export interface GifPreset {
  fps: number;
  paletteSize: number;
}

export interface ImageQualityRange {
  min: number;
  max: number;
  default: number;
}

// Video CRF ranges per preset
export const CRF_RANGES: Record<PresetName, CrfRange> = {
  compact: { min: 28, max: 35, default: 31 },
  good: { min: 22, max: 28, default: 25 },
  high: { min: 18, max: 23, default: 20 },
  custom: { min: 18, max: 35, default: 25 },
};

// Audio bitrate ranges per preset (in kbps)
export const AUDIO_BITRATE_RANGES: Record<PresetName, AudioBitrateRange> = {
  compact: { min: 128, max: 128, default: 128 },
  good: { min: 192, max: 192, default: 192 },
  high: { min: 256, max: 256, default: 256 },
  custom: { min: 128, max: 320, default: 192 },
};

// GIF presets (FPS and palette size)
export const GIF_PRESETS: Record<PresetName, GifPreset> = {
  compact: { fps: 10, paletteSize: 128 },
  good: { fps: 15, paletteSize: 256 },
  high: { fps: 24, paletteSize: 256 },
  custom: { fps: 15, paletteSize: 256 },
};

// Image quality ranges (1-100 scale)
export const IMAGE_QUALITY_RANGES: Record<string, Record<PresetName, ImageQualityRange>> = {
  jpeg: {
    compact: { min: 60, max: 70, default: 65 },
    good: { min: 75, max: 85, default: 80 },
    high: { min: 90, max: 95, default: 92 },
    custom: { min: 1, max: 100, default: 80 },
  },
  webp: {
    compact: { min: 60, max: 70, default: 65 },
    good: { min: 75, max: 85, default: 80 },
    high: { min: 90, max: 95, default: 92 },
    custom: { min: 1, max: 100, default: 80 },
  },
  png: {
    // PNG is lossless - no quality slider
    compact: { min: 0, max: 0, default: 0 },
    good: { min: 0, max: 0, default: 0 },
    high: { min: 0, max: 0, default: 0 },
    custom: { min: 0, max: 0, default: 0 },
  },
};

// Compression ratios for size estimation (vs source file size)
export const COMPRESSION_RATIOS: Record<PresetName, number> = {
  compact: 0.25,
  good: 0.40,
  high: 0.65,
  custom: 0.40, // Default to good ratio for custom
};

// Default quality settings per preset
export interface DefaultQuality {
  preset: PresetName;
  crf: number;
  audioBitrate: number;
}

export function getDefaultQuality(preset: PresetName): DefaultQuality {
  return {
    preset,
    crf: CRF_RANGES[preset].default,
    audioBitrate: AUDIO_BITRATE_RANGES[preset].default,
  };
}

export function getCrfRange(preset: PresetName): CrfRange {
  return CRF_RANGES[preset];
}

export function getAudioBitrateRange(preset: PresetName): AudioBitrateRange {
  return AUDIO_BITRATE_RANGES[preset];
}

export function getGifPreset(preset: PresetName): GifPreset {
  return GIF_PRESETS[preset];
}

export function getImageQualityRange(format: string, preset: PresetName): ImageQualityRange {
  const formatLower = format.toLowerCase().replace('.', '');
  return IMAGE_QUALITY_RANGES[formatLower]?.[preset] || { min: 1, max: 100, default: 80 };
}

export function getCompressionRatio(preset: PresetName): number {
  return COMPRESSION_RATIOS[preset];
}

/**
 * Check if a CRF value is within the preset's allowed range.
 * Returns true only if the value is within bounds.
 */
export function isQualityGuarded(preset: PresetName, crf: number): boolean {
  const range = CRF_RANGES[preset];
  return crf >= range.min && crf <= range.max;
}

export type InputType = 'video' | 'audio' | 'image';

// Available output formats per input type
const FORMATS_BY_INPUT: Record<InputType, string[]> = {
  video: ['mp4', 'mov', 'mkv', 'webm', 'avi', 'gif', 'mp3', 'aac', 'wav', 'flac', 'ogg'],
  audio: ['mp3', 'aac', 'wav', 'flac', 'ogg'],
  image: ['png', 'jpeg', 'webp'],
};

export function getAvailableFormats(inputType: InputType): string[] {
  return FORMATS_BY_INPUT[inputType] || [];
}

export function isFormatAvailable(inputType: InputType, format: string): boolean {
  return getAvailableFormats(inputType).includes(format.toLowerCase());
}
