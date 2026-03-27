import { useState } from 'react';
import type { QueueItem as QueueItemType, OutputSettings } from '../../types/index';
import { DropZone } from './DropZone';
import { QueueItem } from './QueueItem';

interface QueuePanelProps {
  items: QueueItemType[];
  selectedIds: Set<string>;
  activeItem: QueueItemType | null;
  onAddFiles: (paths: string[]) => void;
  onRemoveItem: (id: string) => void;
  onClearDone: () => void;
  onStartQueue: () => void;
  onCancelItem: (id: string) => void;
  onRetryItem: (id: string) => void;
  onSelectItem: (id: string, multi: boolean) => void;
  onRangeSelect: (id: string) => void;
  onBulkApply: (settings: Partial<OutputSettings>) => void;
}

export function QueuePanel({
  items,
  selectedIds,
  activeItem,
  onAddFiles,
  onRemoveItem,
  onClearDone,
  onStartQueue,
  onCancelItem,
  onRetryItem,
  onSelectItem,
  onRangeSelect,
  onBulkApply,
}: QueuePanelProps) {
  const [bulkFormat, setBulkFormat] = useState('mp4');
  const [showBulkPicker, setShowBulkPicker] = useState(false);

  const hasItems = items.length > 0;
  const hasSelected = selectedIds.size > 0;
  const hasConverting = items.some((i) => i.status === 'converting');
  const hasDone = items.some((i) => i.status === 'done');

  return (
    <div className="queue-panel">
      <div className="queue-header">
        <h2>Queue</h2>
        {hasSelected && (
          <button
            className="bulk-apply-btn"
            onClick={() => setShowBulkPicker(!showBulkPicker)}
          >
            Apply to {selectedIds.size} selected
          </button>
        )}
      </div>

      {showBulkPicker && hasSelected && (
        <div className="bulk-picker">
          <select
            value={bulkFormat}
            onChange={(e) => setBulkFormat(e.target.value)}
          >
            <option value="mp4">MP4</option>
            <option value="mkv">MKV</option>
            <option value="webm">WebM</option>
            <option value="mp3">MP3</option>
            <option value="aac">AAC</option>
            <option value="wav">WAV</option>
          </select>
          <button onClick={() => { onBulkApply({ format: bulkFormat }); setShowBulkPicker(false); }}>
            Apply
          </button>
          <button onClick={() => setShowBulkPicker(false)}>Cancel</button>
        </div>
      )}

      <div className="queue-list">
        {hasItems ? (
          items.map((item) => (
            <QueueItem
              key={item.id}
              item={item}
              isSelected={selectedIds.has(item.id)}
              isActive={activeItem?.id === item.id}
              onSelect={onSelectItem}
              onRangeSelect={onRangeSelect}
              onCancel={onCancelItem}
              onRemove={onRemoveItem}
              onRetry={onRetryItem}
            />
          ))
        ) : (
          <div className="queue-empty">No files in queue</div>
        )}
      </div>

      <DropZone onFilesAdded={onAddFiles} />

      <div className="queue-footer">
        <button
          className="btn-primary"
          onClick={onStartQueue}
          disabled={hasConverting || !hasItems}
        >
          {hasConverting ? 'Converting...' : 'Start All'}
        </button>
        <button
          className="btn-secondary"
          onClick={onClearDone}
          disabled={!hasDone}
        >
          Clear Done
        </button>
      </div>
    </div>
  );
}
