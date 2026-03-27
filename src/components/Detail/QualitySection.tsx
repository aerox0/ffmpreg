import { useState } from 'react';
import {
  getCrfRange,
  getImageQualityRange,
  getDefaultQuality,
  isQualityGuarded,
} from '../../lib/presets';
import type { PresetName, OutputSettings } from '../../types/index';

interface QualitySectionProps {
  inputType: 'video' | 'audio' | 'image';
  format: string;
  currentPreset: PresetName;
  currentCrf: number;
  currentAudioBitrate: number;
  onChange: (settings: Partial<OutputSettings['quality']>) => void;
}

const PRESETS: { name: PresetName; label: string }[] = [
  { name: 'compact', label: 'Compact' },
  { name: 'good', label: 'Good' },
  { name: 'high', label: 'High' },
  { name: 'custom', label: 'Custom' },
];

export function QualitySection({
  inputType,
  format,
  currentPreset,
  currentCrf,
  currentAudioBitrate,
  onChange,
}: QualitySectionProps) {
  const isImage = inputType === 'image' || ['png', 'jpeg', 'webp'].includes(format);
  const isGif = format === 'gif';
  const crfRange = getCrfRange(currentPreset);
  const [localCrf, setLocalCrf] = useState(currentCrf);
  const [localAudio, setLocalAudio] = useState(currentAudioBitrate);

  const handlePresetChange = (preset: PresetName) => {
    const defaults = getDefaultQuality(preset);
    setLocalCrf(defaults.crf);
    setLocalAudio(defaults.audioBitrate);
    onChange({ preset, crf: defaults.crf, audioBitrate: defaults.audioBitrate });
  };

  const handleSliderChange = (crf: number) => {
    const clamped = Math.max(crfRange.min, Math.min(crfRange.max, crf));
    setLocalCrf(clamped);
    if (!isQualityGuarded(currentPreset, clamped)) {
      // Switch to custom when out of guardrail
      onChange({ crf: clamped, preset: 'custom' });
    } else {
      onChange({ crf: clamped });
    }
  };

  if (isImage && format === 'png') {
    return (
      <div className="detail-section">
        <div className="section-label">Quality</div>
        <div className="quality-lossless">Lossless — no quality setting needed</div>
      </div>
    );
  }

  if (isGif) {
    return (
      <div className="detail-section">
        <div className="section-label">Quality</div>
        <div className="preset-buttons">
          {PRESETS.filter((p) => p.name !== 'custom').map((p) => (
            <button
              key={p.name}
              className={`preset-btn ${p.name === currentPreset ? 'active' : ''}`}
              onClick={() => handlePresetChange(p.name)}
            >
              <span>{p.label}</span>
            </button>
          ))}
        </div>
        <div className="quality-note">GIF uses palette-based encoding</div>
      </div>
    );
  }

  const imageRange = isImage ? getImageQualityRange(format, currentPreset) : null;

  return (
    <div className="detail-section">
      <div className="section-label">Quality</div>
      <div className="preset-buttons">
        {PRESETS.map((p) => (
          <button
            key={p.name}
            className={`preset-btn ${p.name === currentPreset ? 'active' : ''}`}
            onClick={() => handlePresetChange(p.name)}
          >
            <span>{p.label}</span>
          </button>
        ))}
      </div>

      {!isImage && (
        <>
          <div className="quality-slider-row">
            <span className="quality-label">CRF: {localCrf}</span>
            <input
              type="range"
              min={crfRange.min}
              max={crfRange.max}
              value={localCrf}
              onChange={(e) => handleSliderChange(Number(e.target.value))}
              className="quality-slider"
            />
            <div className="quality-range-labels">
              <span>Better</span>
              <span>Smaller</span>
            </div>
          </div>
          {!isQualityGuarded(currentPreset, localCrf) && (
            <div className="quality-warning">
              Value outside preset range — using Custom preset
            </div>
          )}
        </>
      )}

      {isImage && imageRange && (
        <div className="quality-slider-row">
          <span className="quality-label">Quality: {localCrf}</span>
          <input
            type="range"
            min={imageRange.min}
            max={imageRange.max}
            value={localCrf}
            onChange={(e) => {
              const v = Number(e.target.value);
              setLocalCrf(v);
              onChange({ crf: v });
            }}
            className="quality-slider"
          />
          <div className="quality-range-labels">
            <span>Smaller</span>
            <span>Better</span>
          </div>
        </div>
      )}

      {inputType !== 'image' && (
        <div className="audio-bitrate-row">
          <span className="quality-label">Audio: {localAudio}kbps</span>
          <input
            type="range"
            min={64}
            max={320}
            step={64}
            value={localAudio}
            onChange={(e) => {
              const v = Number(e.target.value);
              setLocalAudio(v);
              onChange({ audioBitrate: v });
            }}
            className="quality-slider"
          />
        </div>
      )}
    </div>
  );
}
