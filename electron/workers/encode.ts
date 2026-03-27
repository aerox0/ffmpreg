import { parentPort, workerData } from 'node:worker_threads';
import { spawn } from 'node:child_process';
import { statSync } from 'node:fs';
import ffmpegStatic from 'ffmpeg-static';

interface EncodeJob {
  args: string[];
  outputPath: string;
  isStreamCopy: boolean;
}

type WorkerMessage =
  | { type: 'progress'; percent: number }
  | { type: 'indeterminate' }
  | { type: 'done'; outputSize: number }
  | { type: 'error'; message: string }
  | { type: 'cancelled' };

const job = workerData as EncodeJob;

if (!parentPort) {
  throw new Error('encode.ts must run as a worker thread');
}

let lastProgressTime = 0;
const PROGRESS_INTERVAL_MS = 1000;

function sendMessage(msg: WorkerMessage) {
  parentPort!.postMessage(msg);
}

// For stream copy, ffmpeg doesn't report progress - emit indeterminate once
if (job.isStreamCopy) {
  sendMessage({ type: 'indeterminate' });
}

const ffmpegPath = ffmpegStatic;
if (!ffmpegPath) {
  sendMessage({ type: 'error', message: 'ffmpeg-static binary not found' });
  process.exit(1);
}

const proc = spawn(ffmpegPath, job.args);

// Accumulate stderr for progress parsing
let stderr = '';

// Try to extract duration from args for progress calculation
// Look for -t or -to in args to get expected duration
const toIndex = job.args.indexOf('-to');
const tIndex = job.args.indexOf('-t');
let expectedDuration = 0;
if (toIndex !== -1 && toIndex < job.args.length - 1) {
  expectedDuration = parseFloat(job.args[toIndex + 1]);
} else if (tIndex !== -1 && tIndex < job.args.length - 1) {
  const tVal = parseFloat(job.args[tIndex + 1]);
  const ssIndex = job.args.indexOf('-ss');
  const ssVal = ssIndex !== -1 && ssIndex < job.args.length - 1 ? parseFloat(job.args[ssIndex + 1]) : 0;
  expectedDuration = tVal - ssVal;
}

proc.stderr!.on('data', (chunk: Buffer | string) => {
  stderr += String(chunk);

  if (expectedDuration > 0) {
    const lines = stderr.split('\n');
    for (const line of lines) {
      const match = line.match(/time=(\d{2}):(\d{2}):(\d{2}\.?\d*)/);
      if (match) {
        const hours = parseInt(match[1], 10);
        const minutes = parseInt(match[2], 10);
        const seconds = parseFloat(match[3]);
        const currentTime = hours * 3600 + minutes * 60 + seconds;

        const now = Date.now();
        if (now - lastProgressTime >= PROGRESS_INTERVAL_MS) {
          const percent = Math.min(99, Math.round((currentTime / expectedDuration) * 100));
          sendMessage({ type: 'progress', percent });
          lastProgressTime = now;
        }
      }
    }
  }
});

proc.on('close', (code) => {
  if (code === 0) {
    // Success - get output file size
    try {
      const stats = statSync(job.outputPath);
      sendMessage({ type: 'done', outputSize: stats.size });
    } catch {
      sendMessage({ type: 'done', outputSize: 0 });
    }
  } else if (code === null) {
    // Process was killed (cancelled)
    sendMessage({ type: 'cancelled' });
  } else {
    // Extract error message from stderr
    const errorLines = stderr.split('\n').filter(Boolean).slice(-5).join(' ');
    sendMessage({ type: 'error', message: errorLines || `ffmpeg exited with code ${code}` });
  }
});

proc.on('error', (err) => {
  sendMessage({ type: 'error', message: err.message });
});

// Handle cancellation via worker termination
parentPort.on('message', (msg: { type: 'cancel' }) => {
  if (msg.type === 'cancel') {
    proc.kill('SIGKILL');
  }
});
