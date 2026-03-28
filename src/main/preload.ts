import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Queue management
  addFiles: (paths: string[]) => ipcRenderer.invoke('add-files', paths),
  removeItem: (id: string) => ipcRenderer.invoke('remove-item', id),
  updateItemSettings: (id: string, settings: unknown) => ipcRenderer.invoke('update-item-settings', id, settings),
  startQueue: () => ipcRenderer.invoke('start-queue'),
  cancelItem: (id: string) => ipcRenderer.invoke('cancel-item', id),
  cancelAll: () => ipcRenderer.invoke('cancel-all'),
  retryItem: (id: string) => ipcRenderer.invoke('retry-item', id),

  // Waveform
  getWaveform: (id: string) => ipcRenderer.invoke('get-waveform', id),

  // Progress listeners
  onProgress: (callback: (id: string, percent: number) => void) => {
    ipcRenderer.on('progress', (_event, id: string, percent: number) => callback(id, percent));
  },
  onStatusChange: (callback: (id: string, status: string, error?: string) => void) => {
    ipcRenderer.on('status-change', (_event, id: string, status: string, error?: string) => callback(id, status, error));
  },

  // Settings
  getSettings: () => ipcRenderer.invoke('get-settings'),
  updateSettings: (settings: unknown) => ipcRenderer.invoke('update-settings', settings),

  // Dialogs
  showOpenDialog: (options?: unknown) => ipcRenderer.invoke('show-open-dialog', options),
  shellOpenFolder: (dirPath: string) => ipcRenderer.invoke('shell-open-folder', dirPath),

  // Window controls (for frameless window)
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  maximizeWindow: () => ipcRenderer.send('maximize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),
});
