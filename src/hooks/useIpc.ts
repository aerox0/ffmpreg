// eslint-disable-next-line @typescript-eslint/no-explicit-any
declare global {
  interface Window {
    electronAPI: {
      addFiles: (paths: string[]) => Promise<unknown[]>;
      removeItem: (id: string) => Promise<void>;
      clearDone: () => Promise<void>;
      updateItemSettings: (id: string, settings: object) => Promise<void>;
      startQueue: () => Promise<void>;
      cancelItem: (id: string) => Promise<void>;
      cancelAll: () => Promise<void>;
      retryItem: (id: string) => Promise<void>;
      getWaveform: (id: string) => Promise<number[]>;
      onProgress: (callback: (id: string, percent: number) => void) => void;
      onStatusChange: (callback: (id: string, status: string, error?: string) => void) => void;
      getSettings: () => Promise<unknown>;
      updateSettings: (settings: object) => Promise<void>;
      showOpenDialog: (options: object) => Promise<string[] | null>;
    } | undefined;
  }
}

export function hasElectronAPI(): boolean {
  return typeof window !== 'undefined' && typeof window.electronAPI !== 'undefined';
}
