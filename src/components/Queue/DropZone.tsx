import { useCallback, useRef } from 'react';

interface DropZoneProps {
  onFilesAdded: (paths: string[]) => void;
}

export function DropZone({ onFilesAdded }: DropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const files = Array.from(e.dataTransfer.files);
      const paths = files.map((f) => (f as File & { path: string }).path).filter(Boolean);
      if (paths.length > 0) onFilesAdded(paths);
    },
    [onFilesAdded],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleBrowse = useCallback(() => {
    inputRef.current?.click();
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      const paths = files.map((f) => (f as File & { path: string }).path).filter(Boolean);
      if (paths.length > 0) onFilesAdded(paths);
      e.target.value = '';
    },
    [onFilesAdded],
  );

  return (
    <div
      className="dropzone"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={handleBrowse}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && handleBrowse()}
    >
      <input
        ref={inputRef}
        type="file"
        multiple
        accept="video/*,audio/*,image/*"
        style={{ display: 'none' }}
        onChange={handleInputChange}
      />
      <div className="dropzone-inner">
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
        <span>Drop files here or click to browse</span>
      </div>
    </div>
  );
}
