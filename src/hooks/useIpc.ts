import type { QueueItem } from '../types/index';

export interface ElectronAPI {
  addFiles: (paths: string[]) => Promise<QueueItem[]>;
  removeItem: (id: string) => Promise<void>;
  clearDone: () => Promise<void>;
  updateItemSettings: (id: string, settings: Record<string, unknown>) => Promise<void>;
  startQueue: () => Promise<void>;
  cancelItem: (id: string) => Promise<void>;
  cancelAll: () => Promise<void>;
  retryItem: (id: string) => Promise<void>;
  onProgress: (callback: (id: string, progress: number) => void) => () => void;
  onStatusChange: (callback: (id: string, status: string, detail?: unknown) => void) => () => void;
  getWaveform: (filePath: string) => Promise<number[]>;
  getSettings: () => Promise<Record<string, unknown>>;
  updateSettings: (settings: Record<string, unknown>) => Promise<void>;
  browseDirectory: () => Promise<string | null>;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}

export function useIpc(): ElectronAPI | null {
  return window.electronAPI ?? null;
}
