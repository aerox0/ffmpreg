import { useMemo } from 'react';
import type { SourceMeta, OutputSettings } from '../../types/index';
import { estimateOutputSize, shouldWarnSize } from '../../lib/estimate';

interface StatsRowProps {
  source: SourceMeta;
  settings: OutputSettings;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function StatsRow({ source, settings }: StatsRowProps) {
  const estimatedSize = useMemo(
    () => estimateOutputSize(source, settings.quality.preset, settings.trim),
    [source, settings.quality.preset, settings.trim],
  );

  const warns = shouldWarnSize(source.fileSize, estimatedSize);

  const savings = source.fileSize > 0
    ? Math.round((1 - estimatedSize / source.fileSize) * 100)
    : 0;

  return (
    <div className="detail-section stats-row">
      <div className="stat-card">
        <div className="stat-label">Source</div>
        <div className="stat-value">{formatBytes(source.fileSize)}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Estimated</div>
        <div className="stat-value">~{formatBytes(estimatedSize)}</div>
      </div>
      <div className="stat-card">
        <div className="stat-label">Savings</div>
        <div className={`stat-value ${savings > 0 ? 'stat-positive' : ''}`}>
          {savings > 0 ? `${savings}% smaller` : '—'}
        </div>
      </div>
      {warns && (
        <div className="size-warning">
          Output may be larger than source. Consider a lower quality preset.
        </div>
      )}
    </div>
  );
}
