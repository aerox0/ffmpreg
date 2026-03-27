import { useCallback } from 'react';
import type { QueueItem, PresetName, OutputSettings, QualitySettings } from '../../types/index';
import { getCrfRange, getAudioBitrate, getAudioBitrateRange, getGifPreset, getImageQualityRange } from '../../lib/presets';

interface QualitySectionProps {
  item: QueueItem;
  onSettingsChange: (settings: Partial<OutputSettings>) => void;
}

const PRESETS: PresetName[] = ['compact', 'good', 'high', 'custom'];

const PRESET_LABELS: Record<PresetName, string> = {
  compact: 'Compact',
  good: 'Good',
  high: 'High',
  custom: 'Custom',
};

export function QualitySection({ item, onSettingsChange }: QualitySectionProps) {
  const { settings, source } = item;
  const format = settings.format;
  const quality = settings.quality;
  const preset = quality.preset;

  // Determine the type of controls to show
  const isVideoFormat = ['mp4', 'mov', 'mkv', 'webm', 'avi'].includes(format);
  const isGif = format === 'gif';
  const isImageFormat = ['png', 'jpeg', 'webp'].includes(format);
  const isAudioFormat = ['mp3', 'aac', 'wav', 'flac', 'ogg'].includes(format);

  const isPng = isImageFormat && format === 'png';
  const imageRange = isImageFormat ? getImageQualityRange(format, preset) : null;

  const handlePresetChange = useCallback((newPreset: PresetName) => {
    const crfRange = getCrfRange(newPreset);
    const newCrf = Math.round((crfRange.min + crfRange.max) / 2);
    const newBitrate = getAudioBitrate(newPreset);
    onSettingsChange({
      quality: {
        preset: newPreset,
        crf: newCrf,
        audioBitrate: newBitrate,
      },
    });
  }, [onSettingsChange]);

  const handleCrfChange = useCallback((newCrf: number) => {
    onSettingsChange({
      quality: {
        ...quality,
        crf: newCrf,
      } as QualitySettings,
    });
  }, [onSettingsChange, quality]);

  const handleImageQualityChange = useCallback((newQuality: number) => {
    onSettingsChange({
      quality: {
        ...quality,
        crf: newQuality,
      } as QualitySettings,
    });
  }, [onSettingsChange, quality]);

  const handleAudioBitrateChange = useCallback((newBitrate: number) => {
    onSettingsChange({
      quality: {
        ...quality,
        audioBitrate: newBitrate,
      } as QualitySettings,
    });
  }, [onSettingsChange, quality]);

  // Video CRF slider
  const renderCrfSlider = () => {
    const range = getCrfRange(preset);
    return (
      <div className="quality-section__slider-group">
        <div className="quality-section__slider-header">
          <span className="quality-section__slider-label">CRF</span>
          <span className="quality-section__slider-value">{quality.crf}</span>
        </div>
        <input
          type="range"
          className="quality-section__slider"
          min={range.min}
          max={range.max}
          value={quality.crf}
          onChange={(e) => handleCrfChange(Number(e.target.value))}
        />
        <div className="quality-section__slider-range">
          <span>{range.min}</span>
          <span>{range.max}</span>
        </div>
      </div>
    );
  };

  // GIF preset controls
  const renderGifControls = () => {
    const gifPreset = getGifPreset(preset);
    return (
      <div className="quality-section__gif-info">
        <div className="quality-section__gif-stat">
          <span className="quality-section__gif-stat-label">FPS</span>
          <span className="quality-section__gif-stat-value">{gifPreset.fps}</span>
        </div>
        <div className="quality-section__gif-stat">
          <span className="quality-section__gif-stat-label">Palette</span>
          <span className="quality-section__gif-stat-value">{gifPreset.paletteSize} colors</span>
        </div>
      </div>
    );
  };

  // Image quality slider
  const renderImageSlider = () => {
    if (!imageRange) return null;
    return (
      <div className="quality-section__slider-group">
        <div className="quality-section__slider-header">
          <span className="quality-section__slider-label">Quality</span>
          <span className="quality-section__slider-value">{quality.crf}</span>
        </div>
        <input
          type="range"
          className="quality-section__slider"
          min={imageRange.min}
          max={imageRange.max}
          value={quality.crf}
          onChange={(e) => handleImageQualityChange(Number(e.target.value))}
        />
        <div className="quality-section__slider-range">
          <span>{imageRange.min}</span>
          <span>{imageRange.max}</span>
        </div>
      </div>
    );
  };

  // PNG lossless label
  const renderPngLabel = () => (
    <div className="quality-section__lossless">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
      </svg>
      <span>Lossless</span>
    </div>
  );

  // Audio bitrate display/slider
  const renderAudioControls = () => {
    const bitrate = getAudioBitrate(preset);
    const isCustom = preset === 'custom';

    if (isCustom) {
      const bitrateRange = getAudioBitrateRange('custom');
      return (
        <div className="quality-section__slider-group">
          <div className="quality-section__slider-header">
            <span className="quality-section__slider-label">Audio Bitrate</span>
            <span className="quality-section__slider-value">{quality.audioBitrate} kbps</span>
          </div>
          <input
            type="range"
            className="quality-section__slider"
            min={bitrateRange.min}
            max={bitrateRange.max}
            step={32}
            value={quality.audioBitrate}
            onChange={(e) => handleAudioBitrateChange(Number(e.target.value))}
          />
          <div className="quality-section__slider-range">
            <span>{bitrateRange.min} kbps</span>
            <span>{bitrateRange.max} kbps</span>
          </div>
        </div>
      );
    }

    return (
      <div className="quality-section__audio-bitrate">
        <span className="quality-section__audio-bitrate-label">Audio Bitrate</span>
        <span className="quality-section__audio-bitrate-value">{bitrate} kbps</span>
      </div>
    );
  };

  return (
    <div className="quality-section">
      <div className="quality-section__label">Quality</div>
      <div className="quality-section__presets">
        {PRESETS.map((p) => (
          <button
            key={p}
            className={`quality-section__preset-btn ${p === preset ? 'quality-section__preset-btn--active' : ''}`}
            onClick={() => handlePresetChange(p)}
          >
            {PRESET_LABELS[p]}
          </button>
        ))}
      </div>
      {(isVideoFormat || isGif) && !isGif && renderCrfSlider()}
      {isGif && renderGifControls()}
      {isImageFormat && !isPng && renderImageSlider()}
      {isImageFormat && isPng && renderPngLabel()}
      {isAudioFormat && renderAudioControls()}
    </div>
  );
}
