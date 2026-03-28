import { describe, it, expect, beforeEach } from 'vitest';
import { resolveOutputPath, getOutputDir } from './output-path';
import * as fs from 'fs';
import * as path from 'path';

describe('output-path', () => {
  const testDir = '/tmp/ffmpreg-test';
  
  beforeEach(() => {
    // Create test directory if it doesn't exist
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
  });

  describe('getOutputDir', () => {
    it('returns source directory when no custom dir provided', () => {
      const sourcePath = '/home/user/videos/test.mp4';
      const result = getOutputDir(sourcePath);
      expect(result).toBe('/home/user/videos');
    });

    it('returns custom dir when it exists', () => {
      const sourcePath = '/home/user/videos/test.mp4';
      const customDir = path.join(testDir, 'custom-output');
      
      // Create the custom dir
      if (!fs.existsSync(customDir)) {
        fs.mkdirSync(customDir, { recursive: true });
      }
      
      const result = getOutputDir(sourcePath, customDir);
      expect(result).toBe(customDir);
    });

    it('returns source directory when custom dir does not exist', () => {
      const sourcePath = '/home/user/videos/test.mp4';
      const customDir = '/nonexistent/directory';
      
      const result = getOutputDir(sourcePath, customDir);
      expect(result).toBe('/home/user/videos');
    });
  });

  describe('resolveOutputPath', () => {
    it('returns source directory path with new extension when no conflict', () => {
      const sourcePath = path.join(testDir, 'video.mp4');
      const result = resolveOutputPath(sourcePath, 'mkv');
      
      expect(result.outputPath).toBe(path.join(testDir, 'video.mkv'));
      expect(result.conflictResolved).toBe(false);
    });

    it('detects conflict with existing file and resolves with -1 suffix', () => {
      const sourcePath = path.join(testDir, 'video.mp4');
      const existingPath = path.join(testDir, 'video.mkv');
      
      // Create existing file
      fs.writeFileSync(existingPath, 'existing content');
      
      const result = resolveOutputPath(sourcePath, 'mkv');
      
      expect(result.outputPath).toBe(path.join(testDir, 'video-1.mkv'));
      expect(result.conflictResolved).toBe(true);
      
      // Cleanup
      fs.unlinkSync(existingPath);
    });

    it('detects conflict with existing file and resolves with -2 suffix when -1 exists', () => {
      const sourcePath = path.join(testDir, 'video.mp4');
      const existingPath1 = path.join(testDir, 'video.mkv');
      const existingPath2 = path.join(testDir, 'video-1.mkv');
      
      // Create existing files
      fs.writeFileSync(existingPath1, 'existing content 1');
      fs.writeFileSync(existingPath2, 'existing content 2');
      
      const result = resolveOutputPath(sourcePath, 'mkv');
      
      expect(result.outputPath).toBe(path.join(testDir, 'video-2.mkv'));
      expect(result.conflictResolved).toBe(true);
      
      // Cleanup
      fs.unlinkSync(existingPath1);
      fs.unlinkSync(existingPath2);
    });

    it('detects conflict with paths already in queue (existingPaths)', () => {
      const sourcePath = path.join(testDir, 'video.mp4');
      const existingPaths = new Set([path.join(testDir, 'video.mkv')]);
      
      const result = resolveOutputPath(sourcePath, 'mkv', existingPaths);
      
      expect(result.outputPath).toBe(path.join(testDir, 'video-1.mkv'));
      expect(result.conflictResolved).toBe(true);
    });

    it('uses custom output directory when provided', () => {
      const sourcePath = path.join(testDir, 'source', 'video.mp4');
      const outputDir = path.join(testDir, 'output');
      
      // Create directories
      if (!fs.existsSync(path.join(testDir, 'source'))) {
        fs.mkdirSync(path.join(testDir, 'source'), { recursive: true });
      }
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
      }
      
      const result = resolveOutputPath(sourcePath, 'mkv', new Set(), outputDir);
      
      expect(result.outputPath).toBe(path.join(outputDir, 'video.mkv'));
    });

    it('returns original path when no conflict exists', () => {
      const sourcePath = path.join(testDir, 'unique-video-123.mp4');
      
      // Ensure no file exists at target path
      const targetPath = path.join(testDir, 'unique-video-123.mkv');
      if (fs.existsSync(targetPath)) {
        fs.unlinkSync(targetPath);
      }
      
      const result = resolveOutputPath(sourcePath, 'mkv');
      
      expect(result.outputPath).toBe(targetPath);
      expect(result.conflictResolved).toBe(false);
    });

    it('preserves full path complexity', () => {
      const sourcePath = '/home/user/videos/holidays/2024/summer/video.mp4';
      const result = resolveOutputPath(sourcePath, 'webm');
      
      expect(result.outputPath).toBe('/home/user/videos/holidays/2024/summer/video.webm');
    });
  });
});
