/**
 * Electron preload script.
 * 
 * Exposes a secure API to the renderer process via contextBridge.
 * All communication between renderer and main process happens through
 * this bridge - direct Node.js/Electron API access is disabled.
 */

import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

// Type definitions for the exposed API
export interface ElectronAPI {
  // Queue management
  addFiles: (paths: string[]) => Promise<{ success: boolean; items?: unknown[]; error?: string }>;
  removeItem: (id: string) => Promise<{ success: boolean }>;
  updateItemSettings: (id: string, settings: Record<string, unknown>) => Promise<{ success: boolean }>;
  startQueue: () => Promise<{ success: boolean }>;
  cancelItem: (id: string) => Promise<{ success: boolean }>;
  cancelAll: () => Promise<{ success: boolean }>;
  retryItem: (id: string) => Promise<{ success: boolean }>;
  getQueueState: () => Promise<unknown>;
  getQueueItem: (id: string) => Promise<unknown>;
  
  // File operations
  probeFile: (filePath: string) => Promise<{ success: boolean; metadata?: unknown; error?: string }>;
  getWaveform: (id: string) => Promise<number[]>;
  
  // Settings
  getSettings: () => Promise<Record<string, unknown>>;
  updateSettings: (settings: Record<string, unknown>) => Promise<{ success: boolean }>;
  
  // Dialogs
  showOpenDialog: (options?: Electron.OpenDialogOptions) => Promise<Electron.OpenDialogReturnValue>;
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
}

// Create the API object
const electronAPI: ElectronAPI = {
  // Queue management
  addFiles: (paths: string[]) => ipcRenderer.invoke('queue:add-files', paths),
  removeItem: (id: string) => ipcRenderer.invoke('queue:remove', id),
  updateItemSettings: (id: string, settings: Record<string, unknown>) => 
    ipcRenderer.invoke('queue:update-settings', id, settings),
  startQueue: () => ipcRenderer.invoke('queue:start'),
  cancelItem: (id: string) => ipcRenderer.invoke('queue:cancel', id),
  cancelAll: () => ipcRenderer.invoke('queue:cancel-all'),
  retryItem: (id: string) => ipcRenderer.invoke('queue:retry', id),
  getQueueState: () => ipcRenderer.invoke('queue:get-state'),
  getQueueItem: (id: string) => ipcRenderer.invoke('queue:get-item', id),
  
  // File operations
  probeFile: (filePath: string) => ipcRenderer.invoke('file:probe', filePath),
  getWaveform: (id: string) => ipcRenderer.invoke('file:waveform', id),
  
  // Settings
  getSettings: () => ipcRenderer.invoke('settings:get'),
  updateSettings: (settings: Record<string, unknown>) => ipcRenderer.invoke('settings:update', settings),
  
  // Dialogs
  showOpenDialog: (options?: Electron.OpenDialogOptions) => 
    ipcRenderer.invoke('dialog:showOpenDialog', options),
  shellOpenFolder: (dirPath: string) => ipcRenderer.invoke('shell:open-folder', dirPath),
  
  // Window controls
  minimizeWindow: () => ipcRenderer.send('window:minimize'),
  maximizeWindow: () => ipcRenderer.send('window:maximize'),
  closeWindow: () => ipcRenderer.send('window:close'),
  isMaximized: () => ipcRenderer.invoke('window:is-maximized'),
  
  // Event listeners with cleanup functions
  onProgress: (callback: (id: string, percent: number) => void) => {
    const handler = (_event: IpcRendererEvent, id: string, percent: number) => callback(id, percent);
    ipcRenderer.on('progress', handler);
    // Return cleanup function
    return () => ipcRenderer.removeListener('progress', handler);
  },
  
  onStatusChange: (callback: (id: string, status: string, error?: string) => void) => {
    const handler = (_event: IpcRendererEvent, id: string, status: string, error?: string) => 
      callback(id, status, error);
    ipcRenderer.on('status-change', handler);
    // Return cleanup function
    return () => ipcRenderer.removeListener('status-change', handler);
  },
  
  onMaximizeChange: (callback: (isMaximized: boolean) => void) => {
    const handler = (_event: IpcRendererEvent, isMaximized: boolean) => callback(isMaximized);
    // Use 'window:maximize-change' channel if available, otherwise poll
    ipcRenderer.on('window:maximize-change', handler);
    return () => ipcRenderer.removeListener('window:maximize-change', handler);
  },
};

// Expose the API to the renderer process
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
