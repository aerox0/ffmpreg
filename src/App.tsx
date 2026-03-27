import './App.css';
import { QueuePanel } from './components/Queue/QueuePanel';
import { DetailPanel } from './components/Detail/DetailPanel';
import { SettingsModal } from './components/Settings/SettingsModal';
import { ToastContainer } from './components/Queue/ToastContainer';
import { useQueue } from './hooks/useQueue';
import { useSettings } from './hooks/useSettings';
import { useToast } from './hooks/useToast';
import { hasElectronAPI } from './hooks/useIpc';
import { useState, useCallback } from 'react';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

function App() {
  const [showSettings, setShowSettings] = useState(false);

  const { toasts, exiting, addToast, dismissToast } = useToast();

  const handleStatusChange = useCallback((_id: string, status: string, item: { source: { fileName: string; fileSize: number; inputType: 'video' | 'audio' | 'image' }; outputSize?: number | null } | undefined) => {
    if ((status === 'done' || status === 'failed') && item) {
      addToast({
        fileName: item.source.fileName,
        inputType: item.source.inputType,
        status: status as 'done' | 'failed',
        outputSize: item.outputSize ?? undefined,
        sourceSize: item.source.fileSize,
      });
    }
  }, [addToast]);

  const {
    items,
    selectedIds,
    activeItem,
    addFiles,
    removeItem,
    clearDone,
    startQueue,
    cancelItem,
    cancelAll,
    retryItem,
    selectItem,
    rangeSelect,
    bulkApplySettings,
    updateItemSettings,
  } = useQueue(handleStatusChange);

  const { settings, updateSettings, pickOutputDir } = useSettings();

  const handleDelete = useCallback(() => {
    selectedIds.forEach((id) => removeItem(id));
  }, [selectedIds, removeItem]);

  const handleEnter = useCallback(() => {
    if (!items.some(i => i.status === 'converting') && items.length > 0) {
      startQueue();
    }
  }, [items, startQueue]);

  const handleEscape = useCallback(() => {
    selectItem('', false);
  }, [selectItem]);

  const handleArrowDown = useCallback(() => {
    const idx = items.findIndex(i => i.id === activeItem?.id);
    if (idx < items.length - 1) {
      selectItem(items[idx + 1].id, false);
    }
  }, [items, activeItem, selectItem]);

  const handleArrowUp = useCallback(() => {
    const idx = items.findIndex(i => i.id === activeItem?.id);
    if (idx > 0) {
      selectItem(items[idx - 1].id, false);
    }
  }, [items, activeItem, selectItem]);

  const handleSelectAll = useCallback(() => {
    items.forEach((item) => selectItem(item.id, true));
  }, [items, selectItem]);

  useKeyboardShortcuts({
    onDelete: handleDelete,
    onEnter: handleEnter,
    onEscape: handleEscape,
    onArrowUp: handleArrowUp,
    onArrowDown: handleArrowDown,
    onSelectAll: handleSelectAll,
    enabled: true,
  });

  const handleOpenFolder = useCallback(async () => {
    if (!hasElectronAPI()) return;
    const settingsData = await window.electronAPI!.getSettings() as { outputDir: string | null };
    if (settingsData.outputDir) {
      window.electronAPI!.shellOpenFolder(settingsData.outputDir);
    }
  }, []);

  const total = items.filter(i => ['queued', 'converting', 'done'].includes(i.status)).length;
  const done = items.filter(i => i.status === 'done').length;
  const activeConverting = items.find(i => i.status === 'converting');
  const progressPct = total > 0 ? (done / total) * 100 : 0;

  return (
    <div className="app">
      <div className="app-header">
        <div className="app-title">ffmpreg</div>
        {total > 0 && (
          <div className="header-progress">
            <span className="header-progress-label">
              {done} / {total}
              {activeConverting && <span className="header-active-dot" />}
            </span>
            {activeConverting && (
              <span className="header-active-name">
                {activeConverting.source.fileName.slice(0, 40)}
              </span>
            )}
          </div>
        )}
        <button className="settings-btn" onClick={() => setShowSettings(true)}>Settings</button>
        {total > 0 && (
          <div className="header-progress-bar">
            <div className="header-progress-fill" style={{ width: `${progressPct}%` }} />
          </div>
        )}
      </div>
      <div className="app-body">
        <QueuePanel
          items={items}
          selectedIds={selectedIds}
          activeItem={activeItem}
          onAddFiles={addFiles}
          onRemoveItem={removeItem}
          onClearDone={clearDone}
          onStartQueue={startQueue}
          onCancelItem={cancelItem}
          onCancelAll={cancelAll}
          onRetryItem={retryItem}
          onSelectItem={selectItem}
          onRangeSelect={rangeSelect}
          onBulkApply={bulkApplySettings}
        />
        <div className="detail-panel">
          {activeItem ? (
            <DetailPanel
              item={activeItem}
              onSettingsChange={(settings) => updateItemSettings(activeItem.id, settings)}
            />
          ) : (
            <div className="detail-placeholder">
              <svg className="detail-placeholder-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                <path d="M2 17l10 5 10-5" />
                <path d="M2 12l10 5 10-5" />
              </svg>
              <p>Select a file from the <strong>queue</strong> to configure conversion settings</p>
            </div>
          )}
        </div>
      </div>

      {showSettings && (
        <SettingsModal
          settings={settings}
          onClose={() => setShowSettings(false)}
          onUpdate={updateSettings}
          onPickDir={pickOutputDir}
        />
      )}

      <ToastContainer
        toasts={toasts}
        exiting={exiting}
        onDismiss={dismissToast}
        onOpenFolder={handleOpenFolder}
      />
    </div>
  );
}

export default App;
