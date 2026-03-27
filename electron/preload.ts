import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // File management
  addFiles: () => ipcRenderer.invoke('files:add'),
  removeItem: (id: string) => ipcRenderer.invoke('item:remove', id),
  clearDone: () => ipcRenderer.invoke('queue:clearDone'),

  // Item settings
  updateItemSettings: (id: string, settings: Record<string, unknown>) =>
    ipcRenderer.invoke('item:updateSettings', id, settings),

  // Queue control
  startQueue: () => ipcRenderer.invoke('queue:start'),
  cancelItem: (id: string) => ipcRenderer.invoke('item:cancel', id),
  cancelAll: () => ipcRenderer.invoke('queue:cancelAll'),
  retryItem: (id: string) => ipcRenderer.invoke('item:retry', id),

  // Progress & status events
  onProgress: (callback: (id: string, progress: number) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, id: string, progress: number) =>
      callback(id, progress);
    ipcRenderer.on('progress', handler);
    return () => ipcRenderer.removeListener('progress', handler);
  },
  onStatusChange: (
    callback: (id: string, status: string, detail?: unknown) => void,
  ) => {
    const handler = (
      _event: Electron.IpcRendererEvent,
      id: string,
      status: string,
      detail?: unknown,
    ) => callback(id, status, detail);
    ipcRenderer.on('status:change', handler);
    return () => ipcRenderer.removeListener('status:change', handler);
  },

  // Waveform
  getWaveform: (filePath: string) => ipcRenderer.invoke('file:waveform', filePath),

  // App settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (settings: Record<string, unknown>) =>
    ipcRenderer.invoke('settings:update', settings),
});
