import './App.css';
import { useQueue } from './hooks/useQueue';
import { QueuePanel } from './components/Queue/QueuePanel';

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

function DetailPlaceholder() {
  return (
    <div className="detail-panel">
      <div className="detail-panel__placeholder">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.3">
          <rect x="2" y="2" width="20" height="20" rx="2" ry="2" />
          <line x1="9" y1="2" x2="9" y2="22" />
        </svg>
        <p>Select a file to view details</p>
      </div>
    </div>
  );
}

function App() {
  const queue = useQueue();

  return (
    <div className="app">
      <TitleBar />
      <div className="app__body">
        <QueuePanel queue={queue} />
        <DetailPlaceholder />
      </div>
    </div>
  );
}

export default App;
