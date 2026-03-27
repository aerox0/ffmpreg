import './App.css';
import { QueuePanel } from './components/Queue/QueuePanel';
import { DetailPanel } from './components/Detail/DetailPanel';
import { SettingsModal } from './components/Settings/SettingsModal';
import { useQueue } from './hooks/useQueue';
import { useSettings } from './hooks/useSettings';
import { useState } from 'react';

function App() {
  const [showSettings, setShowSettings] = useState(false);

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
  } = useQueue();

  const { settings, updateSettings, pickOutputDir } = useSettings();

  return (
    <div className="app">
      <div className="app-header">
        <div className="app-title">ffmpreg</div>
        <button className="settings-btn" onClick={() => setShowSettings(true)}>
          Settings
        </button>
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
            <div className="detail-empty">
              Select a file from the queue to configure conversion settings
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
    </div>
  );
}

export default App;
