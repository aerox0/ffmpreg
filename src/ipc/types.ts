import type { OutputSettings, QueueItem, QueueItemStatus } from '../types/index';

// ---------------------------------------------------------------------------
// File management
// ---------------------------------------------------------------------------

export type AddFilesParams = { paths: string[] };
export type AddFilesReturn = QueueItem[];

export type RemoveItemParams = { id: string };
export type RemoveItemReturn = void;

export type ClearDoneParams = Record<string, never>;
export type ClearDoneReturn = void;

// ---------------------------------------------------------------------------
// Item settings
// ---------------------------------------------------------------------------

export type UpdateSettingsParams = { id: string; settings: Partial<OutputSettings> };
export type UpdateSettingsReturn = void;

// ---------------------------------------------------------------------------
// Queue control
// ---------------------------------------------------------------------------

export type StartQueueParams = Record<string, never>;
export type StartQueueReturn = void;

export type CancelItemParams = { id: string };
export type CancelItemReturn = void;

export type CancelAllParams = Record<string, never>;
export type CancelAllReturn = void;

export type RetryItemParams = { id: string };
export type RetryItemReturn = void;

// ---------------------------------------------------------------------------
// Progress & status (main → renderer events)
// ---------------------------------------------------------------------------

export type ProgressEventPayload = { id: string; progress: number };

export type StatusChangeEventPayload = {
  id: string;
  status: QueueItemStatus;
  detail?: unknown;
};

// ---------------------------------------------------------------------------
// Waveform
// ---------------------------------------------------------------------------

export type GetWaveformParams = { filePath: string };
export type GetWaveformReturn = Float32Array; // normalised amplitude samples

// ---------------------------------------------------------------------------
// App settings
// ---------------------------------------------------------------------------

export interface AppSettings {
  outputDirectory: string | null;
  defaultPreset: string;
  theme: 'dark' | 'light' | 'system';
}

export type GetSettingsParams = Record<string, never>;
export type GetSettingsReturn = AppSettings;

export type UpdateAppSettingsParams = { settings: Partial<AppSettings> };
export type UpdateAppSettingsReturn = void;
