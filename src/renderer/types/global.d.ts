// Electron extends the File interface with a `path` property
interface ElectronFile extends File {
  path: string;
}

interface QueueItem {
  id: string;
  sourcePath: string;
  outputPath: string;
  targetFormat: string;
  status: 'pending' | 'probing' | 'queued' | 'converting' | 'done' | 'failed' | 'cancelled';
  error?: string;
  metadata?: {
    duration: number;
    width?: number;
    height?: number;
    videoCodec: string | null;
    audioCodec: string | null;
    frameRate: number | null;
    isVfr: boolean;
    inputType: 'video' | 'audio' | 'image';
    bitrate?: number;
    size: number;
  };
  preset: 'compact' | 'good' | 'high' | 'custom';
  crf: number;
  audioBitrate: number;
  percent: number;
  outputSize?: number;
}

interface QueueState {
  items: QueueItem[];
  currentItemId: string | null;
  isProcessing: boolean;
}

interface MediaMetadata {
  duration: number;
  width?: number;
  height?: number;
  videoCodec: string | null;
  audioCodec: string | null;
  frameRate: number | null;
  isVfr: boolean;
  inputType: 'video' | 'audio' | 'image';
  bitrate?: number;
  size: number;
}

declare global {
  interface Window {
    electronAPI: {
      // Queue management
      addFiles: (paths: string[]) => Promise<{ success: boolean; items?: QueueItem[]; error?: string }>;
      removeItem: (id: string) => Promise<{ success: boolean }>;
      updateItemSettings: (id: string, settings: Record<string, unknown>) => Promise<{ success: boolean }>;
      startQueue: () => Promise<{ success: boolean }>;
      cancelItem: (id: string) => Promise<{ success: boolean }>;
      cancelAll: () => Promise<{ success: boolean }>;
      retryItem: (id: string) => Promise<{ success: boolean }>;
      getQueueState: () => Promise<QueueState>;
      getQueueItem: (id: string) => Promise<QueueItem | undefined>;
      
      // File operations
      probeFile: (filePath: string) => Promise<{ success: boolean; metadata?: MediaMetadata; error?: string }>;
      
      // Settings
      getSettings: () => Promise<Record<string, unknown>>;
      updateSettings: (settings: Record<string, unknown>) => Promise<{ success: boolean }>;
      
      // Dialogs
      showOpenDialog: (options?: unknown) => Promise<{ canceled: boolean; filePaths: string[] }>;
      shellOpenFolder: (dirPath: string) => Promise<{ success: boolean }>;
      
      // Window controls
      minimizeWindow: () => void;
      maximizeWindow: () => void;
      closeWindow: () => void;
      isMaximized: () => Promise<boolean>;
      
      // Event listeners
      onProgress: (callback: (id: string, percent: number) => void) => () => void;
      onStatusChange: (callback: (id: string, status: string, error?: string) => void) => () => void;
      onMaximizeChange: (callback: (isMaximized: boolean) => void) => () => void;
    };
  }
}

export { ElectronFile, QueueItem, QueueState, MediaMetadata };
