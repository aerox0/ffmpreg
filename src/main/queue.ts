/**
 * Queue management for encoding tasks.
 */

import { probeFile, MediaMetadata } from './ffprobe';
import { resolveOutputPath, deleteFileIfExists, getFileSize } from '../shared/output-path';
import { buildFfmpegArgs, EncodeItem } from '../shared/ffmpeg-args';
import { Worker } from 'worker_threads';
import * as path from 'path';
import * as fs from 'fs';
import { getFfmpegPath } from './ffmpeg-path';

export type QueueItemStatus = 'pending' | 'probing' | 'queued' | 'converting' | 'done' | 'failed' | 'cancelled';

export interface QueueItem {
  id: string;
  sourcePath: string;
  outputPath: string;
  targetFormat: string;
  status: QueueItemStatus;
  error?: string;
  metadata?: MediaMetadata;
  // Settings
  trimStart?: number;
  trimEnd?: number;
  preset: 'compact' | 'good' | 'high' | 'custom';
  crf: number;
  audioBitrate: number;
  // Progress
  percent: number;
  outputSize?: number;
}

export interface QueueState {
  items: QueueItem[];
  currentItemId: string | null;
  isProcessing: boolean;
}

// Main process state
let queue: QueueItem[] = [];
let currentItemId: string | null = null;
let isProcessing = false;
let currentWorker: Worker | null = null;

// Event callbacks
let onProgressCallback: ((id: string, percent: number) => void) | null = null;
let onStatusChangeCallback: ((id: string, status: QueueItemStatus, error?: string) => void) | null = null;

export function setProgressCallback(cb: (id: string, percent: number) => void) {
  onProgressCallback = cb;
}

export function setStatusChangeCallback(cb: (id: string, status: QueueItemStatus, error?: string) => void) {
  onStatusChangeCallback = cb;
}

function emitProgress(id: string, percent: number) {
  if (onProgressCallback) {
    onProgressCallback(id, percent);
  }
}

function emitStatusChange(id: string, status: QueueItemStatus, error?: string) {
  if (onStatusChangeCallback) {
    onStatusChangeCallback(id, status, error);
  }
}

export function getQueueState(): QueueState {
  return {
    items: [...queue],
    currentItemId,
    isProcessing,
  };
}

export function getQueueItem(id: string): QueueItem | undefined {
  return queue.find(item => item.id === id);
}

export async function addFiles(sourcePaths: string[]): Promise<QueueItem[]> {
  const newItems: QueueItem[] = [];

  for (const sourcePath of sourcePaths) {
    const id = generateId();
    const item: QueueItem = {
      id,
      sourcePath,
      outputPath: '',
      targetFormat: '',
      status: 'probing',
      preset: 'good',
      crf: 25,
      audioBitrate: 192,
      percent: 0,
    };

    queue.push(item);
    newItems.push(item);
    emitStatusChange(id, 'probing');

    // Probe file asynchronously
    try {
      const metadata = await probeFile(sourcePath);
      const outputPath = resolveOutputPath(sourcePath, metadata.inputType === 'video' ? 'mp4' : 'mp3');
      
      const queueItem = queue.find(i => i.id === id);
      if (queueItem) {
        queueItem.status = 'queued';
        queueItem.metadata = metadata;
        queueItem.outputPath = outputPath.outputPath;
        queueItem.targetFormat = metadata.inputType === 'video' ? 'mp4' : 
                                  metadata.inputType === 'audio' ? 'mp3' : 'png';
        emitStatusChange(id, 'queued');
      }
    } catch (err) {
      const queueItem = queue.find(i => i.id === id);
      if (queueItem) {
        queueItem.status = 'failed';
        queueItem.error = err instanceof Error ? err.message : 'Unknown error';
        emitStatusChange(id, 'failed', queueItem.error);
      }
    }
  }

  return newItems;
}

export function removeItem(id: string): boolean {
  const index = queue.findIndex(item => item.id === id);
  if (index === -1) return false;

  const item = queue[index];

  // If item is currently processing, cancel it first
  if (item.id === currentItemId && currentWorker) {
    cancelCurrentItem();
  }

  queue.splice(index, 1);
  return true;
}

export function updateItemSettings(
  id: string, 
  settings: Partial<{ targetFormat: string; preset: string; crf: number; audioBitrate: number; trimStart?: number; trimEnd?: number; outputPath: string; }>
): boolean {
  const item = queue.find(i => i.id === id);
  if (!item) return false;

  if (settings.targetFormat !== undefined) {
    item.targetFormat = settings.targetFormat;
    // Re-resolve output path with new format
    const resolved = resolveOutputPath(item.sourcePath, settings.targetFormat);
    item.outputPath = resolved.outputPath;
  }
  if (settings.preset !== undefined) {
    item.preset = settings.preset as QueueItem['preset'];
  }
  if (settings.crf !== undefined) {
    item.crf = settings.crf;
  }
  if (settings.audioBitrate !== undefined) {
    item.audioBitrate = settings.audioBitrate;
  }
  if (settings.trimStart !== undefined) {
    item.trimStart = settings.trimStart;
  }
  if (settings.trimEnd !== undefined) {
    item.trimEnd = settings.trimEnd;
  }
  if (settings.outputPath !== undefined) {
    item.outputPath = settings.outputPath;
  }

  return true;
}

export function startQueue(): boolean {
  if (isProcessing) return false;
  processNextItem();
  return true;
}

export function cancelItem(id: string): boolean {
  const item = queue.find(i => i.id === id);
  if (!item) return false;

  if (item.id === currentItemId && currentWorker) {
    cancelCurrentItem();
    item.status = 'cancelled';
    emitStatusChange(id, 'cancelled');
    return true;
  }

  // For non-current items, just mark as cancelled
  if (item.status === 'queued' || item.status === 'pending') {
    item.status = 'cancelled';
    emitStatusChange(id, 'cancelled');
    return true;
  }

  return false;
}

export function cancelAll(): void {
  // Cancel current item if processing
  if (currentItemId && currentWorker) {
    cancelCurrentItem();
  }

  // Mark all pending/queued items as cancelled
  for (const item of queue) {
    if (item.status === 'queued' || item.status === 'pending') {
      item.status = 'cancelled';
      emitStatusChange(item.id, 'cancelled');
    }
  }
}

export function retryItem(id: string): boolean {
  const item = queue.find(i => i.id === id);
  if (!item) return false;

  if (item.status === 'failed' || item.status === 'cancelled') {
    // Re-resolve output path in case file system state changed
    const resolved = resolveOutputPath(item.sourcePath, item.targetFormat);
    item.outputPath = resolved.outputPath;
    
    item.status = 'queued';
    item.error = undefined;
    item.percent = 0;
    emitStatusChange(id, 'queued');

    // If nothing is currently processing, start processing
    if (!isProcessing) {
      processNextItem();
    }
    return true;
  }

  return false;
}

function cancelCurrentItem(): void {
  if (currentWorker) {
    currentWorker.postMessage({ type: 'cancel' });
    // Worker will handle SIGKILL and respond with 'cancelled'
  }
}

async function processNextItem(): Promise<void> {
  // Find next queued item
  const nextItem = queue.find(item => item.status === 'queued');
  if (!nextItem) {
    isProcessing = false;
    currentItemId = null;
    return;
  }

  isProcessing = true;
  currentItemId = nextItem.id;
  nextItem.status = 'converting';
  nextItem.percent = 0;
  emitStatusChange(nextItem.id, 'converting');
  emitProgress(nextItem.id, 0);

  // Check source file exists
  if (!fs.existsSync(nextItem.sourcePath)) {
    nextItem.status = 'failed';
    nextItem.error = 'Source file not found';
    emitStatusChange(nextItem.id, 'failed', nextItem.error);
    isProcessing = false;
    currentItemId = null;
    processNextItem();
    return;
  }

  // Check output directory is writable
  const outputDir = path.dirname(nextItem.outputPath);
  try {
    fs.accessSync(outputDir, fs.constants.W_OK);
  } catch {
    nextItem.status = 'failed';
    nextItem.error = 'Output directory is not writable';
    emitStatusChange(nextItem.id, 'failed', nextItem.error);
    isProcessing = false;
    currentItemId = null;
    processNextItem();
    return;
  }

  // Build ffmpeg arguments
  const ffmpegArgs = buildFfmpegArgs({
    id: nextItem.id,
    sourcePath: nextItem.sourcePath,
    outputPath: nextItem.outputPath,
    targetFormat: nextItem.targetFormat,
    trimStart: nextItem.trimStart,
    trimEnd: nextItem.trimEnd,
    preset: nextItem.preset,
    crf: nextItem.crf,
    audioBitrate: nextItem.audioBitrate,
    duration: nextItem.metadata?.duration,
    videoCodec: nextItem.metadata?.videoCodec,
    audioCodec: nextItem.metadata?.audioCodec,
    width: nextItem.metadata?.width,
    height: nextItem.metadata?.height,
    frameRate: nextItem.metadata?.frameRate ?? undefined,
    isVfr: nextItem.metadata?.isVfr,
    inputType: nextItem.metadata?.inputType,
  });

  // Get ffmpeg path
  const ffmpegPath = getFfmpegPath();

  // Create worker for encoding
  const workerPath = path.join(__dirname, 'workers', 'encode.js');
  
  try {
    currentWorker = new Worker(workerPath, {
      workerData: {
        ffmpegPath,
        args: ffmpegArgs,
        outputPath: nextItem.outputPath,
      },
    });

    currentWorker.on('message', (msg: { type: string; percent?: number; outputSize?: number; message?: string }) => {
      if (msg.type === 'progress' && msg.percent !== undefined) {
        nextItem.percent = msg.percent;
        emitProgress(nextItem.id, msg.percent);
      } else if (msg.type === 'done') {
        nextItem.status = 'done';
        nextItem.percent = 100;
        nextItem.outputSize = msg.outputSize;
        emitStatusChange(nextItem.id, 'done');
        emitProgress(nextItem.id, 100);
        finishCurrentItem();
      } else if (msg.type === 'error') {
        nextItem.status = 'failed';
        nextItem.error = msg.message || 'Encoding failed';
        emitStatusChange(nextItem.id, 'failed', nextItem.error);
        // Clean up partial output
        deleteFileIfExists(nextItem.outputPath);
        finishCurrentItem();
      } else if (msg.type === 'cancelled') {
        nextItem.status = 'cancelled';
        emitStatusChange(nextItem.id, 'cancelled');
        // Clean up partial output
        deleteFileIfExists(nextItem.outputPath);
        finishCurrentItem();
      } else if (msg.type === 'indeterminate') {
        // Stream copy - progress is indeterminate
        emitProgress(nextItem.id, -1); // -1 indicates indeterminate
      }
    });

    currentWorker.on('error', (err) => {
      nextItem.status = 'failed';
      nextItem.error = err.message;
      emitStatusChange(nextItem.id, 'failed', err.message);
      deleteFileIfExists(nextItem.outputPath);
      finishCurrentItem();
    });

    currentWorker.on('exit', (code) => {
      if (code !== 0 && code !== null && nextItem.status === 'converting') {
        nextItem.status = 'failed';
        nextItem.error = `Worker exited with code ${code}`;
        emitStatusChange(nextItem.id, 'failed', nextItem.error);
        deleteFileIfExists(nextItem.outputPath);
        finishCurrentItem();
      }
    });
  } catch (err) {
    nextItem.status = 'failed';
    nextItem.error = err instanceof Error ? err.message : 'Failed to spawn worker';
    emitStatusChange(nextItem.id, 'failed', nextItem.error);
    finishCurrentItem();
  }
}

function finishCurrentItem(): void {
  isProcessing = false;
  currentItemId = null;
  currentWorker = null;
  
  // Process next item in queue
  setImmediate(() => processNextItem());
}

function generateId(): string {
  return `item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
