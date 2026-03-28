import { useCallback } from 'react';
import { ErrorDisplay, classifyError, getErrorTitle, getErrorMessage } from './ErrorDisplay';
import styles from './CompletionDisplay.module.css';

export type CompletionStatus = 'done' | 'failed' | 'cancelled';

interface CompletionDisplayProps {
  /** Current completion status */
  status: CompletionStatus;
  /** Output file path (available after completion) */
  outputPath?: string;
  /** Source file size in bytes */
  sourceSize?: number;
  /** Output file size in bytes (available after completion) */
  outputSize?: number;
  /** Error message if failed */
  error?: string;
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
 * Calculate the size difference percentage.
 */
function calculateSizeRatio(sourceSize: number, outputSize: number): { direction: 'smaller' | 'larger' | 'same'; percentage: number } {
  if (outputSize < sourceSize) {
    return {
      direction: 'smaller',
      percentage: Math.round(((sourceSize - outputSize) / sourceSize) * 100),
    };
  } else if (outputSize > sourceSize) {
    return {
      direction: 'larger',
      percentage: Math.round(((outputSize - sourceSize) / sourceSize) * 100),
    };
  }
  return { direction: 'same', percentage: 0 };
}

/**
 * CompletionDisplay component shows the result after encoding completes.
 * 
 * Features:
 * - Success: output file path (full path), source vs output size comparison
 * - Failure: error message with retry button
 * - Cancelled: informational message
 */
export function CompletionDisplay({
  status,
  outputPath,
  sourceSize,
  outputSize,
  error,
  onRetry,
  onOpenFolder,
}: CompletionDisplayProps) {
  // Get the filename from the output path
  const outputFilename = outputPath ? outputPath.split('/').pop() : null;
  const outputDir = outputPath ? outputPath.substring(0, outputPath.lastIndexOf('/')) : null;

  const handleRetry = useCallback(() => {
    onRetry();
  }, [onRetry]);

  const handleOpenFolder = useCallback(() => {
    if (outputDir) {
      onOpenFolder(outputDir);
    }
  }, [outputDir, onOpenFolder]);

  // Calculate size ratio if we have both sizes
  const sizeRatio = sourceSize && outputSize
    ? calculateSizeRatio(sourceSize, outputSize)
    : null;

  if (status === 'done' && outputPath) {
    return (
      <div className={styles.completionContainer}>
        {/* Output Path */}
        <div className={styles.pathSection}>
          <div className={styles.pathLabel}>Output File</div>
          <div className={styles.pathValue}>{outputFilename}</div>
          {outputDir && (
            <button
              className={styles.openFolderButton}
              onClick={handleOpenFolder}
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
            {sizeRatio && sizeRatio.direction !== 'same' && (
              <div className={styles.sizeRow}>
                <span className={styles.sizeLabel}>Change</span>
                <span className={`${styles.sizeValue} ${styles[`size${sizeRatio.direction.charAt(0).toUpperCase() + sizeRatio.direction.slice(1)}`]}`}>
                  {sizeRatio.direction === 'smaller' ? '-' : '+'}
                  {sizeRatio.percentage}%
                </span>
              </div>
            )}
          </div>
        )}

        {/* Full Path */}
        <div className={styles.fullPathContainer}>
          <span className={styles.fullPathLabel}>Saved to:</span>
          <span className={styles.fullPathValue}>{outputPath}</span>
        </div>
      </div>
    );
  }

  if (status === 'failed' && error) {
    return (
      <ErrorDisplay
        title={getErrorTitle(classifyError(error))}
        message={getErrorMessage(classifyError(error), error)}
        severity="error"
        showRetry={true}
        onRetry={handleRetry}
      />
    );
  }

  if (status === 'cancelled') {
    return (
      <div className={styles.cancelledContainer}>
        <span className={styles.cancelledText}>
          Encoding was cancelled. The output file has been removed.
        </span>
        <button
          className={styles.retryButton}
          onClick={handleRetry}
        >
          Retry
        </button>
      </div>
    );
  }

  return null;
}
