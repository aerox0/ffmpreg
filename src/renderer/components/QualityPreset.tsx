import { useCallback, useMemo, useState, useEffect, MouseEvent, ChangeEvent } from 'react';
import {
  PresetName,
  getCrfRange,
  getAudioBitrateRange,
} from '../../shared/presets';
import styles from './QualityPreset.module.css';

interface QualityPresetProps {
  /** The currently selected preset */
  selectedPreset: PresetName;
  /** The current CRF value */
  crf: number;
  /** The current audio bitrate */
  audioBitrate: number;
  /** Callback when preset is changed */
  onPresetChange?: (preset: PresetName) => void;
  /** Callback when CRF is changed */
  onCrfChange?: (crf: number) => void;
  /** Callback when audio bitrate is changed */
  onAudioBitrateChange?: (bitrate: number) => void;
  /** Whether the controls are disabled */
  disabled?: boolean;
}

interface PresetInfo {
  name: PresetName;
  label: string;
  description: string;
}

const PRESETS: PresetInfo[] = [
  {
    name: 'compact',
    label: 'Compact',
    description: 'Smallest file, lower quality',
  },
  {
    name: 'good',
    label: 'Good',
    description: 'Balanced quality & size',
  },
  {
    name: 'high',
    label: 'High',
    description: 'Best quality, larger size',
  },
  {
    name: 'custom',
    label: 'Custom',
    description: 'Manual CRF control',
  },
];

/**
 * QualityPreset component provides preset selection and quality adjustment controls.
 * 
 * Features:
 * - Preset selector buttons (Compact, Good, High, Custom)
 * - CRF slider with preset-bounded range
 * - Audio bitrate display per preset
 * - Slider snaps to boundaries when dragged beyond preset bounds
 * 
 * Bounds enforcement:
 * - Compact: CRF 28-35
 * - Good: CRF 22-28
 * - High: CRF 18-23
 * - Custom: CRF 18-35
 */
export function QualityPreset({
  selectedPreset,
  crf,
  audioBitrate,
  onPresetChange,
  onCrfChange,
  onAudioBitrateChange,
  disabled = false,
}: QualityPresetProps) {
  // Get current preset's CRF range
  const crfRange = useMemo(() => getCrfRange(selectedPreset), [selectedPreset]);
  const audioRange = useMemo(() => getAudioBitrateRange(selectedPreset), [selectedPreset]);

  // Local state to track slider value (clamped to bounds)
  const [sliderValue, setSliderValue] = useState(crf);

  // Sync local slider value when preset changes (reset to default)
  useEffect(() => {
    const range = getCrfRange(selectedPreset);
    const clampedCrf = Math.min(Math.max(crf, range.min), range.max);
    setSliderValue(clampedCrf);
  }, [selectedPreset, crf]);

  // Handle preset selection
  const handlePresetClick = useCallback(
    (_e: MouseEvent<HTMLButtonElement>, preset: PresetName) => {
      if (!disabled) {
        const range = getCrfRange(preset);
        const defaultCrf = range.default;
        const audioRangeForPreset = getAudioBitrateRange(preset);
        
        onPresetChange?.(preset);
        onCrfChange?.(defaultCrf);
        onAudioBitrateChange?.(audioRangeForPreset.default);
        setSliderValue(defaultCrf);
      }
    },
    [disabled, onPresetChange, onCrfChange, onAudioBitrateChange]
  );

  // Handle CRF slider change
  const handleSliderChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      if (disabled) return;
      
      const value = parseInt(e.target.value, 10);
      const range = getCrfRange(selectedPreset);
      
      // Clamp value to preset bounds
      const clampedValue = Math.min(Math.max(value, range.min), range.max);
      
      setSliderValue(clampedValue);
      onCrfChange?.(clampedValue);
    },
    [disabled, selectedPreset, onCrfChange]
  );

  // Handle slider mouse up (ensure final value is clamped)
  const handleSliderMouseUp = useCallback(
    (_e: MouseEvent<HTMLInputElement>) => {
      if (disabled) return;
      
      const range = getCrfRange(selectedPreset);
      const clampedValue = Math.min(Math.max(sliderValue, range.min), range.max);
      
      if (clampedValue !== sliderValue) {
        setSliderValue(clampedValue);
        onCrfChange?.(clampedValue);
      }
    },
    [disabled, selectedPreset, sliderValue, onCrfChange]
  );

  // Handle slider key down (for keyboard accessibility)
  const handleSliderKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (disabled) return;
      
      const range = getCrfRange(selectedPreset);
      let newValue = sliderValue;

      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowDown':
          newValue = Math.max(sliderValue - 1, range.min);
          break;
        case 'ArrowRight':
        case 'ArrowUp':
          newValue = Math.min(sliderValue + 1, range.max);
          break;
        case 'Home':
          newValue = range.min;
          break;
        case 'End':
          newValue = range.max;
          break;
        default:
          return;
      }

      e.preventDefault();
      setSliderValue(newValue);
      onCrfChange?.(newValue);
    },
    [disabled, selectedPreset, sliderValue, onCrfChange]
  );

  return (
    <div className={styles.qualityPreset}>
      {/* Preset Selector */}
      <div className={styles.presetSelector}>
        <span className={styles.sectionTitle}>Quality Preset</span>
        <div className={styles.presetButtons}>
          {PRESETS.map((preset) => {
            const range = getCrfRange(preset.name);
            const isActive = selectedPreset === preset.name;
            return (
              <button
                key={preset.name}
                type="button"
                className={`${styles.presetButton} ${isActive ? styles.active : ''}`}
                data-preset={preset.name}
                onClick={(e) => handlePresetClick(e, preset.name)}
                disabled={disabled}
                aria-pressed={isActive}
                title={`Select ${preset.label} preset (CRF ${range.min}-${range.max})`}
              >
                <span className={styles.presetName}>{preset.label}</span>
                <span className={styles.presetRange}>CRF {range.min}-{range.max}</span>
                <span className={styles.presetDescription}>{preset.description}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* CRF Slider */}
      <div className={styles.crfSection}>
        <div className={styles.crfHeader}>
          <span className={styles.crfLabel}>Quality (CRF)</span>
          <span className={styles.crfValue}>{sliderValue}</span>
        </div>
        <div className={styles.sliderContainer}>
          <input
            type="range"
            className={styles.crfSlider}
            min={crfRange.min}
            max={crfRange.max}
            value={sliderValue}
            onChange={handleSliderChange}
            onMouseUp={handleSliderMouseUp}
            onKeyDown={handleSliderKeyDown}
            disabled={disabled}
            aria-label={`CRF value: ${sliderValue}`}
            aria-valuemin={crfRange.min}
            aria-valuemax={crfRange.max}
            aria-valuenow={sliderValue}
          />
        </div>
        <div className={styles.sliderBounds}>
          <span className={styles.sliderBound}>{crfRange.min} (Smaller)</span>
          <span className={styles.sliderBound}>{crfRange.max} (Larger)</span>
        </div>
      </div>

      {/* Audio Bitrate Display */}
      <div className={styles.audioSection}>
        <div className={styles.audioHeader}>
          <span className={styles.audioLabel}>Audio Bitrate</span>
          <span className={styles.audioValue}>{audioBitrate}kbps</span>
        </div>
        {selectedPreset === 'custom' && (
          <span className={styles.audioNote}>
            Custom preset uses {audioRange.min}-{audioRange.max}kbps range
          </span>
        )}
      </div>
    </div>
  );
}
