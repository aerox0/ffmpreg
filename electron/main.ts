import { app, BrowserWindow, ipcMain } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isDev = !app.isPackaged;

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    backgroundColor: '#1a1a2e',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ---------------------------------------------------------------------------
// IPC handler stubs – log for now, real implementations in Task 6
// ---------------------------------------------------------------------------

function stubHandle(channel: string, ..._args: unknown[]): unknown {
  console.log(`[IPC stub] ${channel}`);
  return null;
}

// File management
ipcMain.handle('files:add', () => stubHandle('files:add'));
ipcMain.handle('item:remove', (_e, id: string) => stubHandle('item:remove', id));
ipcMain.handle('queue:clearDone', () => stubHandle('queue:clearDone'));

// Item settings
ipcMain.handle('item:updateSettings', (_e, id: string, settings: Record<string, unknown>) =>
  stubHandle('item:updateSettings', id, settings),
);

// Queue control
ipcMain.handle('queue:start', () => stubHandle('queue:start'));
ipcMain.handle('item:cancel', (_e, id: string) => stubHandle('item:cancel', id));
ipcMain.handle('queue:cancelAll', () => stubHandle('queue:cancelAll'));
ipcMain.handle('item:retry', (_e, id: string) => stubHandle('item:retry', id));

// Waveform
ipcMain.handle('file:waveform', (_e, filePath: string) =>
  stubHandle('file:waveform', filePath),
);

// Settings
ipcMain.handle('settings:get', () => stubHandle('settings:get'));
ipcMain.handle('settings:update', (_e, settings: Record<string, unknown>) =>
  stubHandle('settings:update', settings),
);

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
