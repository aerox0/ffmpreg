import { useCallback } from 'react';
import type { QueueItem as QueueItemType } from '../../types/index';
import { formatBytes, formatSizeComparison } from '../../lib/format';

interface QueueItemProps {
  item: QueueItemType;
  selected: boolean;
  onSelect: (id: string, multi: boolean) => void;
  onSelectRange: (id: string) => void;
  onRemove: (id: string) => void;
  onCancel: (id: string) => void;
  onRetry: (id: string) => void;
}

function getFileExtension(path: string): string {
  const lastDot = path.lastIndexOf('.');
  if (lastDot === -1) return '';
  return path.slice(lastDot + 1).toLowerCase();
}

function StatusBadge({ item }: { item: QueueItemType }) {
  const statusConfig: Record<string, { label: string; className: string; detail?: string }> = {
    analyzing: { label: 'Analyzing', className: 'status-badge--analyzing' },
    queued: { label: 'Queued', className: 'status-badge--queued' },
    converting: {
      label: item.progress >= 0 ? `Converting ${item.progress}%` : 'Converting...',
      className: 'status-badge--converting',
    },
    done: { label: 'Done', className: 'status-badge--done' },
    failed: { label: 'Failed', className: 'status-badge--failed' },
    cancelled: { label: 'Cancelled', className: 'status-badge--cancelled' },
  };

  const config = statusConfig[item.status] ?? { label: item.status, className: '' };

  return (
    <span className={`status-badge ${config.className}`}>
      {config.label}
    </span>
  );
}

function ProgressBar({ item }: { item: QueueItemType }) {
  if (item.status !== 'converting' && item.status !== 'done') return null;

  const isIndeterminate = item.status === 'converting' && item.progress < 0;
  const isDone = item.status === 'done';
  const pct = isDone ? 100 : Math.max(0, item.progress);

  return (
    <div className="progress-bar">
      <div
        className={`progress-bar__fill ${isDone ? 'progress-bar__fill--done' : ''} ${isIndeterminate ? 'progress-bar__fill--indeterminate' : ''}`}
        style={isIndeterminate ? undefined : { width: `${pct}%` }}
      />
    </div>
  );
}

export function QueueItemRow({ item, selected, onSelect, onSelectRange, onRemove, onCancel, onRetry }: QueueItemProps) {
  const handleClick = useCallback((e: React.MouseEvent) => {
    if (e.shiftKey) {
      onSelectRange(item.id);
    } else if (e.metaKey || e.ctrlKey) {
      onSelect(item.id, true);
    } else {
      onSelect(item.id, false);
    }
  }, [item.id, onSelect, onSelectRange]);

  const handleRemove = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onRemove(item.id);
  }, [item.id, onRemove]);

  const handleCancel = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onCancel(item.id);
  }, [item.id, onCancel]);

  const handleRetry = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onRetry(item.id);
  }, [item.id, onRetry]);

  const srcExt = getFileExtension(item.source.fileName);
  const dstExt = item.settings.format;

  return (
    <div
      className={`queue-item ${selected ? 'queue-item--selected' : ''} ${item.status === 'failed' ? 'queue-item--failed' : ''} ${item.status === 'done' ? 'queue-item--done' : ''}`}
      onClick={handleClick}
    >
      <div className="queue-item__info">
        <div className="queue-item__top-row">
          <span className="queue-item__filename" title={item.source.fileName}>
            {item.source.fileName}
          </span>
          <div className="queue-item__actions">
            {item.status === 'converting' && (
              <button className="queue-item__btn queue-item__btn--cancel" onClick={handleCancel} title="Cancel">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
            {item.status === 'failed' && (
              <button className="queue-item__btn queue-item__btn--retry" onClick={handleRetry} title="Retry">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
              </button>
            )}
            {item.status === 'cancelled' && (
              <button className="queue-item__btn queue-item__btn--retry" onClick={handleRetry} title="Retry">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                </svg>
              </button>
            )}
            {(item.status === 'queued' || item.status === 'done' || item.status === 'failed' || item.status === 'cancelled') && (
              <button className="queue-item__btn queue-item__btn--remove" onClick={handleRemove} title="Remove">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            )}
          </div>
        </div>
        <div className="queue-item__meta-row">
          <span className="queue-item__format">
            <span className="queue-item__ext">{srcExt}</span>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
            <span className="queue-item__ext queue-item__ext--target">{dstExt}</span>
          </span>
          <span className="queue-item__size">{formatBytes(item.source.fileSize)}</span>
          <StatusBadge item={item} />
        </div>
        {item.status === 'done' && item.outputSize !== null && item.outputSize > 0 && (
          <div className="queue-item__result-row">
            <span className="queue-item__result-size">{formatBytes(item.source.fileSize)}</span>
            <span className="queue-item__result-arrow">&rarr;</span>
            <span className="queue-item__result-size">{formatBytes(item.outputSize)}</span>
            <span className="queue-item__result-pct">({formatSizeComparison(item.outputSize, item.source.fileSize)})</span>
          </div>
        )}
        {item.status === 'failed' && item.error && (
          <div className="queue-item__error-row" title={item.error}>
            {item.error}
          </div>
        )}
      </div>
      <ProgressBar item={item} />
    </div>
  );
}
