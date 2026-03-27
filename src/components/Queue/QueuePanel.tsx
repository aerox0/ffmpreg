import { useState, useCallback, useMemo } from 'react';
import type { QualitySettings } from '../../types/index';
import type { UseQueueReturn } from '../../hooks/useQueue';
import { getAvailableFormats } from '../../lib/presets';
import { DropZone } from './DropZone';
import { QueueItemRow } from './QueueItemRow';

interface QueuePanelProps {
  queue: UseQueueReturn;
}

const ALL_FORMATS = [...getAvailableFormats('video'), ...getAvailableFormats('audio'), ...getAvailableFormats('image')];
const UNIQUE_FORMATS = [...new Set(ALL_FORMATS)];

export function QueuePanel({ queue }: QueuePanelProps) {
  const {
    items,
    selectedIds,
    addFiles,
    removeItem,
    selectItem,
    selectRange,
    startQueue,
    cancelItem,
    cancelAll,
    retryItem,
    clearDone,
    bulkApplySettings,
  } = queue;

  const [bulkFormat, setBulkFormat] = useState('mp4');

  const hasActiveItems = items.some(i => i.status === 'converting' || i.status === 'queued');
  const hasDoneItems = items.some(i => i.status === 'done');
  const hasMultipleSelected = selectedIds.size > 1;

  const handleAddFiles = useCallback(async (paths: string[]) => {
    await addFiles(paths);
  }, [addFiles]);

  const handleBulkApply = useCallback(async () => {
    const quality: QualitySettings = {
      preset: 'custom',
      crf: 25,
      audioBitrate: 192,
    };
    await bulkApplySettings(bulkFormat, quality);
  }, [bulkFormat, bulkApplySettings]);

  const sortedItems = useMemo(() => {
    // Keep items in insertion order; the IPC returns them in order
    return items;
  }, [items]);

  return (
    <div className="queue-panel">
      <div className="queue-panel__header">
        <h2>Queue</h2>
        <span className="queue-panel__count">{items.length} item{items.length !== 1 ? 's' : ''}</span>
      </div>

      <DropZone onFiles={handleAddFiles} />

      <div className="queue-panel__list">
        {sortedItems.length === 0 ? (
          <div className="queue-panel__empty">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.2, marginBottom: 4 }}>
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="17 8 12 3 7 8" />
              <line x1="12" y1="3" x2="12" y2="15" />
            </svg>
            <p>No files in queue</p>
            <p className="queue-panel__empty-hint">Drop video or audio files above to get started</p>
          </div>
        ) : (
          sortedItems.map(item => (
            <QueueItemRow
              key={item.id}
              item={item}
              selected={selectedIds.has(item.id)}
              onSelect={selectItem}
              onSelectRange={selectRange}
              onRemove={removeItem}
              onCancel={cancelItem}
              onRetry={retryItem}
            />
          ))
        )}
      </div>

      {hasMultipleSelected && (
        <div className="queue-panel__bulk-bar">
          <span className="queue-panel__bulk-count">
            {selectedIds.size} items selected
          </span>
          <select
            className="queue-panel__bulk-select"
            value={bulkFormat}
            onChange={(e) => setBulkFormat(e.target.value)}
          >
            {UNIQUE_FORMATS.map(fmt => (
              <option key={fmt} value={fmt}>
                .{fmt}
              </option>
            ))}
          </select>
          <button className="btn btn--primary btn--sm" onClick={handleBulkApply}>
            Apply
          </button>
        </div>
      )}

      <div className="queue-panel__footer">
        <button
          className="btn btn--primary"
          onClick={startQueue}
          disabled={!hasActiveItems}
        >
          Start All
        </button>
        <div className="queue-panel__footer-right">
          {hasDoneItems && (
            <button className="btn btn--ghost" onClick={clearDone}>
              Clear Done
            </button>
          )}
          {hasActiveItems && (
            <button className="btn btn--danger" onClick={cancelAll}>
              Cancel All
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
