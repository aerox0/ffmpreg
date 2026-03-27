import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';

// Global exception handler
process.on('uncaughtException', (err) => {
  console.error('[main] Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[main] Unhandled rejection:', reason);
});

let mainWindow: BrowserWindow | null = null;

const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    frame: false,
    backgroundColor: '#1a1a1a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  console.log('[main] BrowserWindow created');
}

// IPC handler stubs — will be implemented in later tasks
function registerIpcHandlers() {
  const handlers: Array<[string, (...args: unknown[]) => unknown]> = [
    ['queue:add-files', async (paths) => { console.log('[IPC] queue:add-files', paths); return []; }],
    ['queue:remove', async (id) => { console.log('[IPC] queue:remove', id); }],
    ['queue:clear-done', async () => { console.log('[IPC] queue:clear-done'); }],
    ['queue:update-settings', async (id, settings) => { console.log('[IPC] queue:update-settings', id, settings); }],
    ['queue:start', async () => { console.log('[IPC] queue:start'); }],
    ['queue:cancel', async (id) => { console.log('[IPC] queue:cancel', id); }],
    ['queue:cancel-all', async () => { console.log('[IPC] queue:cancel-all'); }],
    ['queue:retry', async (id) => { console.log('[IPC] queue:retry', id); }],
    ['file:waveform', async (id) => { console.log('[IPC] file:waveform', id); return []; }],
    ['settings:get', async () => { console.log('[IPC] settings:get'); return { outputDir: null, overwriteBehavior: 'auto-rename' }; }],
    ['settings:update', async (settings) => { console.log('[IPC] settings:update', settings); }],
  ];

  for (const [channel, handler] of handlers) {
    ipcMain.handle(channel, async (_event, ...args) => {
      try {
        return await handler(...args);
      } catch (err) {
        console.error(`[IPC] Error in ${channel}:`, err);
        throw err;
      }
    });
  }

  console.log('[main] IPC handlers registered');
}

app.whenReady().then(() => {
  console.log('[main] App ready');
  registerIpcHandlers();
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
