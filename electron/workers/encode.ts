/**
 * Encode worker — runs in a Node.js Worker Thread.
 *
 * Receives: { args: string[], outputPath: string, isStreamCopy: boolean, duration?: number }
 * Sends back messages:
 *   { type: 'progress', percent: number }
 *   { type: 'indeterminate' }
 *   { type: 'done', outputSize: number }
 *   { type: 'error', message: string }
 *   { type: 'cancelled' }
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { parentPort, workerData } from 'node:worker_threads';
import { statSync } from 'node:fs';
import ffmpegPath from 'ffmpeg-static';

const ffmpeg = ffmpegPath as unknown as string;

if (!ffmpeg) {
  throw new Error('ffmpeg-static did not resolve a binary path');
}

interface EncodeMessage {
  args: string[];
  outputPath: string;
  isStreamCopy: boolean;
  duration?: number;
}

let cancelled = false;
let child: ChildProcess | null = null;

// Throttle progress to at most once per second
let lastProgressTime = 0;

/**
 * Parse a time string like "01:23:45.67" or "123.45" into seconds.
 */
function parseTimeToSeconds(time: string): number {
  // HH:MM:SS.ms format
  if (time.includes(':')) {
    const parts = time.split(':');
    const hours = Number(parts[0]) || 0;
    const minutes = Number(parts[1]) || 0;
    const seconds = Number(parts[2]) || 0;
    return hours * 3600 + minutes * 60 + seconds;
  }
  return parseFloat(time) || 0;
}

function send(msg: Record<string, unknown>): void {
  parentPort?.postMessage(msg);
}

function handleCancel(): void {
  cancelled = true;
  if (child && !child.killed) {
    child.kill('SIGKILL');
  }
}

parentPort?.on('message', (msg: { type: string }) => {
  if (msg.type === 'cancel') {
    handleCancel();
  }
});

// If workerData is provided at thread creation, start immediately
if (workerData) {
  run(workerData as EncodeMessage);
} else {
  // Otherwise wait for a 'start' message
  parentPort?.on('message', (msg: EncodeMessage & { type?: string }) => {
    if (msg.type === 'start' || (msg as EncodeMessage).args) {
      run(msg as EncodeMessage);
    }
  });
}

function run(config: EncodeMessage): void {
  const { args, outputPath, isStreamCopy, duration } = config;

  if (isStreamCopy) {
    send({ type: 'indeterminate' });
  }

  child = spawn(ffmpeg, args);

  let stderrBuffer = '';

  child.stderr?.on('data', (chunk: Buffer) => {
    const text = chunk.toString();
    stderrBuffer += text;

    // Keep only last 2KB for error reporting
    if (stderrBuffer.length > 4096) {
      stderrBuffer = stderrBuffer.slice(-2048);
    }

    // Parse progress from stderr "time=..." lines
    if (duration && duration > 0 && !isStreamCopy) {
      const timeMatch = text.match(/time=\s*(\d+:\d+:\d+\.\d+|\d+\.\d+)/);
      if (timeMatch) {
        const currentTime = parseTimeToSeconds(timeMatch[1]);
        const percent = Math.min(100, (currentTime / duration) * 100);

        const now = Date.now();
        if (now - lastProgressTime >= 1000) {
          lastProgressTime = now;
          send({ type: 'progress', percent: Math.round(percent * 10) / 10 });
        }
      }
    }
  });

  child.on('close', (code) => {
    if (cancelled) {
      send({ type: 'cancelled' });
      return;
    }

    if (code === 0) {
      try {
        const stats = statSync(outputPath);
        send({ type: 'done', outputSize: stats.size });
      } catch {
        send({ type: 'done', outputSize: 0 });
      }
    } else {
      const errorLines = stderrBuffer.trim().split('\n').slice(-5).join('\n');
      send({ type: 'error', message: errorLines || `ffmpeg exited with code ${code}` });
    }
  });

  child.on('error', (err) => {
    send({ type: 'error', message: err.message });
  });
}
