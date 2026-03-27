import './App.css';
import { QueuePanel } from './components/Queue/QueuePanel';
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
            <div className="detail-placeholder">
              <p>Select output format and quality for <strong>{activeItem.source.fileName}</strong></p>
            </div>
          ) : (
            <div className="detail-empty">
              <p>Select a file from the queue to configure conversion settings</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default App;
