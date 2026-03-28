/**
 * FFprobe integration for extracting media metadata.
 */

import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

// ffprobe-static path - resolved at runtime
let ffprobePath: string | null = null;

function getFfprobePath(): string {
  if (ffprobePath) return ffprobePath;
  
  let resolvedPath: string | null = null;
  
  try {
    // Try to require ffprobe-static
    resolvedPath = require('ffprobe-static').path;
  } catch {
    // Fallback for packaged app
    const resourcesPath = process.resourcesPath || path.join(__dirname, '../../..');
    resolvedPath = path.join(resourcesPath, 'ffmpeg', 'ffprobe');
    
    if (!fs.existsSync(resolvedPath)) {
      // Try without extension for different platforms
      const possiblePaths = [
        path.join(resourcesPath, 'ffmpeg', 'ffprobe.exe'),
        '/usr/bin/ffprobe',
        '/usr/local/bin/ffprobe',
      ];
      
      for (const p of possiblePaths) {
        if (fs.existsSync(p)) {
          resolvedPath = p;
          break;
        }
      }
    }
  }
  
  ffprobePath = resolvedPath;
  return ffprobePath || '/usr/bin/ffprobe';
}

export interface MediaMetadata {
  duration: number;
  width?: number;
  height?: number;
  videoCodec: string | null;
  audioCodec: string | null;
  frameRate: number | null;
  isVfr: boolean;
  inputType: 'video' | 'audio' | 'image';
  bitrate?: number;
  size: number;
}

interface FFProbeStream {
  codec_type: 'video' | 'audio' | 'image' | 'data' | 'subtitle';
  codec_name?: string;
  width?: number;
  height?: number;
  r_frame_rate?: string;
  duration?: number;
}

interface FFProbeFormat {
  duration?: string;
  size?: string;
  bit_rate?: string;
  format_name?: string;
}

interface FFProbeOutput {
  streams?: FFProbeStream[];
  format?: FFProbeFormat;
}

/**
 * Probe a media file and return its metadata.
 */
export function probeFile(filePath: string): Promise<MediaMetadata> {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      reject(new Error(`File not found: ${filePath}`));
      return;
    }

    const ffprobeBin = getFfprobePath();
    
    const args = [
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      filePath,
    ];

    const proc = spawn(ffprobeBin, args);
    let stdout = '';
    let stderr = '';

    proc.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    proc.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe exited with code ${code}: ${stderr}`));
        return;
      }

      try {
        const output: FFProbeOutput = JSON.parse(stdout);
        const metadata = parseFFProbeOutput(output, filePath);
        resolve(metadata);
      } catch (err) {
        reject(new Error(`Failed to parse ffprobe output: ${err}`));
      }
    });

    proc.on('error', (err) => {
      reject(new Error(`Failed to spawn ffprobe: ${err.message}`));
    });
  });
}

function parseFFProbeOutput(output: FFProbeOutput, filePath: string): MediaMetadata {
  const streams = output.streams || [];
  const format = output.format || {};

  // Find video, audio, and image streams
  const videoStream = streams.find(s => s.codec_type === 'video');
  const audioStream = streams.find(s => s.codec_type === 'audio');

  // Determine input type
  let inputType: 'video' | 'audio' | 'image' = 'video';
  if (videoStream) {
    inputType = 'video';
  } else if (audioStream) {
    inputType = 'audio';
  } else {
    // Check file extension for images
    const ext = path.extname(filePath).toLowerCase();
    if (['.png', '.jpg', '.jpeg', '.webp', '.gif', '.bmp'].includes(ext)) {
      inputType = 'image';
    }
  }

  // Parse frame rate
  let frameRate: number | null = null;
  if (videoStream?.r_frame_rate) {
    const parts = videoStream.r_frame_rate.split('/');
    if (parts.length === 2) {
      const num = parseInt(parts[0], 10);
      const den = parseInt(parts[1], 10);
      if (den > 0) {
        frameRate = num / den;
      }
    }
  }

  // Get duration
  let duration = 0;
  if (format.duration) {
    duration = parseFloat(format.duration) || 0;
  } else if (videoStream?.duration) {
    duration = parseFloat(String(videoStream.duration)) || 0;
  } else if (audioStream?.duration) {
    duration = parseFloat(String(audioStream.duration)) || 0;
  }

  // Get file size
  let size = 0;
  if (format.size) {
    size = parseInt(format.size, 10);
  } else {
    try {
      size = fs.statSync(filePath).size;
    } catch {
      size = 0;
    }
  }

  // Detect VFR by checking if frame rate varies (this is a simplified check)
  const isVfr = frameRate === null || frameRate === 0;

  return {
    duration,
    width: videoStream?.width,
    height: videoStream?.height,
    videoCodec: videoStream?.codec_name || null,
    audioCodec: audioStream?.codec_name || null,
    frameRate,
    isVfr,
    inputType,
    bitrate: format.bit_rate ? parseInt(format.bit_rate, 10) : undefined,
    size,
  };
}

/**
 * Check if ffprobe is available.
 */
export function isFfprobeAvailable(): boolean {
  try {
    const ffprobeBin = getFfprobePath();
    return fs.existsSync(ffprobeBin);
  } catch {
    return false;
  }
}
