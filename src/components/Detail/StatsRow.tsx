import type { QueueItem } from '../../types/index';
import { estimateOutputSize, shouldWarnSize } from '../../lib/estimate';
import { formatBytes } from '../../lib/format';

interface StatsRowProps {
  item: QueueItem;
}

export function StatsRow({ item }: StatsRowProps) {
  const sourceSize = item.source.fileSize;
  const estimatedSize = estimateOutputSize(
    { fileSize: sourceSize, duration: item.source.duration },
    item.settings.quality.preset,
    item.settings.trim,
  );

  const savingsPct = sourceSize > 0
    ? Math.round((1 - estimatedSize / sourceSize) * 100)
    : 0;

  const showWarning = shouldWarnSize(sourceSize, estimatedSize);

  return (
    <div className="stats-row">
      <div className="stats-row__card">
        <div className="stats-row__card-label">Source</div>
        <div className="stats-row__card-value">{formatBytes(sourceSize)}</div>
      </div>
      <div className="stats-row__card">
        <div className="stats-row__card-label">Estimated</div>
        <div className="stats-row__card-value">~{formatBytes(estimatedSize)}</div>
      </div>
      <div className="stats-row__card">
        <div className="stats-row__card-label">Savings</div>
        <div className={`stats-row__card-value ${showWarning ? 'stats-row__card-value--warn' : ''}`}>
          {savingsPct > 0 ? `${savingsPct}%` : savingsPct < 0 ? `${Math.abs(savingsPct)}% larger` : '0%'}
        </div>
      </div>
      {showWarning && (
        <div className="stats-row__warning">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
          </svg>
          <span>Output may be larger than source. Consider a lower quality preset.</span>
        </div>
      )}
    </div>
  );
}
