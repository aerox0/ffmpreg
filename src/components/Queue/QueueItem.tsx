import type { QueueItem as QueueItemType } from '../../types/index';

interface QueueItemProps {
  item: QueueItemType;
  isSelected: boolean;
  isActive: boolean;
  onSelect: (id: string, multi: boolean) => void;
  onRangeSelect: (id: string) => void;
  onCancel: (id: string) => void;
  onRemove: (id: string) => void;
  onRetry: (id: string) => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDuration(seconds: number): string {
  if (seconds === 0) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function QueueItem({
  item,
  isSelected,
  isActive,
  onSelect,
  onRangeSelect,
  onCancel,
  onRemove,
  onRetry,
}: QueueItemProps) {
  const { source, status, progress, error, outputSize } = item;

  const handleClick = (e: React.MouseEvent) => {
    if (e.shiftKey) {
      onRangeSelect(item.id);
    } else {
      onSelect(item.id, e.ctrlKey || e.metaKey);
    }
  };

  const statusLabel: Record<string, string> = {
    analyzing: 'Analyzing...',
    queued: 'Queued',
    converting: `${Math.round(progress)}%`,
    done: 'Done',
    failed: 'Failed',
    cancelled: 'Cancelled',
  };

  const statusClass = `status-badge status-${status}`;

  return (
    <div
      className={`queue-item ${isSelected ? 'selected' : ''} ${isActive ? 'active' : ''}`}
      onClick={handleClick}
      role="listitem"
    >
      <div className="qi-main">
        <div className="qi-icon">
          {source.inputType === 'video' && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4z"/>
            </svg>
          )}
          {source.inputType === 'audio' && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
            </svg>
          )}
          {source.inputType === 'image' && (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
            </svg>
          )}
        </div>

        <div className="qi-info">
          <div className="qi-name" title={source.fileName}>{source.fileName}</div>
          <div className="qi-meta">
            {source.inputType === 'video' && (
              <span>{source.width}x/source.height • {source.videoCodec} • {formatDuration(source.duration)}</span>
            )}
            {source.inputType === 'audio' && (
              <span>{source.audioCodec} • {formatDuration(source.duration)}</span>
            )}
            {source.inputType === 'image' && (
              <span>{source.width}x{source.height}</span>
            )}
          </div>
        </div>

        <div className="qi-right">
          <span className={statusClass}>{statusLabel[status]}</span>
          <button
            className="qi-x"
            onClick={(e) => { e.stopPropagation(); if (status === 'converting') onCancel(item.id); else onRemove(item.id); }}
            title={status === 'converting' ? 'Cancel' : 'Remove'}
          >
            ×
          </button>
        </div>
      </div>

      {status === 'converting' && (
        <div className="qi-progress">
          <div
            className="qi-progress-bar"
            style={{ width: `${progress >= 0 ? progress : 100}%` }}
          />
        </div>
      )}

      {status === 'done' && outputSize !== null && (
        <div className="qi-done-info">
          {formatBytes(source.fileSize)} → {formatBytes(outputSize)}
          {source.fileSize > 0 && (
            <span className="qi-savings">
              {' '}({Math.round((1 - outputSize / source.fileSize) * 100)}% smaller)
            </span>
          )}
        </div>
      )}

      {status === 'failed' && error && (
        <div className="qi-error">{error}</div>
      )}

      {status === 'cancelled' && (
        <div className="qi-actions">
          <button className="qi-retry" onClick={(e) => { e.stopPropagation(); onRetry(item.id); }}>
            Retry
          </button>
        </div>
      )}
    </div>
  );
}
