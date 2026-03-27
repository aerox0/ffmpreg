import './App.css';
import { QueuePanel } from './components/Queue/QueuePanel';
import { DetailPanel } from './components/Detail/DetailPanel';
import { useQueue } from './hooks/useQueue';

function App() {
  const {
    items,
    selectedIds,
    activeItem,
    addFiles,
    removeItem,
    clearDone,
    startQueue,
    cancelItem,
    retryItem,
    selectItem,
    rangeSelect,
    bulkApplySettings,
    updateItemSettings,
  } = useQueue();

  return (
    <div className="app">
      <div className="app-header">
        <div className="app-title">ffmpreg</div>
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
    </div>
  );
}

export default App;
