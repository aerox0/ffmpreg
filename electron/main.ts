import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import Store from 'electron-store';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import ffmpegPath from 'ffmpeg-static';

import type { QueueItem, OutputSettings, QualitySettings } from '../src/types/index';
import { probeFile } from './ffprobe.js';
import { getDefaultQuality } from '../src/lib/presets.js';
import { buildFfmpegArgs } from '../src/lib/ffmpeg-args.js';
import { resolveOutputPath } from '../src/lib/output-path.js';

// ---------------------------------------------------------------------------
// Paths
// ---------------------------------------------------------------------------

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = !app.isPackaged;

const ffmpeg = ffmpegPath as unknown as string;
if (!ffmpeg) {
  throw new Error('ffmpeg-static did not resolve a binary path');
}

// ---------------------------------------------------------------------------
// Persistent settings store
// ---------------------------------------------------------------------------

const store = new Store<{
  outputDir: string | null;
  overwriteBehavior: 'rename' | 'prompt' | 'skip';
}>({
  defaults: {
    outputDir: null,
    overwriteBehavior: 'rename',
  },
});

// ---------------------------------------------------------------------------
// In-memory queue
// ---------------------------------------------------------------------------

const queue = new Map<string, QueueItem>();

function getExistingOutputPaths(): string[] {
  const paths: string[] = [];
  for (const item of queue.values()) {
    if (item.outputPath) {
      paths.push(item.outputPath);
    }
  }
  return paths;
}

// ---------------------------------------------------------------------------
// Worker tracking
// ---------------------------------------------------------------------------

let currentWorker: Worker | null = null;
let currentItemId: string | null = null;

// ---------------------------------------------------------------------------
// Window
// ---------------------------------------------------------------------------

let mainWindow: BrowserWindow | null = null;
let viteDevServer: ReturnType<typeof spawn> | null = null;

function startViteDevServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    const projectRoot = path.resolve(__dirname, '..');
    viteDevServer = spawn('npx', ['vite', '--port', '5173'], {
      cwd: projectRoot,
      stdio: 'pipe',
      shell: true,
    });

    let started = false;
    viteDevServer.stdout?.on('data', (data: Buffer) => {
      const msg = data.toString();
      if (!started && msg.includes('Local:')) {
        started = true;
        resolve();
      }
    });

    viteDevServer.stderr?.on('data', (data: Buffer) => {
      const msg = data.toString();
      if (!started && (msg.includes('Local:') || msg.includes('ready'))) {
        started = true;
        resolve();
      }
    });

    viteDevServer.on('error', (err) => {
      if (!started) reject(err);
    });

    // Timeout fallback
    setTimeout(() => {
      if (!started) {
        started = true;
        resolve();
      }
    }, 10000);
  });
}

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
// Helpers to send events to renderer
// ---------------------------------------------------------------------------

function sendProgress(id: string, percent: number): void {
  mainWindow?.webContents.send('encode:progress', id, percent);
}

function sendStatusChange(id: string, status: string, detail?: unknown): void {
  mainWindow?.webContents.send('encode:status', id, status, detail);
}

// ---------------------------------------------------------------------------
// Queue processor
// ---------------------------------------------------------------------------

function processNextInQueue(): void {
  // Only one worker at a time
  if (currentWorker) return;

  // Find first queued item
  let nextItem: QueueItem | undefined;
  for (const item of queue.values()) {
    if (item.status === 'queued') {
      nextItem = item;
      break;
    }
  }

  if (!nextItem) return; // queue is done

  const item = nextItem;

  // Pre-encode checks --------------------------------------------------------

  // Verify source file still exists
  if (!fs.existsSync(item.source.path)) {
    item.status = 'failed';
    item.error = 'Source file not found';
    sendStatusChange(item.id, 'failed', item.error);
    processNextInQueue();
    return;
  }

  // Verify output directory is writable
  const outputDir = path.dirname(item.source.path); // will be overridden below if needed
  try {
    fs.accessSync(outputDir, fs.constants.W_OK);
  } catch {
    item.status = 'failed';
    item.error = 'Output directory not writable';
    sendStatusChange(item.id, 'failed', item.error);
    processNextInQueue();
    return;
  }

  // Resolve output path
  const outputPath = resolveOutputPath(
    item.source.path,
    item.settings.format,
    getExistingOutputPaths(),
  );
  item.outputPath = outputPath;

  // Build ffmpeg args
  const args = buildFfmpegArgs(item);

  // Determine if stream copy
  const isStreamCopy = !needsTranscodeFromArgs(args);

  // Mark as converting
  item.status = 'converting';
  item.progress = 0;
  sendStatusChange(item.id, 'converting');

  // Spawn worker
  const workerPath = path.join(__dirname, 'workers', 'encode.js');
  const worker = new Worker(workerPath, {
    workerData: {
      args,
      outputPath,
      isStreamCopy,
      duration: item.source.duration || undefined,
    },
  });

  currentWorker = worker;
  currentItemId = item.id;

  worker.on('message', (msg: { type: string; percent?: number; outputSize?: number; message?: string }) => {
    switch (msg.type) {
      case 'progress':
        item.progress = msg.percent ?? 0;
        sendProgress(item.id, item.progress);
        break;

      case 'indeterminate':
        item.progress = -1;
        sendProgress(item.id, -1);
        break;

      case 'done':
        item.status = 'done';
        item.progress = 100;
        item.outputSize = msg.outputSize ?? 0;
        cleanupWorker();
        sendStatusChange(item.id, 'done', { outputSize: item.outputSize });
        processNextInQueue();
        break;

      case 'error':
        item.status = 'failed';
        item.error = msg.message ?? 'Unknown error';
        cleanupWorker();
        // Delete partial output
        deletePartialFile(outputPath);
        sendStatusChange(item.id, 'failed', item.error);
        processNextInQueue();
        break;

      case 'cancelled':
        item.status = 'cancelled';
        cleanupWorker();
        sendStatusChange(item.id, 'cancelled');
        processNextInQueue();
        break;
    }
  });

  worker.on('error', (err) => {
    item.status = 'failed';
    item.error = err.message;
    cleanupWorker();
    deletePartialFile(outputPath);
    sendStatusChange(item.id, 'failed', item.error);
    processNextInQueue();
  });

  worker.on('exit', () => {
    // Safety net: if worker exits without sending done/error/cancelled
    if (currentItemId === item.id && item.status === 'converting') {
      item.status = 'failed';
      item.error = 'Worker exited unexpectedly';
      cleanupWorker();
      sendStatusChange(item.id, 'failed', item.error);
      processNextInQueue();
    }
  });
}

function cleanupWorker(): void {
  currentWorker = null;
  currentItemId = null;
}

function deletePartialFile(filePath: string): void {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * Determine whether the ffmpeg args indicate a stream copy (no transcoding).
 */
function needsTranscodeFromArgs(args: string[]): boolean {
  // Look for -c copy or -c:a copy / -c:v copy patterns
  // If `-c copy` is present, it's full stream copy
  // If both `-c:v copy` and `-c:a copy` are present, it's also stream copy
  const hasCopyAll = args.includes('-c') && args[args.indexOf('-c') + 1] === 'copy';

  if (hasCopyAll) return false; // stream copy = no transcode

  // Check if there are any explicit codec specifications that are NOT copy
  let hasVideoTranscode = false;
  let hasAudioTranscode = false;

  for (let i = 0; i < args.length - 1; i++) {
    if (args[i] === '-c:v' && args[i + 1] !== 'copy') {
      hasVideoTranscode = true;
    }
    if (args[i] === '-c:a' && args[i + 1] !== 'copy') {
      hasAudioTranscode = true;
    }
  }

  // If there are transcode operations, it's not pure stream copy
  return hasVideoTranscode || hasAudioTranscode;
}

// ---------------------------------------------------------------------------
// IPC Handlers
// ---------------------------------------------------------------------------

// -- files:browse ------------------------------------------------------------

ipcMain.handle('files:browse', async (): Promise<string[] | null> => {
  try {
    const result = await dialog.showOpenDialog({
      properties: ['openFile', 'multiSelections'],
      filters: [
        {
          name: 'Media Files',
          extensions: [
            'mp4', 'mkv', 'webm', 'mov', 'avi', 'flv', 'wmv', 'm4v',
            'mp3', 'aac', 'wav', 'flac', 'ogg', 'm4a', 'wma', 'opus',
            'png', 'jpg', 'jpeg', 'webp', 'gif', 'bmp',
          ],
        },
        { name: 'All Files', extensions: ['*'] },
      ],
    });
    return result.canceled ? null : result.filePaths;
  } catch (err) {
    console.error('files:browse error:', err);
    return null;
  }
});

// -- files:add ---------------------------------------------------------------

ipcMain.handle('files:add', async (_event, paths: string[]): Promise<QueueItem[]> => {
  const items: QueueItem[] = [];

  for (const filePath of paths) {
    const source = await probeFile(filePath);
    const item: QueueItem = {
      id: randomUUID(),
      source,
      settings: {
        format: 'mp4',
        quality: getDefaultQuality('good') as QualitySettings,
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

    queue.set(item.id, item);
    items.push(item);
  }

  return items;
});

// -- item:remove -------------------------------------------------------------

ipcMain.handle('item:remove', async (_event, id: string): Promise<void> => {
  const item = queue.get(id);
  if (!item) return;

  // If converting, cancel the worker first
  if (item.status === 'converting' && currentWorker && currentItemId === id) {
    currentWorker.postMessage({ type: 'cancel' });
    // Worker cleanup happens in the message handler
  }

  // Clean up partial output if present
  if (item.outputPath) deletePartialFile(item.outputPath);

  queue.delete(id);
});

// -- queue:clearDone ---------------------------------------------------------

ipcMain.handle('queue:clearDone', async (): Promise<void> => {
  for (const [id, item] of queue.entries()) {
    if (item.status === 'done') {
      queue.delete(id);
    }
  }
});

// -- item:updateSettings -----------------------------------------------------

ipcMain.handle(
  'item:updateSettings',
  async (_event, id: string, settings: Partial<OutputSettings>): Promise<void> => {
    const item = queue.get(id);
    if (!item) return;

    // Merge partial settings into existing
    if (settings.format !== undefined) item.settings.format = settings.format;
    if (settings.quality !== undefined) item.settings.quality = settings.quality;
    if (settings.trim !== undefined) item.settings.trim = settings.trim;
    if (settings.mode !== undefined) item.settings.mode = settings.mode;
    if (settings.extractStreamIndex !== undefined)
      item.settings.extractStreamIndex = settings.extractStreamIndex;
  },
);

// -- queue:start -------------------------------------------------------------

ipcMain.handle('queue:start', async (): Promise<void> => {
  processNextInQueue();
});

// -- item:cancel -------------------------------------------------------------

ipcMain.handle('item:cancel', async (_event, id: string): Promise<void> => {
  const item = queue.get(id);
  if (!item) return;

  if (currentWorker && currentItemId === id) {
    currentWorker.postMessage({ type: 'cancel' });
    // The worker will send back a 'cancelled' message which triggers cleanup
  } else {
    if (item.outputPath) deletePartialFile(item.outputPath);
    item.status = 'cancelled';
    sendStatusChange(id, 'cancelled');
  }
});

// -- queue:cancelAll ---------------------------------------------------------

ipcMain.handle('queue:cancelAll', async (): Promise<void> => {
  // Cancel current worker
  if (currentWorker) {
    currentWorker.postMessage({ type: 'cancel' });
  }

  // Mark all queued items as cancelled
  for (const item of queue.values()) {
    if (item.status === 'queued') {
      item.status = 'cancelled';
      sendStatusChange(item.id, 'cancelled');
    }
  }
});

// -- item:retry --------------------------------------------------------------

ipcMain.handle('item:retry', async (_event, id: string): Promise<void> => {
  const item = queue.get(id);
  if (!item) return;

  item.status = 'queued';
  item.progress = 0;
  item.error = null;
  item.outputPath = null;
  item.outputSize = null;
  sendStatusChange(id, 'queued');
});

// -- file:waveform -----------------------------------------------------------

ipcMain.handle('file:waveform', async (_event, filePath: string): Promise<number[]> => {
  // Don't attempt waveform extraction for image files
  const ext = path.extname(filePath).toLowerCase();
  const imageExts = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp', '.svg', '.ico', '.tiff', '.tif']);
  if (imageExts.has(ext)) return [];

  return new Promise((resolve, reject) => {
    const args = [
      '-i', filePath,
      '-ac', '1',
      '-ar', '8000',
      '-f', 's16le',
      '-acodec', 'pcm_s16le',
      'pipe:1',
    ];

    const child = spawn(ffmpeg, args);
    const chunks: Buffer[] = [];

    child.stdout?.on('data', (chunk: Buffer) => {
      chunks.push(chunk);
    });

    child.stderr?.on('data', () => {
      // Discard stderr
    });

    child.on('close', (code) => {
      if (code !== 0) {
        // File has no audio stream (e.g. images) — return empty waveform
        resolve([]);
        return;
      }

      const buffer = Buffer.concat(chunks);
      const int16 = new Int16Array(buffer.buffer, buffer.byteOffset, buffer.byteLength / 2);

      // Downsample to ~300 amplitude values
      const targetSamples = 300;
      const totalSamples = int16.length;

      if (totalSamples === 0) {
        resolve([]);
        return;
      }

      const step = totalSamples / targetSamples;
      const result: number[] = [];

      for (let i = 0; i < targetSamples; i++) {
        const idx = Math.floor(i * step);
        result.push(int16[idx]);
      }

      resolve(result);
    });

    child.on('error', (err) => {
      reject(err);
    });
  });
});

// -- settings:get -----------------------------------------------------------

ipcMain.handle('settings:get', async (): Promise<Record<string, unknown>> => {
  return store.store as Record<string, unknown>;
});

// -- settings:update ---------------------------------------------------------

ipcMain.handle(
  'settings:update',
  async (_event, settings: Record<string, unknown>): Promise<void> => {
    Object.entries(settings).forEach(([k, v]) => store.set(k, v));
  },
);

// -- settings:browse-directory -----------------------------------------------

ipcMain.handle('settings:browse-directory', async () => {
  const result = await dialog.showOpenDialog(mainWindow!, {
    properties: ['openDirectory'],
  });
  return result.filePaths[0] ?? null;
});

// -- window controls ----------------------------------------------------------

ipcMain.handle('window:minimize', () => mainWindow?.minimize());
ipcMain.handle('window:maximize', () => {
  if (mainWindow?.isMaximized()) mainWindow.unmaximize();
  else mainWindow?.maximize();
});
ipcMain.handle('window:close', () => mainWindow?.close());

// ---------------------------------------------------------------------------
// App lifecycle
// ---------------------------------------------------------------------------

app.whenReady().then(async () => {
  if (isDev) {
    await startViteDevServer();
  }
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  if (viteDevServer) {
    viteDevServer.kill();
    viteDevServer = null;
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
