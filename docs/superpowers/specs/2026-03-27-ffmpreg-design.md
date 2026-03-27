# ffmpreg — Design Spec

**Date:** 2026-03-27
**Status:** Approved

## Overview

A desktop ffmpeg frontend for non-technical users. The core experience is "save as" style format conversion — drag a file, pick a format, convert. Quality settings are guarded by presets with bounded ranges to prevent producing output that is larger and worse than the source.

## Stack

- **Electron** — desktop shell
- **React 19 + Vite** — renderer UI
- **TypeScript** — full stack (renderer + main process + workers)
- **ffmpeg-static** — bundled ffmpeg binary
- **Node.js worker threads** — encoding runs off the main process

## Architecture

Three layers communicating via IPC:

1. **Renderer (React)** — File drop zone, format picker, quality presets, trim timeline, queue list, progress bars. Sends user actions to main process via Electron IPC.

2. **Main process (Node.js)** — Orchestrator. Manages the file queue, runs `ffprobe` for source metadata, selects ffmpeg flags based on presets, spawns encoding workers, reports progress to renderer.

3. **Worker threads** — Each ffmpeg encode runs in a dedicated worker. Workers parse ffmpeg stderr for progress percentage and stream it back to main process.

### Data Flow

```
User drops file(s) → Renderer sends paths to main → Main runs ffprobe →
Returns metadata (duration, codecs, resolution, bitrate, size) →
Renderer shows format options with presets → User picks format + quality →
Main spawns worker with ffmpeg command → Worker streams progress →
Renderer updates progress bar → On completion, shows output file + size comparison
```

## UI Design

**Aesthetic:** Dark, film-editing inspired. Deep charcoal backgrounds with warm amber accent (`#e8a23a`).

**Layout:** Single-window, two-panel:

- **Left panel (420px):** File queue with drop zone at top, scrollable queue list below, action buttons at bottom. Each queue item shows filename, source format → target format, size, and status badge (Queued / Converting with % / Done / Failed). Active item highlighted.

- **Right panel (flex):** Detail view for the selected queue item. Sections stacked vertically:
  - File header (name, metadata)
  - Output format selector (pill buttons)
  - Quality presets + slider
  - Estimated output stats
  - Waveform trimmer (video/audio only)

## Quality Preset & Guardrail System

### Presets

| Preset | CRF range (video) | Audio bitrate | Description |
|--------|-------------------|---------------|-------------|
| Compact | 28-35 | 128k | Small file, decent quality |
| Good | 22-28 | 192k | Balanced (default) |
| High | 18-23 | 256k | Near-lossless, larger files |
| Custom | 18-35 | 128k-320k | Full slider range |

### Default codec mappings per container

| Container | Video codec | Audio codec |
|-----------|------------|-------------|
| MP4 | H.264 (`libx264`) | AAC (`aac`) |
| MOV | H.264 (`libx264`) | AAC (`aac`) |
| MKV | H.264 (`libx264`) | AAC (`aac`) |
| WebM | VP9 (`libvpx-vp9`) | Opus (`libopus`) |
| AVI | H.264 (`libx264`) | MP3 (`libmp3lame`) |
| GIF | GIF (palette-based) | N/A |
| MP3 | N/A | MP3 (`libmp3lame`) |
| AAC | N/A | AAC (`aac`) |
| WAV | N/A | PCM (`pcm_s16le`) |
| FLAC | N/A | FLAC (`flac`) |
| OGG | N/A | Vorbis (`libvorbis`) |

Users cannot override codec selection in v1. Each container maps to a single codec pair.

### GIF presets

GIF uses a separate preset table because CRF does not apply:

| Preset | FPS | Palette size | Description |
|--------|-----|-------------|-------------|
| Compact | 10 | 128 colors | Small file, lower motion |
| Good | 15 | 256 colors | Balanced (default) |
| High | 24 | 256 colors | Smoother, larger file |

### Image quality

Image conversion uses quality scales specific to each format:
- **JPEG:** Quality 1-100 (Compact: 60-70, Good: 75-85, High: 90-95)
- **WebP:** Quality 1-100 (same ranges as JPEG)
- **PNG:** No quality slider — lossless. Slider is hidden.

### Guardrail rules

- Slider range is bounded per preset — Compact physically cannot produce CRF 18, High physically cannot produce CRF 35.
- Custom preset exposes the full range (18-35 CRF) for users who accept the risk. The "larger than source" warning still fires.
- Available output formats adapt to input type: video input shows video containers + "Extract audio", audio input shows audio formats only, image input shows image formats only.
- Selecting GIF switches to the GIF preset table. Selecting an image format switches to image quality controls.

### Size estimation

Size estimation uses a per-preset compression factor derived from testing:

| Preset | Estimated ratio vs source |
|--------|--------------------------|
| Compact | 0.25 |
| Good | 0.40 |
| High | 0.65 |

Formula: `source_file_size * ratio * (trim_duration / full_duration)`. This is a rough heuristic — displayed with a `~` prefix to set expectations. Audio-only files use a simpler formula based on target bitrate × duration.

If estimated output exceeds source file size, an inline warning is shown: "Output may be larger than source. Consider a lower quality preset."

## Trim System

- **Waveform:** Generated from ffmpeg-extracted audio amplitude data (low-resolution PCM samples), rendered as bars in the renderer. For video files with no audio track, the trimmer still appears but shows a flat timeline — handles work by time only.
- **Trim handles:** Two draggable handles on the waveform. Region between handles highlighted in accent color, trimmed regions dimmed. For constant frame rate content, handles snap to the nearest frame boundary using the frame rate from ffprobe metadata. For variable frame rate content, snapping is disabled and handles use time-based positioning.
- **Time display:** Start/end times shown in monospace below waveform. Clickable to enter exact timestamps manually. Clip duration shown between them.
- **Playback:** Play/pause via native `<video>`/`<audio>` element, seeking to trim start point. Used for verifying cut positions, not quality preview.
- **ffmpeg mapping:** `-ss <start> -to <end>` placed after `-i` for frame-accurate cuts (slightly slower than input-side seeking, but correct).
- **Default:** No trim applied. Entire file shown in waveform. Trim section in detail panel is opt-in.

## Stream Extraction

When source has multiple streams, the format section shows a **Convert / Extract** toggle:

- **Convert (default):** Normal transcode with container presets.
- **Extract:** Lists extractable streams (e.g., "Audio track 1 (English, AAC 5.1)", "Subtitle track 1 (English SRT)", "Video only (no audio)"). Clicking a stream auto-selects an appropriate output format. Quality presets apply.

**Lossless copy:** When output format supports the source codec, uses stream copy (`-c:a copy` / `-c:v copy`) — instant, no re-encode. Only transcodes on format mismatch. Compatibility is determined via a hardcoded allowlist of known codec-container pairs. If a combination is not in the allowlist, the app transcodes.

## Batch Processing

- **Multi-file input:** Drop multiple files or browse with multi-select. Each file gets independent settings in the queue.
- **Bulk apply:** Select multiple queue items and apply the same format + quality preset to all.
- **Sequential execution:** One ffmpeg process at a time (ffmpeg is already multithreaded). Queue auto-advances on completion.
- **Individual overrides:** Any file can have its settings overridden via the detail panel.
- **Status tracking:** Queued → Converting (%) → Done / Failed. Failed items show error message with Retry button.
- **Output naming:** Source filename with new extension. Naming conflicts resolved with `-1`, `-2` suffixes. Output defaults to source directory, configurable via settings.

## Error Handling

- **Source errors** (corrupt file, unsupported format, unreadable): Item marked Failed immediately with error message from ffprobe output. "Retry" button re-analyzes the file.
- **Encoding errors** (ffmpeg crash, out of disk space): Worker sends error to main process. Item marked Failed with ffmpeg's error output. Partial output file is deleted. "Retry" restarts the encode.
- **Filesystem errors** (output dir not writable, permissions): Checked before encoding begins. Item marked Failed with descriptive message.
- **Worker crashes** (unhandled exception in worker thread): Main process detects worker exit with non-zero code. Item marked Failed with generic error message.

### Cancellation

- Each in-progress encode can be cancelled via an X button on the queue item. This kills the ffmpeg process, deletes the partial output file, and marks the item as Cancelled.
- "Cancel All" stops the current encode and clears remaining queued items.
- Cancelled items can be restarted via Retry.

## Settings

Persisted via `electron-store` (JSON file in user data directory):

- **Output directory:** Default: same as source file. Can be set to a custom path.
- **Overwrite behavior:** Default: auto-rename with suffix. Option to prompt or skip existing files.
- **Theme:** Dark (default). V1 ships dark-only.

Output filename conflicts are resolved before encoding begins: the app checks for existing files at the target path and increments the suffix until a free name is found.

## Supported Conversions (v1)

- **Video containers:** MP4, MOV, AVI, MKV, WebM, GIF
- **Audio formats:** MP3, AAC, WAV, FLAC, OGG
- **Image formats:** PNG, JPEG, WebP
- **Stream extraction:** Audio from video, subtitles, video-only (strip audio)

## Acceptance Criteria

### Quality guardrails
- Given a source file with Compact preset selected, the CRF slider must not accept values below 28 or above 35.
- Given a source file where estimated output exceeds source size, a warning must be displayed.
- The Custom preset allows full range but the "larger than source" warning still fires.

### Trim accuracy
- Trimmed output start time must be within one frame of the specified start time (for constant frame rate content).

### Progress reporting
- Progress bar must update at least once per second during transcode operations.
- Stream copy operations (no transcode) show an indeterminate progress state.

### Batch processing
- When multiple files are queued, only one ffmpeg process runs at any time.
- Failed items do not block subsequent items in the queue.
- Bulk-apply must update settings on all selected queue items atomically.

### Error handling
- Dropping an unsupported file format shows a clear error on the queue item, not a crash.
- Cancelling an encode deletes the partial output file within 2 seconds.
- Output filename conflicts are resolved before encoding begins, not after.
