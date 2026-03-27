import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import { Worker } from 'node:worker_threads';
import { existsSync, unlinkSync, writeFileSync } from 'node:fs';
import { probeFile } from './ffprobe.js';
import type { QueueItem, OutputSettings } from '../src/types/index.js';
import { buildFfmpegArgs } from '../src/lib/ffmpeg-args.js';
import { resolveOutputPath } from '../src/lib/output-path.js';
import { getDefaultQuality } from '../src/lib/presets.js';
import Store from 'electron-store';
import ffmpegStatic from 'ffmpeg-static';

type WorkerMessage =
  | { type: 'progress'; percent: number }
  | { type: 'indeterminate' }
  | { type: 'done'; outputSize: number }
  | { type: 'error'; message: string }
  | { type: 'cancelled' };

// Global exception handler
process.on('uncaughtException', (err) => {
  console.error('[main] Uncaught exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[main] Unhandled rejection:', reason);
});

// ─── Types ───────────────────────────────────────────────────────────────────

interface AppSettings {
  outputDir: string | null;
  overwriteBehavior: 'auto-rename' | 'prompt' | 'skip';
}

// ─── State ───────────────────────────────────────────────────────────────────

let mainWindow: BrowserWindow | null = null;
const isDev = process.env.NODE_ENV !== 'production' && !app.isPackaged;

// Queue of items to process
const queue: QueueItem[] = [];
let currentItemId: string | null = null;
let currentWorker: Worker | null = null;

// Settings store
const store = new Store<AppSettings>({
  defaults: { outputDir: null, overwriteBehavior: 'auto-rename' },
});

// ─── Window ──────────────────────────────────────────────────────────────────

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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getQueueItem(id: string): QueueItem | undefined {
  return queue.find((item) => item.id === id);
}

function sendToRenderer(channel: string, ...args: unknown[]) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, ...args);
  }
}

function makeId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getFfmpegPath(): string {
  // In packaged app, use the bundled Windows binary from extraResources
  if (app.isPackaged) {
    return path.join(process.resourcesPath!, 'ffmpeg.exe');
  }
  // In dev, use ffmpeg-static
  return ffmpegStatic!;
}

// ─── Queue Processor ─────────────────────────────────────────────────────────

async function processNextItem() {
  // Find first queued item
  const item = queue.find((q) => q.status === 'queued');
  if (!item) {
    currentItemId = null;
    return;
  }

  currentItemId = item.id;
  item.status = 'converting';
  item.progress = 0;
  sendToRenderer('encode:status', item.id, 'converting');

  try {
    // Pre-encode checks
    if (!existsSync(item.source.path)) {
      throw new Error(`Source file not found: ${item.source.path}`);
    }

    // Resolve output path
    const outputDir = store.get('outputDir');
    const existingOutputPaths = queue
      .filter((q) => q.id !== item.id && q.outputPath)
      .map((q) => q.outputPath!);
    const outputPath = resolveOutputPath(item.source.path, item.settings.format, existingOutputPaths, outputDir);
    item.outputPath = outputPath;

    // Check output directory is writable
    const outputDirCheck = path.dirname(outputPath);
    try {
      writeFileSync(path.join(outputDirCheck, '.ffmpreg_write_test'), '');
      unlinkSync(path.join(outputDirCheck, '.ffmpreg_write_test'));
    } catch {
      throw new Error(`Output directory is not writable: ${outputDirCheck}`);
    }

    // Build ffmpeg args
    const ffmpegArgs = buildFfmpegArgs(item);
    const isStreamCopy = ffmpegArgs.includes('-c:v') && ffmpegArgs[ffmpegArgs.indexOf('-c:v') + 1] === 'copy';

    // Spawn worker
    const workerPath = path.join(__dirname, 'workers', 'encode.js');
    currentWorker = new Worker(workerPath, {
      workerData: { ffmpegPath: getFfmpegPath(), args: ffmpegArgs, outputPath, isStreamCopy },
    });

    currentWorker.on('message', (msg: WorkerMessage) => {
      if (msg.type === 'progress') {
        item.progress = msg.percent ?? 0;
        sendToRenderer('encode:progress', item.id, item.progress);
      } else if (msg.type === 'indeterminate') {
        item.progress = -1;
        sendToRenderer('encode:progress', item.id, -1);
      } else if (msg.type === 'done') {
        item.status = 'done';
        item.progress = 100;
        item.outputSize = msg.outputSize;
        item.error = null;
        sendToRenderer('encode:status', item.id, 'done');
        currentWorker = null;
        currentItemId = null;
        processNextItem();
      } else if (msg.type === 'error') {
        item.status = 'failed';
        item.error = msg.message;
        // Clean up partial output
        if (existsSync(item.outputPath!)) {
          try { unlinkSync(item.outputPath!); } catch { /* ignore */ }
        }
        sendToRenderer('encode:status', item.id, 'failed', msg.message);
        currentWorker = null;
        currentItemId = null;
        processNextItem();
      } else if (msg.type === 'cancelled') {
        item.status = 'cancelled';
        item.error = null;
        if (existsSync(item.outputPath!)) {
          try { unlinkSync(item.outputPath!); } catch { /* ignore */ }
        }
        sendToRenderer('encode:status', item.id, 'cancelled');
        currentWorker = null;
        currentItemId = null;
        processNextItem();
      }
    });

    currentWorker.on('error', (err) => {
      item.status = 'failed';
      item.error = err.message;
      sendToRenderer('encode:status', item.id, 'failed', err.message);
      currentWorker = null;
      currentItemId = null;
      processNextItem();
    });
  } catch (err) {
    item.status = 'failed';
    item.error = err instanceof Error ? err.message : String(err);
    sendToRenderer('encode:status', item.id, 'failed', item.error);
    currentItemId = null;
    processNextItem();
  }
}

// ─── IPC Handlers ────────────────────────────────────────────────────────────

function registerIpcHandlers() {
  // queue:add-files
  ipcMain.handle('queue:add-files', async (_event, paths: string[]): Promise<QueueItem[]> => {
    const newItems: QueueItem[] = [];
    for (const filePath of paths) {
      try {
        const source = await probeFile(filePath);
        const item: QueueItem = {
          id: makeId(),
          source,
          settings: {
            format: source.inputType === 'video' ? 'mp4' : source.inputType === 'audio' ? 'mp3' : 'png',
            quality: getDefaultQuality('good'),
            trim: null,
            mode: 'convert',
            extractStreamIndex: null,
          },
          status: 'queued',
          progress: 0,
          error: null,
          outputPath: null,
          outputSize: null,
        };
        queue.push(item);
        newItems.push(item);
      } catch (err) {
        console.error('[IPC] queue:add-files: probeFile failed for', filePath, err);
      }
    }
    return newItems;
  });

  // queue:remove
  ipcMain.handle('queue:remove', async (_event, id: string): Promise<void> => {
    const idx = queue.findIndex((q) => q.id === id);
    if (idx === -1) return;
    if (currentItemId === id) {
      // Cancel current item
      if (currentWorker) {
        currentWorker.postMessage({ type: 'cancel' });
        currentWorker.terminate();
        currentWorker = null;
      }
      currentItemId = null;
    }
    queue.splice(idx, 1);
  });

  // queue:clear-done
  ipcMain.handle('queue:clear-done', async (): Promise<void> => {
    for (let i = queue.length - 1; i >= 0; i--) {
      if (queue[i].status === 'done') {
        queue.splice(i, 1);
      }
    }
  });

  // queue:update-settings
  ipcMain.handle('queue:update-settings', async (_event, id: string, settings: Partial<OutputSettings>): Promise<void> => {
    const item = getQueueItem(id);
    if (!item) return;
    item.settings = { ...item.settings, ...settings };
  });

  // queue:start
  ipcMain.handle('queue:start', async (): Promise<void> => {
    if (!currentItemId) {
      processNextItem();
    }
  });

  // queue:cancel
  ipcMain.handle('queue:cancel', async (_event, id: string): Promise<void> => {
    if (currentItemId === id && currentWorker) {
      currentWorker.postMessage({ type: 'cancel' });
      currentWorker.terminate();
      currentWorker = null;
      const item = getQueueItem(id);
      if (item) {
        item.status = 'cancelled';
        sendToRenderer('encode:status', id, 'cancelled');
      }
      currentItemId = null;
      processNextItem();
    }
  });

  // queue:cancel-all
  ipcMain.handle('queue:cancel-all', async (): Promise<void> => {
    if (currentWorker) {
      currentWorker.postMessage({ type: 'cancel' });
      currentWorker.terminate();
      currentWorker = null;
    }
    currentItemId = null;
    for (const item of queue) {
      if (item.status === 'converting' || item.status === 'queued') {
        item.status = 'cancelled';
        sendToRenderer('encode:status', item.id, 'cancelled');
      }
    }
    // Clear queued items
    for (let i = queue.length - 1; i >= 0; i--) {
      if (queue[i].status === 'queued') {
        queue.splice(i, 1);
      }
    }
  });

  // queue:retry
  ipcMain.handle('queue:retry', async (_event, id: string): Promise<void> => {
    const item = getQueueItem(id);
    if (!item) return;
    item.status = 'queued';
    item.progress = 0;
    item.error = null;
    item.outputSize = null;
    sendToRenderer('encode:status', id, 'queued');
    if (!currentItemId) {
      processNextItem();
    }
  });

  // file:waveform
  ipcMain.handle('file:waveform', async (_event, id: string): Promise<number[]> => {
    const item = getQueueItem(id);
    if (!item) return [];
    // Quick audio downsample to PCM amplitude
    try {
      const { spawn } = await import('node:child_process');
      const ffmpegPath = getFfmpegPath();
      if (!ffmpegPath) return [];

      return new Promise((resolve) => {
        const args = [
          '-i', item.source.path,
          '-ac', '1', '-ar', '8000',
          '-f', 's16le', '-acodec', 'pcm_s16le',
          'pipe:1',
        ];
        const proc = spawn(ffmpegPath, args);
        const chunks: Buffer[] = [];
        proc.stdout.on('data', (c: Buffer) => chunks.push(c));
        proc.on('close', () => {
          const buf = Buffer.concat(chunks);
          const samples = new Int16Array(buf.buffer, buf.byteOffset, buf.length / 2);
          // Downsample to ~300 amplitude values
          const bucketSize = Math.max(1, Math.floor(samples.length / 300));
          const amplitudes: number[] = [];
          for (let i = 0; i < samples.length; i += bucketSize) {
            let max = 0;
            for (let j = i; j < Math.min(i + bucketSize, samples.length); j++) {
              max = Math.max(max, Math.abs(samples[j]));
            }
            amplitudes.push(max / 32768);
          }
          resolve(amplitudes);
        });
        proc.on('error', () => resolve([]));
      });
    } catch {
      return [];
    }
  });

  // settings:get
  ipcMain.handle('settings:get', async (): Promise<AppSettings> => {
    return {
      outputDir: store.get('outputDir'),
      overwriteBehavior: store.get('overwriteBehavior'),
    };
  });

  // settings:update
  ipcMain.handle('settings:update', async (_event, settings: Partial<AppSettings>): Promise<void> => {
    if (settings.outputDir !== undefined) store.set('outputDir', settings.outputDir);
    if (settings.overwriteBehavior !== undefined) store.set('overwriteBehavior', settings.overwriteBehavior);
  });

  // dialog:showOpenDialog
  ipcMain.handle('dialog:showOpenDialog', async (_event, options: Electron.OpenDialogOptions): Promise<string | null> => {
    const result = await dialog.showOpenDialog(mainWindow!, options);
    if (result.canceled || result.filePaths.length === 0) return null;
    return result.filePaths[0];
  });

  console.log('[main] IPC handlers registered');
}

// ─── App ─────────────────────────────────────────────────────────────────────

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
