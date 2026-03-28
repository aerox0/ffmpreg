/**
 * Preload script - exposes secure IPC bridge to renderer.
 */

import { contextBridge, ipcRenderer } from 'electron';

// Queue item status type
type QueueItemStatus = 'pending' | 'probing' | 'queued' | 'converting' | 'done' | 'failed' | 'cancelled';

// Queue item interface for renderer
interface QueueItemData {
  id: string;
  sourcePath: string;
  outputPath: string;
  targetFormat: string;
  status: QueueItemStatus;
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
  trimStart?: number;
  trimEnd?: number;
  percent: number;
  outputSize?: number;
}

// Queue state interface
interface QueueState {
  items: QueueItemData[];
  currentItemId: string | null;
  isProcessing: boolean;
}

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Queue management
  addFiles: (paths: string[]): Promise<{ success: boolean; items?: QueueItemData[]; error?: string }> =>
    ipcRenderer.invoke('queue:add-files', paths),

  removeItem: (id: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('queue:remove', id),

  updateItemSettings: (id: string, settings: Record<string, unknown>): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('queue:update-settings', id, settings),

  startQueue: (): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('queue:start'),

  cancelItem: (id: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('queue:cancel', id),

  cancelAll: (): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('queue:cancel-all'),

  retryItem: (id: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('queue:retry', id),

  getQueueState: (): Promise<QueueState> =>
    ipcRenderer.invoke('queue:get-state'),

  getQueueItem: (id: string): Promise<QueueItemData | undefined> =>
    ipcRenderer.invoke('queue:get-item', id),

  // File operations
  probeFile: (filePath: string): Promise<{ success: boolean; metadata?: QueueItemData['metadata']; error?: string }> =>
    ipcRenderer.invoke('file:probe', filePath),

  // Progress listeners
  onProgress: (callback: (id: string, percent: number) => void) => {
    ipcRenderer.on('progress', (_event, id: string, percent: number) => callback(id, percent));
  },

  onStatusChange: (callback: (id: string, status: QueueItemStatus, error?: string) => void) => {
    ipcRenderer.on('status-change', (_event, id: string, status: QueueItemStatus, error?: string) => callback(id, status, error));
  },

  // Remove listeners
  removeProgressListener: () => {
    ipcRenderer.removeAllListeners('progress');
  },

  removeStatusChangeListener: () => {
    ipcRenderer.removeAllListeners('status-change');
  },

  // Settings
  getSettings: (): Promise<Record<string, unknown>> =>
    ipcRenderer.invoke('settings:get'),

  updateSettings: (settings: Record<string, unknown>): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('settings:update', settings),

  // Dialogs
  showOpenDialog: (options?: Electron.OpenDialogOptions): Promise<Electron.OpenDialogReturnValue> =>
    ipcRenderer.invoke('dialog:showOpenDialog', options),

  shellOpenFolder: (dirPath: string): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('shell:open-folder', dirPath),

  // Window controls (for frameless window)
  minimizeWindow: () => ipcRenderer.send('window:minimize'),

  maximizeWindow: () => ipcRenderer.send('window:maximize'),

  closeWindow: () => ipcRenderer.send('window:close'),

  isWindowMaximized: (): Promise<boolean> =>
    ipcRenderer.invoke('window:is-maximized'),
});

// Type declaration for renderer
declare global {
  interface Window {
    electronAPI: {
      addFiles: (paths: string[]) => Promise<{ success: boolean; items?: QueueItemData[]; error?: string }>;
      removeItem: (id: string) => Promise<{ success: boolean }>;
      updateItemSettings: (id: string, settings: Record<string, unknown>) => Promise<{ success: boolean }>;
      startQueue: () => Promise<{ success: boolean }>;
      cancelItem: (id: string) => Promise<{ success: boolean }>;
      cancelAll: () => Promise<{ success: boolean }>;
      retryItem: (id: string) => Promise<{ success: boolean }>;
      getQueueState: () => Promise<QueueState>;
      getQueueItem: (id: string) => Promise<QueueItemData | undefined>;
      probeFile: (filePath: string) => Promise<{ success: boolean; metadata?: QueueItemData['metadata']; error?: string }>;
      onProgress: (callback: (id: string, percent: number) => void) => void;
      onStatusChange: (callback: (id: string, status: QueueItemStatus, error?: string) => void) => void;
      removeProgressListener: () => void;
      removeStatusChangeListener: () => void;
      getSettings: () => Promise<Record<string, unknown>>;
      updateSettings: (settings: Record<string, unknown>) => Promise<{ success: boolean }>;
      showOpenDialog: (options?: Electron.OpenDialogOptions) => Promise<Electron.OpenDialogReturnValue>;
      shellOpenFolder: (dirPath: string) => Promise<{ success: boolean }>;
      minimizeWindow: () => void;
      maximizeWindow: () => void;
      closeWindow: () => void;
      isWindowMaximized: () => Promise<boolean>;
    };
  }
}
