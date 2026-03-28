import { useState, useEffect, useCallback } from 'react';
import { TitleBar } from './components/TitleBar';
import { FileDropZone, FileType } from './components/FileDropZone';
import { FormatSelector } from './components/FormatSelector';
import { QualityPreset } from './components/QualityPreset';
import { SizeEstimation } from './components/SizeEstimation';
import { PresetName } from '../shared/presets';

interface QueueItemData {
  id: string;
  sourcePath: string;
  targetFormat: string;
  status: string;
  preset: PresetName;
  crf: number;
  audioBitrate: number;
  metadata?: {
    inputType: FileType;
    size: number;
  };
}

export function App() {
  const [, setQueueItems] = useState<QueueItemData[]>([]);
  const [, setSelectedItemId] = useState<string | null>(null);
  const [currentItem, setCurrentItem] = useState<QueueItemData | null>(null);

  // Listen for queue state changes
  useEffect(() => {
    const cleanup = window.electronAPI.onStatusChange((_id, _status) => {
      // Refresh queue state when status changes
      window.electronAPI.getQueueState().then((state: unknown) => {
        const queueState = state as { items: QueueItemData[] };
        setQueueItems(queueState.items || []);
        
        // Update current item if it changed
        if (currentItem && queueState.items) {
          const updated = queueState.items.find((i: QueueItemData) => i.id === currentItem.id);
          if (updated) {
            setCurrentItem(updated);
          }
        }
      });
    });

    return cleanup;
  }, [currentItem]);

  // Fetch initial queue state
  useEffect(() => {
    window.electronAPI.getQueueState().then((state: unknown) => {
      const queueState = state as { items: QueueItemData[] };
      setQueueItems(queueState.items || []);
    });
  }, []);

  const handleFileAdded = useCallback(async (filePath: string, _fileType: FileType) => {
    const result = await window.electronAPI.addFiles([filePath]);
    if (result.success && result.items && result.items.length > 0) {
      const item = result.items[0] as QueueItemData;
      setCurrentItem(item);
      setSelectedItemId(item.id);
      
      // Refresh queue
      const state = await window.electronAPI.getQueueState() as { items: QueueItemData[] };
      setQueueItems(state.items || []);
    }
  }, []);

  const handleFileRemoved = useCallback(() => {
    if (currentItem) {
      window.electronAPI.removeItem(currentItem.id);
      setCurrentItem(null);
      setSelectedItemId(null);
    }
  }, [currentItem]);

  const handleFormatSelect = useCallback(
    async (format: string) => {
      if (currentItem) {
        await window.electronAPI.updateItemSettings(currentItem.id, {
          targetFormat: format,
        });
        // Refresh current item
        const updatedItem = await window.electronAPI.getQueueItem(currentItem.id);
        if (updatedItem) {
          setCurrentItem(updatedItem as QueueItemData);
        }
        // Refresh queue
        const state = await window.electronAPI.getQueueState() as { items: QueueItemData[] };
        setQueueItems(state.items || []);
      }
    },
    [currentItem]
  );

  const handlePresetChange = useCallback(
    async (preset: PresetName) => {
      if (currentItem) {
        await window.electronAPI.updateItemSettings(currentItem.id, {
          preset,
        });
        // Refresh current item
        const updatedItem = await window.electronAPI.getQueueItem(currentItem.id);
        if (updatedItem) {
          setCurrentItem(updatedItem as QueueItemData);
        }
        // Refresh queue
        const state = await window.electronAPI.getQueueState() as { items: QueueItemData[] };
        setQueueItems(state.items || []);
      }
    },
    [currentItem]
  );

  const handleCrfChange = useCallback(
    async (crf: number) => {
      if (currentItem) {
        await window.electronAPI.updateItemSettings(currentItem.id, {
          crf,
        });
        // Refresh current item
        const updatedItem = await window.electronAPI.getQueueItem(currentItem.id);
        if (updatedItem) {
          setCurrentItem(updatedItem as QueueItemData);
        }
        // Refresh queue
        const state = await window.electronAPI.getQueueState() as { items: QueueItemData[] };
        setQueueItems(state.items || []);
      }
    },
    [currentItem]
  );

  const handleAudioBitrateChange = useCallback(
    async (audioBitrate: number) => {
      if (currentItem) {
        await window.electronAPI.updateItemSettings(currentItem.id, {
          audioBitrate,
        });
        // Refresh current item
        const updatedItem = await window.electronAPI.getQueueItem(currentItem.id);
        if (updatedItem) {
          setCurrentItem(updatedItem as QueueItemData);
        }
        // Refresh queue
        const state = await window.electronAPI.getQueueState() as { items: QueueItemData[] };
        setQueueItems(state.items || []);
      }
    },
    [currentItem]
  );

  return (
    <div className="app">
      <TitleBar />
      <div className="app-content">
        <aside className="sidebar">
          <div className="sidebar-header">
            <h2>Queue</h2>
          </div>
          <div className="sidebar-content">
            <FileDropZone
              onFileAdded={handleFileAdded}
              onFileRemoved={handleFileRemoved}
            />
            {/* Queue items list would go here */}
          </div>
        </aside>
        <main className="main-panel">
          {/* Detail view */}
          {currentItem ? (
            <div className="detail-content">
              <div className="detail-header">
                <h3>{currentItem.sourcePath.split('/').pop()}</h3>
                <span className={`status-badge ${currentItem.status}`}>
                  {currentItem.status}
                </span>
              </div>
              {currentItem.metadata?.inputType && (
                <FormatSelector
                  inputType={currentItem.metadata.inputType}
                  selectedFormat={currentItem.targetFormat}
                  onFormatSelect={handleFormatSelect}
                  disabled={currentItem.status === 'converting'}
                />
              )}
              <QualityPreset
                selectedPreset={currentItem.preset}
                crf={currentItem.crf}
                audioBitrate={currentItem.audioBitrate}
                onPresetChange={handlePresetChange}
                onCrfChange={handleCrfChange}
                onAudioBitrateChange={handleAudioBitrateChange}
                disabled={currentItem.status === 'converting'}
              />
              {currentItem.metadata?.size && (
                <SizeEstimation
                  sourceSize={currentItem.metadata.size}
                  preset={currentItem.preset}
                />
              )}
              {/* Encode progress, completion display, etc. will go here */}
            </div>
          ) : (
            <div className="detail-placeholder">
              <p className="text-muted">Select a file to see details</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
