export type InputType = 'video' | 'audio' | 'image';

export interface SourceMeta {
  path: string;
  fileName: string;
  inputType: InputType;
  duration: number; // seconds, 0 for images
  width: number;
  height: number;
  videoCodec: string | null;
  audioCodec: string | null;
  audioChannels: number;
  audioSampleRate: number;
  bitrate: number; // bits per second
  fileSize: number; // bytes
  frameRate: number | null; // null for VFR or non-video
  isVfr: boolean;
  streams: MediaStream[];
}

export interface MediaStream {
  index: number;
  type: 'video' | 'audio' | 'subtitle';
  codec: string;
  language: string | null;
  channels?: number;
  sampleRate?: number;
  title: string | null;
}

export type PresetName = 'compact' | 'good' | 'high' | 'custom';

export interface QualitySettings {
  preset: PresetName;
  crf: number; // or quality 1-100 for images
  audioBitrate: number; // kbps
}

export interface TrimRange {
  start: number; // seconds
  end: number;   // seconds
}

export interface OutputSettings {
  format: string;
  quality: QualitySettings;
  trim: TrimRange | null;
  mode: 'convert' | 'extract';
  extractStreamIndex: number | null; // stream index for extraction
}

export type QueueItemStatus = 'analyzing' | 'queued' | 'converting' | 'done' | 'failed' | 'cancelled';

export interface QueueItem {
  id: string;
  source: SourceMeta;
  settings: OutputSettings;
  status: QueueItemStatus;
  progress: number; // 0-100
  error: string | null;
  outputPath: string | null;
  outputSize: number | null; // bytes, set on completion
}
