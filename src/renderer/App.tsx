import { TitleBar } from './components/TitleBar';

export function App() {
  return (
    <div className="app">
      <TitleBar />
      <div className="app-content">
        <aside className="sidebar">
          {/* File queue and drop zone will go here */}
          <div className="sidebar-header">
            <h2>Queue</h2>
          </div>
          <div className="sidebar-content">
            {/* Drop zone placeholder - will be replaced by FileDropZone component */}
            <div className="drop-zone-placeholder">
              <p className="text-muted">Drop files here or click to browse</p>
            </div>
          </div>
        </aside>
        <main className="main-panel">
          {/* Detail view will go here */}
          <div className="detail-placeholder">
            <p className="text-muted">Select a file to see details</p>
          </div>
        </main>
      </div>
    </div>
  );
}
