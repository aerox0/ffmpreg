import { useState, useRef, useCallback, DragEvent, ChangeEvent } from 'react';
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

// Electron extends File with a path property
interface ElectronFile extends File {
  path: string;
}

export function FileDropZone({ onFileAdded, onFileRemoved }: FileDropZoneProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [loadedFile, setLoadedFile] = useState<LoadedFile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

    const files = Array.from(e.dataTransfer.files) as ElectronFile[];
    if (files.length === 0) return;

    const file = files[0];
    const fileType = getFileType(file.name);

    if (!fileType) {
      setError(`Unsupported file format. Supported formats: ${ALL_SUPPORTED_EXTENSIONS.join(', ')}`);
      setLoadedFile(null);
      return;
    }

    setError(null);
    setLoadedFile({
      path: file.path,
      name: file.name,
      type: fileType,
    });

    onFileAdded?.(file.path, fileType);
  }, [onFileAdded]);

  const handleClick = useCallback(() => {
    if (loadedFile) return; // Don't open dialog if file is loaded
    inputRef.current?.click();
  }, [loadedFile]);

  const handleInputChange = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0] as ElectronFile;
    const fileType = getFileType(file.name);

    if (!fileType) {
      setError(`Unsupported file format. Supported formats: ${ALL_SUPPORTED_EXTENSIONS.join(', ')}`);
      setLoadedFile(null);
      return;
    }

    setError(null);
    setLoadedFile({
      path: file.path,
      name: file.name,
      type: fileType,
    });

    onFileAdded?.(file.path, fileType);

    // Reset input so the same file can be selected again
    e.target.value = '';
  }, [onFileAdded]);

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
      <input
        ref={inputRef}
        type="file"
        accept={ALL_SUPPORTED_EXTENSIONS.join(',')}
        onChange={handleInputChange}
        className={styles.hiddenInput}
      />

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
