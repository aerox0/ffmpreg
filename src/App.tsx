import { useCallback, useState, useEffect, useRef } from 'react';
import './App.css';
import { useQueue } from './hooks/useQueue';
import { useIpc } from './hooks/useIpc';
import { QueuePanel } from './components/Queue/QueuePanel';
import { DetailPanel } from './components/Detail/DetailPanel';
import { SettingsModal } from './components/Settings/SettingsModal';
import { Toast, useToast } from './components/Toast';
import type { OutputSettings } from './types/index';

function TitleBar({ onSettingsClick }: { onSettingsClick: () => void }) {
  const api = useIpc();

  return (
    <div className="title-bar">
      <div className="title-bar__drag">
        <span className="title-bar__title">ffmpreg</span>
      </div>
      <div className="title-bar__controls">
        <button
          className="title-bar__btn title-bar__btn--settings"
          title="Settings"
          onClick={onSettingsClick}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
        </button>
        <button className="title-bar__btn title-bar__btn--minimize" title="Minimize" onClick={() => api?.minimizeWindow()}>
          <svg width="10" height="10" viewBox="0 0 10 10">
            <line x1="0" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>
        <button className="title-bar__btn title-bar__btn--maximize" title="Maximize" onClick={() => api?.maximizeWindow()}>
          <svg width="10" height="10" viewBox="0 0 10 10">
            <rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>
        <button className="title-bar__btn title-bar__btn--close" title="Close" onClick={() => api?.closeWindow()}>
          <svg width="10" height="10" viewBox="0 0 10 10">
            <line x1="0" y1="0" x2="10" y2="10" stroke="currentColor" strokeWidth="1" />
            <line x1="10" y1="0" x2="0" y2="10" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>
      </div>
    </div>
  );
}

function App() {
  const queue = useQueue();
  const api = useIpc();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { toasts, addToast, removeToast } = useToast();
  const prevStatusRef = useRef<Map<string, string>>(new Map());

  // Monitor status changes for toast notifications
  useEffect(() => {
    const prev = prevStatusRef.current;
    for (const item of queue.items) {
      const prevStatus = prev.get(item.id);
      if (prevStatus && prevStatus !== item.status) {
        if (item.status === 'done') {
          addToast('Conversion complete', 'success');
        } else if (item.status === 'failed') {
          addToast('Conversion failed', 'error');
        }
      }
      prev.set(item.id, item.status);
    }

    // Check if all items are done
    if (queue.items.length > 0) {
      const allDone = queue.items.every(i => i.status === 'done' || i.status === 'failed' || i.status === 'cancelled');
      const anyJustDone = queue.items.some(i => i.status === 'done' && prev.get(i.id) === 'converting');
      if (allDone && anyJustDone) {
        const doneCount = queue.items.filter(i => i.status === 'done').length;
        addToast(`All ${doneCount} item${doneCount !== 1 ? 's' : ''} processed`, 'success');
      }
    }
  }, [queue.items, addToast]);

  const activeItem = queue.activeId
    ? queue.items.find((item) => item.id === queue.activeId) ?? null
    : null;

  const handleDetailSettingsChange = useCallback(
    (id: string, settings: Partial<OutputSettings>) => {
      queue.updateItemSettings(id, settings);
    },
    [queue],
  );

  return (
    <div className="app">
      <TitleBar onSettingsClick={() => setSettingsOpen(true)} />
      <div className="app__body">
        <QueuePanel queue={queue} />
        <DetailPanel item={activeItem} onSettingsChange={handleDetailSettingsChange} />
      </div>
      {settingsOpen && <SettingsModal onClose={() => setSettingsOpen(false)} />}
      <Toast toasts={toasts} onDismiss={removeToast} />
    </div>
  );
}

export default App;
