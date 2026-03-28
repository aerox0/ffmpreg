---
name: frontend-worker
description: React components, hooks, styling, unit tests with testing-library
---

# Frontend Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

This worker handles all React renderer features:
- `react-app-shell`
- `file-drop-zone-component`
- `format-selector-component`
- `quality-preset-component`
- `size-estimation-component`
- `encode-progress-component`
- `completion-display-component`
- `error-handling-component`
- `unit-tests-m1`

## Required Skills

**agent-browser** — for manual verification of UI interactions. Invoke it for smoke testing after implementing each component.

## Work Procedure

### react-app-shell

1. **Create global styles** (`src/renderer/styles/globals.css`):
   - CSS variables: --bg-primary: #1a1a1a, --bg-secondary: #252525, --accent: #e8a23a, --text-primary, --text-secondary, --border
   - Import fonts: Cormorant Garamond (Instrument Serif), DM Sans, JetBrains Mono
   - Reset CSS, box-sizing, body styles with dark background

2. **Create custom title bar** (`src/renderer/components/TitleBar.tsx`):
   - Frameless window controls: close, minimize, maximize
   - Draggable region for window movement
   - App branding with Instrument Serif font

3. **Create App layout** (`src/renderer/App.tsx`):
   - Two-panel layout: left 420px (queue + drop zone), right flex (detail view)
   - Import all child components

4. **Verify** with `npm run dev` — app launches with dark theme and correct layout

### file-drop-zone-component

1. **Create `src/renderer/components/FileDropZone.tsx`**:
   - Drag-and-drop event handlers (onDragOver, onDragLeave, onDrop)
   - Visual feedback on dragover (border highlight)
   - Click handler calling electronAPI.showOpenDialog()
   - File type detection from accepted file types
   - Error display for unsupported formats
   - Filename display after successful drop
   - Remove/clear button

2. **Wire to IPC**: call electronAPI.addFiles() on drop/select

3. **Verify**: drag video, audio, image files; drag unsupported file

### format-selector-component

1. **Create `src/renderer/components/FormatSelector.tsx`**:
   - Pill/button style format options
   - Single-select behavior with active state
   - Format list from getAvailableFormats(inputType)
   - On selection, call electronAPI.updateItemSettings()

2. **Verify**: drop video file, verify all video formats shown; drop audio, verify audio-only

### quality-preset-component

1. **Create `src/renderer/components/QualityPreset.tsx`**:
   - Preset selector buttons (Compact, Good, High, Custom)
   - CRF slider with min/max from getCrfRange(preset)
   - **CRITICAL**: Slider must be bounded by preset range — clamp value on change
   - Audio bitrate display from preset
   - Preset descriptions visible

2. **Wire to IPC**: on preset change, call electronAPI.updateItemSettings()

3. **Verify**: 
   - Select each preset, verify CRF bounds match
   - Try to drag slider beyond bounds, verify it stops at boundary

### size-estimation-component

1. **Create `src/renderer/components/SizeEstimation.tsx`**:
   - Read source size from queue item metadata
   - Compute estimated size: source_size * compression_ratio * (trim_factor if trim set)
   - Display with "~" prefix
   - Show "Larger than source" warning when estimated > source size

2. **Verify**:
   - Select High preset on compressible source, warning appears
   - Select Compact, no warning

### encode-progress-component

1. **Create `src/renderer/components/EncodeProgress.tsx`**:
   - Start Encode button (calls electronAPI.startQueue())
   - Progress bar (reads from onProgress callback)
   - Percentage display
   - Cancel button (calls electronAPI.cancelItem())
   - Indeterminate state for stream copy (progress < 0)
   - Status badge (Queued/Converting%/Done/Failed)

2. **Wire callbacks**: onProgress, onStatusChange from electronAPI

3. **Verify**:
   - Start encode, verify progress updates
   - Stream copy (same codec), verify indeterminate
   - Cancel, verify cleanup

### completion-display-component

1. **Create `src/renderer/components/CompletionDisplay.tsx`**:
   - Output file path display (full path)
   - Source vs output size comparison
   - Error message display with retry button
   - Open folder button (electronAPI.shellOpenFolder())

2. **Verify**:
   - Complete encode, verify path and sizes shown
   - Retry button calls electronAPI.retryItem()

### error-handling-component

1. **Integrate error states** into queue item display:
   - Failed items show error message
   - No crash on corrupt files or encoding errors

2. **Verify**:
   - Drop corrupt file, error shown
   - Encoding failure, partial file cleaned up

### unit-tests-m1

1. **Create `src/shared/presets.test.ts`**:
   - Test isQualityGuarded with valid/invalid CRF per preset
   - Test getAvailableFormats for video/audio/image
   - Test getDefaultQuality for each preset

2. **Create `src/shared/ffmpeg-args.test.ts`**:
   - Test buildFfmpegArgs for mp4 with CRF
   - Test buildFfmpegArgs for mp3 with audio bitrate
   - Test stream copy detection (matching codec)
   - Test image format (jpeg, png)

3. **Create `src/shared/output-path.test.ts`**:
   - Test conflict resolution with existing file
   - Test default output to source directory

4. **Create component tests** in `src/renderer/components/*.test.tsx`:
   - Render tests using testing-library/react
   - Interaction tests using userEvent

5. **Run** `npm run test` — all tests must pass

## Example Handoff

```json
{
  "salientSummary": "Implemented all React components (FileDropZone, FormatSelector, QualityPreset, SizeEstimation, EncodeProgress, CompletionDisplay), React app shell with dark theme and two-panel layout, and unit tests for shared utilities and components.",
  "whatWasImplemented": "src/renderer/App.tsx (two-panel layout), src/renderer/components/TitleBar.tsx, FileDropZone.tsx, FormatSelector.tsx, QualityPreset.tsx, SizeEstimation.tsx, EncodeProgress.tsx, CompletionDisplay.tsx. src/shared/presets.test.ts, ffmpeg-args.test.ts, output-path.test.ts. src/renderer/components/*.test.tsx with testing-library.",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "npm run test", "exitCode": 0, "observation": "All 47 tests passed" },
      { "command": "npm run build", "exitCode": 0, "observation": "Build successful" }
    ],
    "interactiveChecks": [
      { "action": "Drag video file onto drop zone", "observed": "File accepted, format options shown" },
      { "action": "Select High preset, drag CRF below 18", "observed": "Slider stops at 18, cannot go lower" },
      { "action": "Start encode with stream copy", "observed": "Indeterminate progress shown" }
    ]
  },
  "tests": {
    "added": [
      { "file": "src/shared/presets.test.ts", "cases": ["isQualityGuarded bounds", "getAvailableFormats by inputType"] },
      { "file": "src/shared/ffmpeg-args.test.ts", "cases": ["mp4 encode args", "mp3 encode args", "stream copy detection"] },
      { "file": "src/renderer/components/QualityPreset.test.tsx", "cases": ["renders all presets", "slider bounded by preset"] }
    ]
  },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- Component renders with errors in the console
- CRF slider allows values outside preset bounds
- Progress updates are not arriving at the renderer
- Tests fail after implementation (not due to missing features)
