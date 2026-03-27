import { useCallback, useRef, useState } from 'react';

interface DropZoneProps {
  onFiles: (paths: string[]) => void;
}

export function DropZone({ onFiles }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
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

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const paths: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if ('path' in file && typeof (file as File & { path: string }).path === 'string') {
          paths.push((file as File & { path: string }).path);
        }
      }
      if (paths.length > 0) {
        onFiles(paths);
      }
    }
  }, [onFiles]);

  const handleBrowse = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const paths: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        if ('path' in file && typeof (file as File & { path: string }).path === 'string') {
          paths.push((file as File & { path: string }).path);
        }
      }
      if (paths.length > 0) {
        onFiles(paths);
      }
    }
    // Reset so the same file can be selected again
    e.target.value = '';
  }, [onFiles]);

  return (
    <div
      className={`dropzone ${isDragging ? 'dropzone--active' : ''}`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        onChange={handleInputChange}
        style={{ display: 'none' }}
      />
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
