import { useState, useCallback, DragEvent } from 'react';
import styles from './FileDropZone.module.css';

// Supported file extensions by type
const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.mkv', '.webm', '.avi'];
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.flac', '.ogg', '.aac'];
const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];

const ALL_SUPPORTED_EXTENSIONS = [
  ...VIDEO_EXTENSIONS,
  ...AUDIO_EXTENSIONS,
  ...IMAGE_EXTENSIONS,
];

export type FileType = 'video' | 'audio' | 'image';

interface FileDropZoneProps {
  onFileAdded?: (filePath: string, fileType: FileType) => void;
  onFileRemoved?: () => void;
}

interface LoadedFile {
  path: string;
  name: string;
  type: FileType;
}

export function FileDropZone({ onFileAdded, onFileRemoved }: FileDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [loadedFile, setLoadedFile] = useState<LoadedFile | null>(null);
  const [error, setError] = useState<string | null>(null);

  const getFileType = (filename: string): FileType | null => {
    const ext = filename.toLowerCase().substring(filename.lastIndexOf('.'));
    if (VIDEO_EXTENSIONS.includes(ext)) return 'video';
    if (AUDIO_EXTENSIONS.includes(ext)) return 'audio';
    if (IMAGE_EXTENSIONS.includes(ext)) return 'image';
    return null;
  };

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
    setError(null);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);

    // Get file path from dropped files - Electron provides path property on dropped files
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    const file = files[0] as File & { path?: string };
    const fileName = file.name;
    const filePath = file.path;

    if (!filePath) {
      setError('Could not get file path. Please use the click-to-browse method.');
      setLoadedFile(null);
      return;
    }

    const fileType = getFileType(fileName);

    if (!fileType) {
      setError(`Unsupported file format. Supported formats: ${ALL_SUPPORTED_EXTENSIONS.join(', ')}`);
      setLoadedFile(null);
      return;
    }

    setError(null);
    setLoadedFile({
      path: filePath,
      name: fileName,
      type: fileType,
    });

    onFileAdded?.(filePath, fileType);
  }, [onFileAdded]);

  const handleClick = useCallback(async () => {
    if (loadedFile) return; // Don't open dialog if file is loaded

    try {
      const result = await window.electronAPI.showOpenDialog({
        properties: ['openFile'],
        filters: [
          { name: 'Media Files', extensions: ['mp4', 'mov', 'mkv', 'webm', 'avi', 'gif', 'mp3', 'wav', 'flac', 'ogg', 'aac', 'png', 'jpg', 'jpeg', 'webp'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return;
      }

      const filePath = result.filePaths[0];
      const fileName = filePath.split('/').pop() || filePath.split('\\').pop() || filePath;
      const fileType = getFileType(fileName);

      if (!fileType) {
        setError(`Unsupported file format. Supported formats: ${ALL_SUPPORTED_EXTENSIONS.join(', ')}`);
        setLoadedFile(null);
        return;
      }

      setError(null);
      setLoadedFile({
        path: filePath,
        name: fileName,
        type: fileType,
      });

      onFileAdded?.(filePath, fileType);
    } catch {
      setError('Failed to open file dialog. Please try again.');
      setLoadedFile(null);
    }
  }, [loadedFile, onFileAdded]);

  const handleRemove = useCallback(() => {
    setLoadedFile(null);
    setError(null);
    onFileRemoved?.();
  }, [onFileRemoved]);

  const getTypeIcon = (type: FileType): string => {
    switch (type) {
      case 'video': return '🎬';
      case 'audio': return '🎵';
      case 'image': return '🖼️';
    }
  };

  // Determine CSS classes
  const dropZoneClasses = [
    styles.dropZone,
    isDragOver ? styles.dragOver : '',
    loadedFile ? styles.hasFile : '',
    error ? styles.error : '',
  ].filter(Boolean).join(' ');

  return (
    <div
      className={dropZoneClasses}
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {error && (
        <div className={styles.errorMessage}>
          <span className={styles.errorIcon}>⚠️</span>
          <span>{error}</span>
          <span className={styles.errorHint}>Click or drop a supported file to try again</span>
        </div>
      )}

      {!loadedFile && !error && (
        <>
          <div className={styles.emptyIcon}>📁</div>
          <div className={styles.emptyText}>Drop files here or click to browse</div>
          <div className={styles.emptyHint}>
            Supports: {ALL_SUPPORTED_EXTENSIONS.join(', ')}
          </div>
        </>
      )}

      {loadedFile && !error && (
        <div className={styles.fileInfo}>
          <span className={`${styles.fileTypeBadge} ${styles[loadedFile.type]}`}>
            {getTypeIcon(loadedFile.type)} {loadedFile.type}
          </span>
          <span className={styles.fileName}>{loadedFile.name}</span>
          <button
            type="button"
            className={styles.removeButton}
            onClick={(e) => {
              e.stopPropagation();
              handleRemove();
            }}
          >
            ✕ Remove
          </button>
        </div>
      )}
    </div>
  );
}
