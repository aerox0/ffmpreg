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
import { spawn } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import Store from 'electron-store';

// Derive __dirname for ESM compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
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
} from './queue.js';
import { probeFile } from './ffprobe.js';
import { getFfmpegPath } from './ffmpeg-path.js';

let mainWindow: BrowserWindow | null = null;

// Settings store
const store = new Store({
  defaults: {
    outputDir: '',
    overwriteBehavior: 'auto-rename', // 'auto-rename' | 'prompt' | 'skip'
  },
});

/**
 * Generate waveform data (amplitude values) for a media file.
 * Returns an array of normalized amplitude values (0-1) representing audio peaks.
 */
async function getWaveformData(id: string): Promise<number[]> {
  // Get the queue item to find the source file path
  const item = getQueueItem(id);
  if (!item) {
    throw new Error(`Queue item not found: ${id}`);
  }

  const sourcePath = item.sourcePath;
  if (!fs.existsSync(sourcePath)) {
    throw new Error(`File not found: ${sourcePath}`);
  }

  // Get duration from metadata or probe the file
  const duration = item.metadata?.duration || 0;
  if (duration <= 0) {
    throw new Error(`Cannot generate waveform for file with no duration`);
  }

  // Number of samples to generate (100 points per second is a good balance)
  const samplesPerSecond = 100;
  const numSamples = Math.max(10, Math.min(10000, Math.floor(duration * samplesPerSecond)));

  const ffmpegPath = getFfmpegPath();

  return new Promise((resolve, reject) => {
    // Use ffmpeg to extract audio and compute amplitude values
    // -af "aformat=sample_fmts=s16:channel_layouts=mono" converts to mono 16-bit
    // astats outputs metadata about each frame's amplitude
    // We use a simpler approach: extract PCM and compute RMS per chunk
    const args = [
      '-i', sourcePath,
      '-ac', '1',           // Mono output
      '-ar', '8000',        // Low sample rate for performance (8kHz)
      '-f', 's16le',       // Raw 16-bit signed little-endian PCM
      '-acodec', 'pcm_s16le',
      '-'                    // Output to stdout
    ];

    const proc = spawn(ffmpegPath, args);
    const chunks: Buffer[] = [];

    proc.stdout.on('data', (data: Buffer) => {
      chunks.push(data);
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffmpeg exited with code ${code}`));
        return;
      }

      try {
        // Combine all chunks into a single buffer
        const totalBuffer = Buffer.concat(chunks);
        const samples = new Int16Array(totalBuffer.buffer, totalBuffer.byteOffset, totalBuffer.length / 2);

        // Calculate amplitude values for each sample point
        const waveform: number[] = [];
        const samplesPerPoint = Math.floor(samples.length / numSamples);

        if (samplesPerPoint <= 0) {
          // File is too short, return a few uniform samples
          for (let i = 0; i < Math.min(numSamples, 10); i++) {
            waveform.push(0.5);
          }
          resolve(waveform);
          return;
        }

        for (let i = 0; i < numSamples; i++) {
          const start = i * samplesPerPoint;
          const end = Math.min(start + samplesPerPoint, samples.length);

          // Calculate peak amplitude for this chunk
          let peak = 0;
          for (let j = start; j < end; j++) {
            const amplitude = Math.abs(samples[j]) / 32768; // Normalize to 0-1
            if (amplitude > peak) {
              peak = amplitude;
            }
          }

          waveform.push(peak);
        }

        resolve(waveform);
      } catch (err) {
        reject(new Error(`Failed to process audio data: ${err}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn ffmpeg: ${err.message}`));
    });
  });
}

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

ipcMain.handle('file:waveform', async (_event, id: string) => {
  try {
    const waveformData = await getWaveformData(id);
    return waveformData;
  } catch (err) {
    throw err instanceof Error ? err : new Error('Unknown error generating waveform');
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
