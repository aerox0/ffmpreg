import { useState, useEffect, useCallback } from 'react';
import styles from './EncodeProgress.module.css';

export type EncodeStatus = 'pending' | 'probing' | 'queued' | 'converting' | 'done' | 'failed' | 'cancelled';

interface EncodeProgressProps {
  /** Current item ID */
  itemId: string | null;
  /** Current encoding status */
  status: EncodeStatus;
  /** Progress percentage (0-100), -1 for indeterminate */
  progress: number;
  /** Source file size in bytes */
  sourceSize?: number;
  /** Output file size in bytes (available after completion) */
  outputSize?: number;
  /** Output file path (available after completion) */
  outputPath?: string;
  /** Error message if failed */
  error?: string;
  /** Whether encoding is disabled (e.g., format not selected) */
  disabled?: boolean;
  /** Callback when Start Encode is clicked */
  onStartEncode: () => void;
  /** Callback when Cancel is clicked */
  onCancel: () => void;
  /** Callback when Retry is clicked */
  onRetry: () => void;
  /** Callback to open the output folder */
  onOpenFolder: (path: string) => void;
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
 * Get the status display text and class.
 */
function getStatusDisplay(status: EncodeStatus, progress: number): { text: string; className: string } {
  switch (status) {
    case 'pending':
      return { text: 'Pending', className: styles.statusPending };
    case 'probing':
      return { text: 'Probing...', className: styles.statusProbing };
    case 'queued':
      return { text: 'Queued', className: styles.statusQueued };
    case 'converting':
      if (progress < 0) {
        return { text: 'Copying...', className: styles.statusConverting };
      }
      return { text: `Converting ${progress}%`, className: styles.statusConverting };
    case 'done':
      return { text: 'Done', className: styles.statusDone };
    case 'failed':
      return { text: 'Failed', className: styles.statusFailed };
    case 'cancelled':
      return { text: 'Cancelled', className: styles.statusCancelled };
    default:
      return { text: status, className: '' };
  }
}

/**
 * EncodeProgress component displays encoding progress, controls, and completion information.
 * 
 * Features:
 * - Start Encode button when item is queued
 * - Progress bar that updates during transcode (at least 1/sec)
 * - Indeterminate progress for stream copy operations
 * - Cancel button that terminates encoding within 2 seconds
 * - Status transitions: queued → converting → done/failed
 * - Completion display with output path and size comparison
 */
export function EncodeProgress({
  itemId,
  status,
  progress,
  sourceSize,
  outputSize,
  outputPath,
  error,
  disabled,
  onStartEncode,
  onCancel,
  onRetry,
  onOpenFolder,
}: EncodeProgressProps) {
  const [displayProgress, setDisplayProgress] = useState(0);
  const isIndeterminate = progress < 0;
  const isConverting = status === 'converting';
  const canStart = status === 'queued' && itemId && !disabled;
  const canCancel = isConverting && itemId;
  const canRetry = (status === 'failed' || status === 'cancelled') && itemId;
  const isComplete = status === 'done';

  // Update display progress with smooth animation
  useEffect(() => {
    if (isIndeterminate) {
      // Don't update display progress for indeterminate state
      return;
    }
    
    // Only update if progress has changed meaningfully
    if (Math.abs(progress - displayProgress) >= 1) {
      setDisplayProgress(progress);
    }
  }, [progress, displayProgress, isIndeterminate]);

  const handleCancel = useCallback(() => {
    if (canCancel) {
      onCancel();
    }
  }, [canCancel, onCancel]);

  const handleRetry = useCallback(() => {
    if (canRetry) {
      onRetry();
    }
  }, [canRetry, onRetry]);

  const statusDisplay = getStatusDisplay(status, progress);

  // Get the filename from the output path
  const outputFilename = outputPath ? outputPath.split('/').pop() : null;
  const outputDir = outputPath ? outputPath.substring(0, outputPath.lastIndexOf('/')) : null;

  return (
    <div className={styles.encodeProgress}>
      <div className={styles.sectionTitle}>Encoding</div>

      {/* Status Badge */}
      <div className={`${styles.statusBadge} ${statusDisplay.className}`}>
        {status === 'converting' && !isIndeterminate && (
          <div className={styles.statusSpinner} />
        )}
        <span>{statusDisplay.text}</span>
      </div>

      {/* Progress Bar */}
      {isConverting && (
        <div className={styles.progressContainer}>
          <div
            className={`${styles.progressBar} ${isIndeterminate ? styles.progressIndeterminate : ''}`}
            role="progressbar"
            aria-valuenow={isIndeterminate ? 0 : displayProgress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            {!isIndeterminate && (
              <div
                className={styles.progressFill}
                style={{ width: `${displayProgress}%` }}
              />
            )}
            {isIndeterminate && <div className={styles.progressPulse} />}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className={styles.buttonGroup}>
        {canStart && (
          <button
            className={styles.startButton}
            onClick={onStartEncode}
            disabled={disabled}
          >
            Start Encode
          </button>
        )}

        {canCancel && (
          <button
            className={styles.cancelButton}
            onClick={handleCancel}
          >
            Cancel
          </button>
        )}

        {canRetry && (
          <button
            className={styles.retryButton}
            onClick={handleRetry}
          >
            Retry
          </button>
        )}
      </div>

      {/* Error Display */}
      {status === 'failed' && error && (
        <div className={styles.errorContainer}>
          <div className={styles.errorIcon}>!</div>
          <div className={styles.errorContent}>
            <div className={styles.errorTitle}>Encoding Failed</div>
            <div className={styles.errorMessage}>{error}</div>
          </div>
        </div>
      )}

      {/* Completion Display */}
      {isComplete && outputPath && (
        <div className={styles.completionContainer}>
          {/* Output Path */}
          <div className={styles.pathSection}>
            <div className={styles.pathLabel}>Output File</div>
            <div className={styles.pathValue}>{outputFilename}</div>
            {outputDir && (
              <button
                className={styles.openFolderButton}
                onClick={() => onOpenFolder(outputDir)}
              >
                Open Folder
              </button>
            )}
          </div>

          {/* Size Comparison */}
          {sourceSize && outputSize && (
            <div className={styles.sizeComparison}>
              <div className={styles.sizeRow}>
                <span className={styles.sizeLabel}>Source</span>
                <span className={styles.sizeValue}>{formatSize(sourceSize)}</span>
              </div>
              <div className={styles.sizeRow}>
                <span className={styles.sizeLabel}>Output</span>
                <span className={styles.sizeValue}>{formatSize(outputSize)}</span>
              </div>
              <div className={styles.sizeRow}>
                <span className={styles.sizeLabel}>Ratio</span>
                <span className={`${styles.sizeValue} ${outputSize !== undefined && sourceSize !== undefined ? (outputSize < sourceSize ? styles.sizeSmaller : outputSize > sourceSize ? styles.sizeLarger : '') : ''}`}>
                  {outputSize !== undefined && sourceSize !== undefined ? (
                    outputSize < sourceSize ? '-' : outputSize > sourceSize ? '+' : ''
                  ) : ''}
                  {outputSize !== undefined && sourceSize !== undefined ? Math.round((Math.abs(outputSize - sourceSize) / sourceSize) * 100) : 0}%
                </span>
              </div>
            </div>
          )}

          {/* Full Path */}
          <div className={styles.fullPathContainer}>
            <span className={styles.fullPathLabel}>Saved to:</span>
            <span className={styles.fullPathValue}>{outputPath}</span>
          </div>
        </div>
      )}

      {/* Cancelled State */}
      {status === 'cancelled' && (
        <div className={styles.cancelledContainer}>
          <span className={styles.cancelledText}>Encoding was cancelled. The output file has been removed.</span>
        </div>
      )}
    </div>
  );
}
