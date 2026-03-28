# Architecture

How the ffmpreg system works — components, relationships, data flows, invariants.

---

## Three-Layer Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Renderer (React 19)                                    │
│  - FileDropZone, FormatSelector, QualityPreset          │
│  - EncodeProgress, CompletionDisplay                    │
│  - Sends actions via IPC →                            │
└─────────────────────┬───────────────────────────────────┘
                      │ IPC (contextBridge)
┌─────────────────────▼───────────────────────────────────┐
│  Main Process (Electron)                               │
│  - Queue management                                    │
│  - ffprobe for metadata                                │
│  - Spawns ffmpeg workers                               │
│  - Streams progress → renderer                          │
└─────────────────────┬───────────────────────────────────┘
                      │ Worker Threads
┌─────────────────────▼───────────────────────────────────┐
│  Worker Thread (encode.ts)                             │
│  - Spawns ffmpeg process                               │
│  - Parses stderr for progress                          │
│  - Sends progress back to main                         │
└─────────────────────────────────────────────────────────┘
```

## Data Flow

1. User drops file → Renderer sends paths to main via IPC
2. Main runs ffprobe → Returns metadata (duration, codecs, resolution, bitrate, size)
3. Renderer shows format options with presets → User picks format + quality
4. Main spawns worker with ffmpeg command → Worker streams progress
5. Renderer updates progress bar → On completion, shows output file + size comparison

## Key Invariants

- **One ffmpeg at a time** — queue processes sequentially, never parallel
- **Quality guardrails enforced** — CRF slider is bounded by preset range in UI
- **Size estimation** — uses compression ratio * source size, displayed with ~ prefix
- **Output naming** — source filename with new extension, conflicts resolved with -1,-2 suffix
- **Cancellation cleanup** — partial output files are deleted within 2 seconds of cancel

## Preset System

| Preset | CRF Range | Audio Bitrate | Compression Ratio |
|--------|-----------|---------------|------------------|
| Compact | 28-35 | 128k | 0.25 |
| Good | 22-28 | 192k | 0.40 |
| High | 18-23 | 256k | 0.65 |
| Custom | 18-35 | 128-320k | 0.40 |
