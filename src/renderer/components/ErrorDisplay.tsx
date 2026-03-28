import { useCallback } from 'react';
import styles from './ErrorDisplay.module.css';

export type ErrorSeverity = 'error' | 'warning' | 'info';

export interface ErrorDisplayProps {
  /** Error title */
  title: string;
  /** Error message/details */
  message: string;
  /** Severity level for styling */
  severity?: ErrorSeverity;
  /** Whether to show retry button */
  showRetry?: boolean;
  /** Callback when retry is clicked */
  onRetry?: () => void;
  /** Additional CSS class */
  className?: string;
}

/**
 * Get the appropriate icon for the severity level.
 */
function getIcon(severity: ErrorSeverity): string {
  switch (severity) {
    case 'error':
      return '!';
    case 'warning':
      return '⚠';
    case 'info':
      return 'i';
    default:
      return '!';
  }
}

/**
 * ErrorDisplay component shows error states in a consistent way.
 * 
 * Features:
 * - Visual indicator based on severity (error/warning/info)
 * - Clear error title and message
 * - Optional retry button for recoverable errors
 * - Consistent styling across the app
 */
export function ErrorDisplay({
  title,
  message,
  severity = 'error',
  showRetry = false,
  onRetry,
  className = '',
}: ErrorDisplayProps) {
  const handleRetry = useCallback(() => {
    if (onRetry) {
      onRetry();
    }
  }, [onRetry]);

  const icon = getIcon(severity);

  return (
    <div className={`${styles.errorContainer} ${styles[severity]} ${className}`}>
      <div className={styles.iconContainer}>
        <span className={styles.icon}>{icon}</span>
      </div>
      <div className={styles.content}>
        <div className={styles.title}>{title}</div>
        <div className={styles.message}>{message}</div>
      </div>
      {showRetry && onRetry && (
        <button
          className={styles.retryButton}
          onClick={handleRetry}
        >
          Retry
        </button>
      )}
    </div>
  );
}

/**
 * Error types for encoding errors.
 */
export type EncodingErrorType = 
  | 'ffprobe-failed'      // Corrupt or unreadable file
  | 'encode-failed'        // FFmpeg encoding error
  | 'disk-full'           // Out of disk space
  | 'file-not-found'      // Source file missing
  | 'permission-denied'  // Cannot write to output
  | 'unknown';           // Unknown error

/**
 * Get user-friendly error title for encoding errors.
 */
export function getErrorTitle(errorType: EncodingErrorType): string {
  switch (errorType) {
    case 'ffprobe-failed':
      return 'File Cannot Be Read';
    case 'encode-failed':
      return 'Encoding Failed';
    case 'disk-full':
      return 'Out of Disk Space';
    case 'file-not-found':
      return 'File Not Found';
    case 'permission-denied':
      return 'Permission Denied';
    case 'unknown':
    default:
      return 'Error';
  }
}

/**
 * Get user-friendly error message for encoding errors.
 */
export function getErrorMessage(errorType: EncodingErrorType, rawMessage?: string): string {
  switch (errorType) {
    case 'ffprobe-failed':
      return 'The file appears to be corrupt or unreadable. It may be damaged or in an unsupported format.';
    case 'encode-failed':
      return rawMessage || 'The encoding process encountered an error. Please try again.';
    case 'disk-full':
      return 'There is not enough disk space to complete the encoding. Free up some space and try again.';
    case 'file-not-found':
      return 'The source file could not be found. It may have been moved or deleted.';
    case 'permission-denied':
      return 'Cannot write to the output location. Check folder permissions.';
    case 'unknown':
    default:
      return rawMessage || 'An unexpected error occurred. Please try again.';
  }
}

/**
 * Classify an error message into an error type.
 */
export function classifyError(errorMessage?: string): EncodingErrorType {
  if (!errorMessage) return 'unknown';

  const msg = errorMessage.toLowerCase();

  if (msg.includes('ffprobe') || msg.includes('parser') || msg.includes('invalid data')) {
    return 'ffprobe-failed';
  }
  if (msg.includes('disk') || msg.includes('space') || msg.includes('no space')) {
    return 'disk-full';
  }
  if (msg.includes('not found') || msg.includes('enoent') || msg.includes('no such file')) {
    return 'file-not-found';
  }
  if (msg.includes('permission') || msg.includes('eacces') || msg.includes('access denied')) {
    return 'permission-denied';
  }
  if (msg.includes('ffmpeg') || msg.includes('encode') || msg.includes('transcode')) {
    return 'encode-failed';
  }

  return 'unknown';
}
