/**
 * FFmpeg binary path resolution.
 */

import * as path from 'path';
import * as fs from 'fs';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

let ffmpegPath: string | null = null;

export function getFfmpegPath(): string {
  if (ffmpegPath) return ffmpegPath;

  try {
    // Try to require ffmpeg-static
    ffmpegPath = require('ffmpeg-static');
  } catch {
    // Fallback for packaged app
    const resourcesPath = process.resourcesPath || path.join(__dirname, '../../..');
    ffmpegPath = path.join(resourcesPath, 'ffmpeg', 'ffmpeg');

    if (!fs.existsSync(ffmpegPath)) {
      // Try without extension for different platforms
      const possiblePaths = [
        path.join(resourcesPath, 'ffmpeg', 'ffmpeg.exe'),
        '/usr/bin/ffmpeg',
        '/usr/local/bin/ffmpeg',
      ];

      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          ffmpegPath = p;
          break;
        }
      }
    }
  }

  // Validate path exists
  if (!ffmpegPath || !fs.existsSync(ffmpegPath)) {
    throw new Error(`ffmpeg binary not found`);
  }

  return ffmpegPath;
}

export function isFfmpegAvailable(): boolean {
  try {
    const ffmpegBin = getFfmpegPath();
    return fs.existsSync(ffmpegBin);
  } catch {
    return false;
  }
}
