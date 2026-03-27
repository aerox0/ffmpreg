import { useCallback } from 'react';
import './App.css';
import { useQueue } from './hooks/useQueue';
import { useIpc } from './hooks/useIpc';
import { QueuePanel } from './components/Queue/QueuePanel';
import { DetailPanel } from './components/Detail/DetailPanel';
import type { OutputSettings } from './types/index';

function TitleBar() {
  return (
    <div className="title-bar">
      <div className="title-bar__drag">
        <span className="title-bar__title">ffmpreg</span>
      </div>
      <div className="title-bar__controls">
        <button className="title-bar__btn title-bar__btn--minimize" title="Minimize">
          <svg width="10" height="10" viewBox="0 0 10 10">
            <line x1="0" y1="5" x2="10" y2="5" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>
        <button className="title-bar__btn title-bar__btn--maximize" title="Maximize">
          <svg width="10" height="10" viewBox="0 0 10 10">
            <rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" strokeWidth="1" />
          </svg>
        </button>
        <button className="title-bar__btn title-bar__btn--close" title="Close">
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

  const activeItem = queue.activeId
    ? queue.items.find((item) => item.id === queue.activeId) ?? null
    : null;

  const handleDetailSettingsChange = useCallback(
    (id: string, settings: Partial<OutputSettings>) => {
      if (!api) return;
      api.updateItemSettings(id, settings as Record<string, unknown>);
    },
    [api],
  );

  return (
    <div className="app">
      <TitleBar />
      <div className="app__body">
        <QueuePanel queue={queue} />
        <DetailPanel item={activeItem} onSettingsChange={handleDetailSettingsChange} />
      </div>
    </div>
  );
}

export default App;
