/**
 * Format a byte count as a human-readable string (e.g. "1.5 GB").
 */
export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1);
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(1)} ${units[i]}`;
}

/**
 * Format seconds as MM:SS.
 */
export function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/**
 * Format a size comparison between source and output.
 */
export function formatSizeComparison(outputSize: number, sourceSize: number): string {
  if (sourceSize === 0) return '';
  const pct = Math.round(((1 - outputSize / sourceSize) * 100));
  if (pct > 0) return `${pct}% smaller`;
  if (pct < 0) return `${Math.abs(pct)}% larger`;
  return 'same size';
}
