import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  // File management
  addFiles: (paths: string[]) => ipcRenderer.invoke('files:add', paths),
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
    ipcRenderer.on('encode:progress', handler);
    return () => ipcRenderer.removeListener('encode:progress', handler);
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
    ipcRenderer.on('encode:status', handler);
    return () => ipcRenderer.removeListener('encode:status', handler);
  },

  // Waveform
  getWaveform: (filePath: string) => ipcRenderer.invoke('file:waveform', filePath),

  // App settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (settings: Record<string, unknown>) =>
    ipcRenderer.invoke('settings:update', settings),
  browseDirectory: () => ipcRenderer.invoke('settings:browse-directory'),

  // Window controls
  minimizeWindow: () => ipcRenderer.invoke('window:minimize'),
  maximizeWindow: () => ipcRenderer.invoke('window:maximize'),
  closeWindow: () => ipcRenderer.invoke('window:close'),
});
