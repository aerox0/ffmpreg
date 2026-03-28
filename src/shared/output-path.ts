/**
 * Output path resolution with conflict handling.
 */

import * as path from 'path';
import * as fs from 'fs';

export interface OutputPathResult {
  outputPath: string;
  conflictResolved: boolean;
}

/**
 * Get the output directory for a file.
 * Uses customDir if provided, otherwise defaults to source file's directory.
 */
export function getOutputDir(sourcePath: string, customDir?: string): string {
  if (customDir && fs.existsSync(customDir)) {
    return customDir;
  }
  return path.dirname(sourcePath);
}

/**
 * Generate the base output filename from source filename and target format.
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function _getBaseOutputFilename(sourcePath: string, targetFormat: string): string {
  const dir = path.dirname(sourcePath);
  const ext = path.extname(sourcePath);
  const basename = path.basename(sourcePath, ext);
  return path.join(dir, `${basename}.${targetFormat}`);
}

/**
 * Check if a path exists.
 */
function pathExists(p: string): boolean {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

/**
 * Resolve output path with conflict resolution.
 * If the target path exists, appends -1, -2, etc. until a free name is found.
 * 
 * @param sourcePath - Original source file path
 * @param targetFormat - Target file extension/format
 * @param existingPaths - Set of paths already in use in the queue (to avoid conflicts within queue)
 * @param outputDir - Optional custom output directory
 * @returns { outputPath, conflictResolved }
 */
export function resolveOutputPath(
  sourcePath: string,
  targetFormat: string,
  existingPaths: Set<string> = new Set(),
  outputDir?: string
): OutputPathResult {
  // Determine output directory
  const baseDir = outputDir || path.dirname(sourcePath);
  
  // Generate base filename
  const ext = path.extname(sourcePath);
  const basename = path.basename(sourcePath, ext);
  const candidateName = `${basename}.${targetFormat}`;
  const candidatePath = path.join(baseDir, candidateName);
  
  // Check if this path is already in use in the queue
  if (existingPaths.has(candidatePath)) {
    return findAvailablePath(baseDir, candidateName, existingPaths);
  }
  
  // Check if file exists on disk
  if (pathExists(candidatePath)) {
    return findAvailablePath(baseDir, candidateName, existingPaths);
  }
  
  return {
    outputPath: candidatePath,
    conflictResolved: false,
  };
}

/**
 * Find an available path by appending -1, -2, etc.
 */
function findAvailablePath(
  baseDir: string,
  baseName: string,
  existingPaths: Set<string>
): OutputPathResult {
  const ext = path.extname(baseName);
  const nameWithoutExt = path.basename(baseName, ext);
  
  let counter = 1;
  let candidatePath: string;
  
  do {
    const newName = `${nameWithoutExt}-${counter}${ext}`;
    candidatePath = path.join(baseDir, newName);
    counter++;
    
    // Safety limit to prevent infinite loop
    if (counter > 1000) {
      throw new Error(`Could not find available output path after 1000 attempts`);
    }
  } while (
    existingPaths.has(candidatePath) || 
    pathExists(candidatePath)
  );
  
  return {
    outputPath: candidatePath,
    conflictResolved: true,
  };
}

/**
 * Delete a file if it exists.
 * Returns true if file was deleted, false if it didn't exist.
 */
export function deleteFileIfExists(filePath: string): boolean {
  try {
    if (pathExists(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
  } catch (err) {
    console.error(`Failed to delete file ${filePath}:`, err);
  }
  return false;
}

/**
 * Get file size in bytes.
 * Returns 0 if file doesn't exist.
 */
export function getFileSize(filePath: string): number {
  try {
    const stats = fs.statSync(filePath);
    return stats.size;
  } catch {
    return 0;
  }
}

/**
 * Format file size as human-readable string.
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const size = bytes / Math.pow(1024, i);
  
  if (i === 0) return `${size} B`;
  return `${size.toFixed(1)} ${units[i]}`;
}
