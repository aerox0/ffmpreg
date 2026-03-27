import type { QueueItem, OutputSettings } from '../types/index';

// Queue management
export type AddFilesResult = QueueItem[];

export interface UpdateSettingsParams {
  id: string;
  settings: Partial<OutputSettings>;
}

// Encoding events (received by renderer)
export interface EncodeProgressEvent {
  id: string;
  percent: number;
}

export interface EncodeStatusEvent {
  id: string;
  status: QueueItem['status'];
  error?: string;
}

// File operations
export type WaveformResult = number[]; // amplitude values

// Settings
export interface AppSettings {
  outputDir: string | null;
  overwriteBehavior: 'auto-rename' | 'prompt' | 'skip';
}

export type SettingsResult = AppSettings;
