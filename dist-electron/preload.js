import { contextBridge, ipcRenderer } from 'electron';
contextBridge.exposeInMainWorld('electronAPI', {
    // Queue management
    addFiles: (paths) => ipcRenderer.invoke('queue:add-files', paths),
    removeItem: (id) => ipcRenderer.invoke('queue:remove', id),
    clearDone: () => ipcRenderer.invoke('queue:clear-done'),
    // Settings per queue item
    updateItemSettings: (id, settings) => ipcRenderer.invoke('queue:update-settings', id, settings),
    // Encoding
    startQueue: () => ipcRenderer.invoke('queue:start'),
    cancelItem: (id) => ipcRenderer.invoke('queue:cancel', id),
    cancelAll: () => ipcRenderer.invoke('queue:cancel-all'),
    retryItem: (id) => ipcRenderer.invoke('queue:retry', id),
    // Waveform data
    getWaveform: (id) => ipcRenderer.invoke('file:waveform', id),
    // Progress listener
    onProgress: (callback) => {
        ipcRenderer.on('encode:progress', (_e, id, percent) => callback(id, percent));
    },
    onStatusChange: (callback) => {
        ipcRenderer.on('encode:status', (_e, id, status, error) => callback(id, status, error));
    },
    // Settings
    getSettings: () => ipcRenderer.invoke('settings:get'),
    updateSettings: (settings) => ipcRenderer.invoke('settings:update', settings),
});
