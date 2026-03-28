/**
 * FFmpeg encoding worker thread.
 * 
 * This worker receives ffmpeg arguments and spawns ffmpeg process,
 * parsing stderr for progress updates and streaming them back to main.
 * 
 * Key behaviors:
 * - Progress updates emitted at least once per second during transcode
 * - Stream copy operations emit indeterminate progress immediately
 * - Cancellation terminates ffmpeg within 2 seconds via SIGKILL
 * - Done message includes output file size
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

/**
 * Check if the ffmpeg args indicate a stream copy operation.
 * Stream copy uses -c:v copy which means no re-encoding.
 */
function isStreamCopyOperation(args: string[]): boolean {
  // Look for -c:v copy or -c:v 'copy' in the arguments
  for (let i = 0; i < args.length - 1; i++) {
    if ((args[i] === '-c:v' || args[i] === '-vcodec') && args[i + 1] === 'copy') {
      return true;
    }
  }
  return false;
}

function main() {
  const { ffmpegPath, args, outputPath } = workerData as WorkerData;

  let ffmpegProcess: ReturnType<typeof spawn> | null = null;
  let cancelled = false;
  let lastProgressTime = 0;
  let lastPercent = 0;
  let progressTimer: ReturnType<typeof setInterval> | null = null;
  let hasReceivedProgress = false;

  // Handle cancellation messages from main thread
  parentPort?.on('message', (msg: { type: string }) => {
    if (msg.type === 'cancel' && ffmpegProcess) {
      cancelled = true;
      // Send SIGKILL to ffmpeg for immediate termination
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
  const isStreamCopy = isStreamCopyOperation(args);

  // If stream copy, emit indeterminate progress immediately
  if (isStreamCopy) {
    sendMessage({ type: 'indeterminate' });
    hasReceivedProgress = true;
  }

  // Set up timer to emit progress at least once per second
  // This ensures we always send updates even if ffmpeg stderr output is delayed
  progressTimer = setInterval(() => {
    const now = Date.now();
    // If we've received progress before and at least 1 second has passed
    if (hasReceivedProgress && now - lastProgressTime >= 1000) {
      // Send the last known progress to keep the UI updated
      sendMessage({ type: 'progress', percent: lastPercent });
      lastProgressTime = now;
    }
  }, 250); // Check every 250ms

  ffmpegProcess.stderr?.on('data', (data: Buffer) => {
    stderr += data.toString();

    // For stream copy, we don't get time= progress, but we may get
    // "stream_copy" or similar markers in the output
    if (isStreamCopy) {
      // Stream copy is usually fast - watch for completion
      // We still rely on the close event for final status
      return;
    }

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
        lastPercent = percent;
        lastProgressTime = Date.now();
        hasReceivedProgress = true;
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
  });

  ffmpegProcess.on('close', (code) => {
    // Clear the progress timer
    if (progressTimer) {
      clearInterval(progressTimer);
      progressTimer = null;
    }

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
    // Clear the progress timer on error
    if (progressTimer) {
      clearInterval(progressTimer);
      progressTimer = null;
    }
    sendMessage({ type: 'error', message: err.message });
  });
}

function sendMessage(msg: ProgressMessage) {
  parentPort?.postMessage(msg);
}

main();
