import { useCallback, useState } from 'react';
import { useIpc } from '../../hooks/useIpc';

interface DropZoneProps {
  onFiles: (paths: string[]) => void;
}

export function DropZone({ onFiles }: DropZoneProps) {
  const api = useIpc();
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (!api) return;

    // In Electron with contextIsolation, File.path is not available.
    // Fall back to the native browse dialog.
    const paths = await api.browseFiles();
    if (paths && paths.length > 0) {
      onFiles(paths);
    }
  }, [api, onFiles]);

  const handleBrowse = useCallback(async () => {
    if (!api) return;
    const paths = await api.browseFiles();
    if (paths && paths.length > 0) {
      onFiles(paths);
    }
  }, [api, onFiles]);

  return (
    <div
      className={`dropzone ${isDragging ? 'dropzone--active' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="dropzone__content">
        <div className="dropzone__icon">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </div>
        <span className="dropzone__text">Drop files here</span>
        <button className="dropzone__button" type="button" onClick={handleBrowse}>
          Browse
        </button>
      </div>
    </div>
  );
}
