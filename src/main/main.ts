/**
 * Electron main process entry point.
 * 
 * Handles:
 * - Window creation (frameless 1200x800)
 * - IPC handlers for queue management
 * - FFprobe integration
 * - Worker thread management
 */

import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron';
import * as path from 'path';
import Store from 'electron-store';
import {
  addFiles,
  removeItem,
  updateItemSettings,
  startQueue,
  cancelItem,
  cancelAll,
  retryItem,
  getQueueState,
  getQueueItem,
  setProgressCallback,
  setStatusChangeCallback,
  QueueItem,
} from './queue';
import { probeFile } from './ffprobe';

let mainWindow: BrowserWindow | null = null;

// Settings store
const store = new Store({
  defaults: {
    outputDir: '',
    overwriteBehavior: 'auto-rename', // 'auto-rename' | 'prompt' | 'skip'
  },
});

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    backgroundColor: '#1a1a1a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Load the app
  if (process.env.NODE_ENV === 'development' || process.argv.includes('--dev')) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Set up progress and status callbacks
setProgressCallback((id: string, percent: number) => {
  mainWindow?.webContents.send('progress', id, percent);
});

setStatusChangeCallback((id: string, status: string, error?: string) => {
  mainWindow?.webContents.send('status-change', id, status, error);
});

// Register IPC handlers

// Queue management
ipcMain.handle('queue:add-files', async (_event, paths: string[]) => {
  try {
    const items = await addFiles(paths);
    return { success: true, items };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
});

ipcMain.handle('queue:remove', async (_event, id: string) => {
  const success = removeItem(id);
  return { success };
});

ipcMain.handle('queue:update-settings', async (_event, id: string, settings: Record<string, unknown>) => {
  const success = updateItemSettings(id, settings as Parameters<typeof updateItemSettings>[1]);
  return { success };
});

ipcMain.handle('queue:start', async () => {
  const success = startQueue();
  return { success };
});

ipcMain.handle('queue:cancel', async (_event, id: string) => {
  const success = cancelItem(id);
  return { success };
});

ipcMain.handle('queue:cancel-all', async () => {
  cancelAll();
  return { success: true };
});

ipcMain.handle('queue:retry', async (_event, id: string) => {
  const success = retryItem(id);
  return { success };
});

ipcMain.handle('queue:get-state', async () => {
  return getQueueState();
});

ipcMain.handle('queue:get-item', async (_event, id: string) => {
  return getQueueItem(id);
});

// File operations
ipcMain.handle('file:probe', async (_event, filePath: string) => {
  try {
    const metadata = await probeFile(filePath);
    return { success: true, metadata };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Unknown error' };
  }
});

// Settings
ipcMain.handle('settings:get', async () => {
  return store.store;
});

ipcMain.handle('settings:update', async (_event, settings: Record<string, unknown>) => {
  for (const [key, value] of Object.entries(settings)) {
    store.set(key, value);
  }
  return { success: true };
});

// Dialogs
ipcMain.handle('dialog:showOpenDialog', async (_event, options?: Electron.OpenDialogOptions) => {
  const result = await dialog.showOpenDialog(mainWindow!, options || {
    properties: ['openFile', 'multiSelections'],
    filters: [
      { name: 'Media Files', extensions: ['mp4', 'mov', 'mkv', 'webm', 'avi', 'gif', 'mp3', 'wav', 'flac', 'ogg', 'aac', 'png', 'jpg', 'jpeg', 'webp'] },
      { name: 'All Files', extensions: ['*'] },
    ],
  });
  return result;
});

ipcMain.handle('shell:open-folder', async (_event, dirPath: string) => {
  await shell.openPath(dirPath);
  return { success: true };
});

// Window controls (for frameless window)
ipcMain.on('window:minimize', () => {
  mainWindow?.minimize();
});

ipcMain.on('window:maximize', () => {
  if (mainWindow?.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow?.maximize();
  }
});

ipcMain.on('window:close', () => {
  mainWindow?.close();
});

ipcMain.handle('window:is-maximized', () => {
  return mainWindow?.isMaximized() ?? false;
});

// App lifecycle
app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // Cancel any in-progress encoding before quitting
  cancelAll();
});
