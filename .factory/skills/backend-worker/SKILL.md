---
name: backend-worker
description: Electron main process, IPC handlers, ffmpeg worker, shared utilities
---

# Backend Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

This worker handles all backend features:
- `electron-main-process`
- `electron-preload-context-bridge`
- `ffmpeg-encoding-worker`
- `shared-utilities-codecs-presets`

## Required Skills

None for initial implementation. If validation requires testing ffmpeg integration end-to-end, use `agent-browser` for smoke testing the full flow.

## Work Procedure

### shared-utilities-codecs-presets

1. **Implement `src/shared/codecs.ts`**:
   - Container→codec mapping per design spec table
   - getCodecForContainer(container) → { video, audio }

2. **Implement `src/shared/presets.ts`**:
   - CRF_RANGES: compact 28-35, good 22-28, high 18-23
   - CUSTOM_CRF_RANGE: 18-35
   - AUDIO_BITRATE_RANGES per preset
   - GIF_PRESETS (fps, paletteSize)
   - IMAGE_QUALITY_RANGES per format and preset
   - COMPRESSION_RATIOS: compact 0.25, good 0.40, high 0.65
   - DEFAULT_CRF: compact 31, good 25, high 20, custom 25
   - getCrfRange(preset), getAudioBitrateRange(preset), getGifPreset(preset), getImageQualityRange(format, preset)
   - getCompressionRatio(preset)
   - getDefaultQuality(preset) → { preset, crf, audioBitrate }
   - **isQualityGuarded(preset, crf)** — returns true only if crf is within preset's range
   - **getAvailableFormats(inputType)** — returns formats for video/audio/image

3. **Implement `src/shared/ffmpeg-args.ts`**:
   - buildFfmpegArgs(item) — builds full ffmpeg argument list
   - Handle input path, trim (-ss/-to), video codec (-c:v), CRF (-crf), audio codec (-c:a), audio bitrate (-b:a)
   - Stream copy detection: if source codec matches target codec, use `-c:v copy`
   - Image format handling: -frames:v 1, -q:v for jpeg/webp
   - Output path as last argument

4. **Implement `src/shared/output-path.ts`**:
   - getOutputDir(sourcePath, customDir)
   - resolveOutputPath(sourcePath, targetFormat, existingPaths, outputDir) with -1,-2 suffix conflict resolution

5. **Test** with `npm run test -- --grep 'presets'`

### electron-main-process

1. **Implement `src/main/main.ts`**:
   - Create frameless BrowserWindow (1200x800, min 900x600)
   - Load renderer from dist/index.html in prod, localhost:5173 in dev
   - Register all IPC handlers

2. **Implement IPC handlers**:
   - `queue:add-files`: probeFile for each path, create queue item with default settings
   - `queue:remove`: remove from queue, cancel if in-progress
   - `queue:update-settings`: update item settings
   - `queue:start`: call processNextItem()
   - `queue:cancel`: cancel specific item
   - `queue:cancel-all`: cancel current, clear queued
   - `queue:retry`: reset item to queued
   - `file:waveform`: generate waveform data (for M2)
   - `settings:get`, `settings:update`: electron-store
   - `dialog:showOpenDialog`, `shell:open-folder`

3. **Implement queue processor**:
   - processNextItem() finds first queued item, updates status to converting
   - Pre-encode checks: source exists, output dir writable, resolve output path
   - Build ffmpeg args, spawn worker
   - Handle worker messages: progress, done, error, cancelled
   - Auto-advance queue on completion

4. **Implement `src/main/ffprobe.ts`**:
   - Use ffprobe-static path (NOT hardcoded path)
   - Spawn ffprobe with -print_format json -show_format -show_streams
   - Parse output to extract: duration, width, height, videoCodec, audioCodec, frameRate, isVfr, inputType

### electron-preload-context-bridge

1. **Implement `src/main/preload.ts`**:
   - contextBridge.exposeInMainWorld('electronAPI', {...})
   - All methods from the IPC API documented in AGENTS.md

### ffmpeg-encoding-worker

1. **Implement `src/main/workers/encode.ts`**:
   - Worker thread receiving { ffmpegPath, args, outputPath, isStreamCopy }
   - Spawn ffmpeg process with provided args
   - Parse stderr for `time=` progress, calculate percentage
   - Send progress messages: `{ type: 'progress', percent }` at least 1/sec
   - For stream copy: send `{ type: 'indeterminate' }` immediately
   - On ffmpeg exit code 0: send `{ type: 'done', outputSize }`
   - On non-zero exit: send `{ type: 'error', message }`
   - On cancel message: kill ffmpeg with SIGKILL, send `{ type: 'cancelled' }`
   - Handle parentPort messages for cancellation

## Example Handoff

```json
{
  "salientSummary": "Implemented Electron main process with all IPC handlers, ffprobe integration using ffprobe-static, ffmpeg encoding worker with progress streaming, and shared utilities (codecs, presets, ffmpeg-args, output-path).",
  "whatWasImplemented": "src/main/main.ts (window, IPC handlers, queue processor), src/main/preload.ts (context bridge), src/main/ffprobe.ts (metadata extraction), src/main/workers/encode.ts (worker thread), src/shared/codecs.ts, src/shared/presets.ts, src/shared/ffmpeg-args.ts, src/shared/output-path.ts.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "npm run test -- --grep 'presets'", "exitCode": 0, "observation": "All preset tests passed" },
      { "command": "npm run test -- --grep 'ffmpeg-args'", "exitCode": 0, "observation": "All ffmpeg-args tests passed" },
      { "command": "npm run test -- --grep 'output-path'", "exitCode": 0, "observation": "All output-path tests passed" }
    ],
    "interactiveChecks": []
  },
  "tests": {
    "added": [
      { "file": "src/shared/presets.test.ts", "cases": ["isQualityGuarded bounds", "getAvailableFormats by inputType", "getDefaultQuality per preset"] },
      { "file": "src/shared/ffmpeg-args.test.ts", "cases": ["buildFfmpegArgs for mp4", "buildFfmpegArgs for mp3", "stream copy detection"] },
      { "file": "src/shared/output-path.test.ts", "cases": ["conflict resolution with existing file", "default to source dir"] }
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- ffprobe fails to parse a valid media file
- ffmpeg worker crashes on valid input
- IPC handler throws unhandled exception
- Progress messages are not reaching the renderer
