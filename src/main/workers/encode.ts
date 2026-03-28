/**
 * FFmpeg encoding worker thread.
 * 
 * This worker receives ffmpeg arguments and spawns ffmpeg process,
 * parsing stderr for progress updates and streaming them back to main.
 */

import { parentPort, workerData } from 'worker_threads';
import { spawn } from 'child_process';
import * as fs from 'fs';

interface WorkerData {
  ffmpegPath: string;
  args: string[];
  outputPath: string;
}

interface ProgressMessage {
  type: 'progress' | 'done' | 'error' | 'cancelled' | 'indeterminate';
  percent?: number;
  outputSize?: number;
  message?: string;
}

function main() {
  const { ffmpegPath, args, outputPath } = workerData as WorkerData;

  let ffmpegProcess: ReturnType<typeof spawn> | null = null;
  let cancelled = false;

  // Handle cancellation messages from main thread
  parentPort?.on('message', (msg: { type: string }) => {
    if (msg.type === 'cancel' && ffmpegProcess) {
      cancelled = true;
      // Send SIGKILL to ffmpeg
      ffmpegProcess.kill('SIGKILL');
    }
  });

  // Spawn ffmpeg process
  try {
    ffmpegProcess = spawn(ffmpegPath, args);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to spawn ffmpeg';
    sendMessage({ type: 'error', message });
    return;
  }

  let stderr = '';
  let durationMs = 0;

  ffmpegProcess.stderr?.on('data', (data: Buffer) => {
    stderr += data.toString();

    // Parse progress from stderr
    // Look for time=hh:mm:ss.ms pattern
    const timeMatch = stderr.match(/time=(\d{2}):(\d{2}):(\d{2}\.\d{2})/);
    if (timeMatch) {
      const hours = parseInt(timeMatch[1], 10);
      const minutes = parseInt(timeMatch[2], 10);
      const seconds = parseFloat(timeMatch[3]);
      const currentTimeMs = (hours * 3600 + minutes * 60 + seconds) * 1000;

      if (durationMs > 0) {
        const percent = Math.min(99, Math.round((currentTimeMs / durationMs) * 100));
        sendMessage({ type: 'progress', percent });
      }
    }

    // Try to extract duration for progress calculation
    const durationMatch = stderr.match(/Duration: (\d{2}):(\d{2}):(\d{2}\.\d{2})/);
    if (durationMatch && durationMs === 0) {
      const hours = parseInt(durationMatch[1], 10);
      const minutes = parseInt(durationMatch[2], 10);
      const seconds = parseFloat(durationMatch[3]);
      durationMs = (hours * 3600 + minutes * 60 + seconds) * 1000;
    }

    // Check for stream copy (no transcoding needed)
    if (stderr.includes('stream_copy') || stderr.includes('Output #0')) {
      // If we detect stream copy early, we may need indeterminate progress
    }
  });

  ffmpegProcess.on('close', (code) => {
    if (cancelled) {
      sendMessage({ type: 'cancelled' });
      // Clean up partial output
      try {
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
      } catch {
        // Ignore cleanup errors
      }
      return;
    }

    if (code === 0) {
      // Success - get output file size
      let outputSize = 0;
      try {
        const stats = fs.statSync(outputPath);
        outputSize = stats.size;
      } catch {
        // Ignore
      }
      sendMessage({ type: 'done', outputSize });
    } else {
      // Error - extract error message from stderr
      const errorMatch = stderr.match(/Error.*$/m) || stderr.match(/error.*$/mi);
      const message = errorMatch ? errorMatch[0] : `ffmpeg exited with code ${code}`;
      sendMessage({ type: 'error', message });
      
      // Clean up partial output
      try {
        if (fs.existsSync(outputPath)) {
          fs.unlinkSync(outputPath);
        }
      } catch {
        // Ignore
      }
    }
  });

  ffmpegProcess.on('error', (err) => {
    sendMessage({ type: 'error', message: err.message });
  });
}

function sendMessage(msg: ProgressMessage) {
  parentPort?.postMessage(msg);
}

main();
