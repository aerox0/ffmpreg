import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // Queue management
  addFiles: (paths: string[]) => ipcRenderer.invoke('queue:add-files', paths),
  removeItem: (id: string) => ipcRenderer.invoke('queue:remove', id),
  clearDone: () => ipcRenderer.invoke('queue:clear-done'),

  // Settings per queue item
  updateItemSettings: (id: string, settings: object) =>
    ipcRenderer.invoke('queue:update-settings', id, settings),

  // Encoding
  startQueue: () => ipcRenderer.invoke('queue:start'),
  cancelItem: (id: string) => ipcRenderer.invoke('queue:cancel', id),
  cancelAll: () => ipcRenderer.invoke('queue:cancel-all'),
  retryItem: (id: string) => ipcRenderer.invoke('queue:retry', id),

  // Waveform data
  getWaveform: (id: string) => ipcRenderer.invoke('file:waveform', id),

  // Progress listener
  onProgress: (callback: (id: string, percent: number) => void) => {
    ipcRenderer.on('encode:progress', (_e, id, percent) => callback(id, percent));
  },
  onStatusChange: (callback: (id: string, status: string, error?: string) => void) => {
    ipcRenderer.on('encode:status', (_e, id, status, error) => callback(id, status, error));
  },

  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (settings: object) => ipcRenderer.invoke('settings:update', settings),

  // Dialog
  showOpenDialog: (options: object) => ipcRenderer.invoke('dialog:showOpenDialog', options),
});
