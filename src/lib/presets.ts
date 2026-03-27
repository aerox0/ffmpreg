import type { PresetName, QualitySettings, InputType } from '../types/index';

// CRF ranges per preset
const CRF_RANGES: Record<Exclude<PresetName, 'custom'>, { min: number; max: number }> = {
  compact: { min: 28, max: 35 },
  good: { min: 22, max: 28 },
  high: { min: 18, max: 23 },
};

const CUSTOM_CRF_RANGE = { min: 18, max: 35 };

// Audio bitrate ranges per preset (kbps)
const AUDIO_BITRATE_RANGES: Record<PresetName, { min: number; max: number }> = {
  compact: { min: 128, max: 128 },
  good: { min: 192, max: 192 },
  high: { min: 256, max: 256 },
  custom: { min: 128, max: 320 },
};

// GIF preset table
const GIF_PRESETS: Record<Exclude<PresetName, 'custom'>, { fps: number; paletteSize: number }> = {
  compact: { fps: 10, paletteSize: 128 },
  good: { fps: 15, paletteSize: 256 },
  high: { fps: 24, paletteSize: 256 },
};

// Image quality ranges (format → preset → { min, max } | null for lossless)
const IMAGE_QUALITY_RANGES: Record<string, Record<Exclude<PresetName, 'custom'>, { min: number; max: number }>> = {
  jpeg: {
    compact: { min: 60, max: 70 },
    good: { min: 75, max: 85 },
    high: { min: 90, max: 95 },
  },
  webp: {
    compact: { min: 60, max: 70 },
    good: { min: 75, max: 85 },
    high: { min: 90, max: 95 },
  },
};

// Compression ratios vs source
const COMPRESSION_RATIOS: Record<PresetName, number> = {
  compact: 0.25,
  good: 0.40,
  high: 0.65,
  custom: 0.40, // default to good ratio
};

// Default mid-range CRF values for each preset
const DEFAULT_CRF: Record<PresetName, number> = {
  compact: 31, // mid of 28-35
  good: 25,    // mid of 22-28
  high: 20,    // mid of 18-23
  custom: 25,
};

const DEFAULT_AUDIO_BITRATE: Record<PresetName, number> = {
  compact: 128,
  good: 192,
  high: 256,
  custom: 192,
};

export function getCrfRange(preset: PresetName): { min: number; max: number } {
  if (preset === 'custom') return CUSTOM_CRF_RANGE;
  return CRF_RANGES[preset];
}

export function getAudioBitrateRange(preset: PresetName): { min: number; max: number } {
  return AUDIO_BITRATE_RANGES[preset];
}

export function getGifPreset(preset: PresetName): { fps: number; paletteSize: number } {
  if (preset === 'custom') return GIF_PRESETS.good;
  return GIF_PRESETS[preset];
}

export function getImageQualityRange(
  format: string,
  preset: PresetName,
): { min: number; max: number } | null {
  if (preset === 'custom') {
    // Custom uses full range for image formats
    const ranges = IMAGE_QUALITY_RANGES[format];
    if (!ranges) return null;
    return { min: ranges.compact.min, max: ranges.high.max };
  }
  const ranges = IMAGE_QUALITY_RANGES[format];
  if (!ranges) return null;
  const presetKey = preset as Exclude<PresetName, 'custom'>;
  return ranges[presetKey] ?? null;
}

export function getCompressionRatio(preset: PresetName): number {
  return COMPRESSION_RATIOS[preset];
}

export function getDefaultQuality(preset: PresetName): QualitySettings {
  return {
    preset,
    crf: DEFAULT_CRF[preset],
    audioBitrate: DEFAULT_AUDIO_BITRATE[preset],
  };
}

export function isQualityGuarded(preset: PresetName, crf: number): boolean {
  const range = getCrfRange(preset);
  return crf >= range.min && crf <= range.max;
}

export function getAvailableFormats(inputType: InputType): string[] {
  if (inputType === 'video') {
    return ['mp4', 'mov', 'mkv', 'webm', 'avi', 'gif', 'mp3', 'aac', 'wav', 'flac', 'ogg'];
  }
  if (inputType === 'audio') {
    return ['mp3', 'aac', 'wav', 'flac', 'ogg'];
  }
  // image
  return ['png', 'jpeg', 'webp'];
}
