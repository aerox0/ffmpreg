import { useMemo } from 'react';
import {
  PresetName,
  getCompressionRatio,
} from '../../shared/presets';
import styles from './SizeEstimation.module.css';

interface SizeEstimationProps {
  /** Source file size in bytes */
  sourceSize: number;
  /** The currently selected preset */
  preset: PresetName;
  /** Trim duration in seconds (optional, for trim feature) */
  trimDuration?: number;
  /** Full media duration in seconds (optional, for trim feature) */
  fullDuration?: number;
}

/**
 * Format bytes to human-readable size string.
 */
function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  const value = bytes / Math.pow(k, i);
  const unit = units[i];
  
  // Show one decimal place for MB and above, whole numbers for KB and below
  const decimals = i >= 2 ? 1 : 0;
  return `${value.toFixed(decimals)} ${unit}`;
}

/**
 * SizeEstimation component displays estimated output file size and warns
 * when the estimated size exceeds the source file size.
 * 
 * The estimated size is computed as:
 *   source_size * compression_ratio * (trim_duration / full_duration)
 * 
 * Compression ratios:
 * - Compact: 0.25
 * - Good: 0.40
 * - High: 0.65
 * - Custom: 0.40
 * 
 * The "~" prefix indicates this is an estimate, not a guarantee.
 */
export function SizeEstimation({
  sourceSize,
  preset,
  trimDuration,
  fullDuration,
}: SizeEstimationProps) {
  // Compute trim factor if both durations are provided
  const trimFactor = useMemo(() => {
    if (trimDuration !== undefined && fullDuration !== undefined && fullDuration > 0) {
      return trimDuration / fullDuration;
    }
    return 1; // No trim factor if durations not provided
  }, [trimDuration, fullDuration]);

  // Compute estimated size
  const estimatedSize = useMemo(() => {
    const compressionRatio = getCompressionRatio(preset);
    return Math.round(sourceSize * compressionRatio * trimFactor);
  }, [sourceSize, preset, trimFactor]);

  // Determine if output will be larger than source
  const isLargerThanSource = estimatedSize > sourceSize;

  return (
    <div className={styles.sizeEstimation}>
      <div className={styles.estimateRow}>
        <span className={styles.label}>Estimated Size</span>
        <span className={styles.size}>
          ~{formatSize(estimatedSize)}
        </span>
      </div>

      {isLargerThanSource && (
        <div className={styles.warning}>
          <span className={styles.warningIcon}>⚠</span>
          <span className={styles.warningText}>
            Output may be larger than source. Consider a lower quality preset.
          </span>
        </div>
      )}
    </div>
  );
}
