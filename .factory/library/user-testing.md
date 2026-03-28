# User Testing

Testing surface, required testing skills/tools, and resource cost classification per surface.

## Validation Surface

The ffmpreg app is a desktop Electron application with a dark-themed React UI.

**Primary Surface:** agent-browser for end-to-end validation of user flows.

**Setup Required:**
- npm run dev (starts Vite dev server on port 5173)
- npm run dev:electron (starts Electron app)
- Or: npm run build && run packaged app

## Testing Flow

1. Drop a video file (.mp4) onto the drop zone
2. Select output format (e.g., mkv)
3. Select quality preset (e.g., Good)
4. Click "Start Encode"
5. Verify progress bar updates during encoding
6. Verify completion shows output path and size comparison

## Assertions by Tool

| Tool | What It Tests |
|------|--------------|
| agent-browser | Full UI flow: drop file → format select → preset → encode → completion |
| npm run test | Unit tests for presets, ffmpeg-args, output-path, React components |

## Resource Cost Classification

**Lightweight surface:** The Electron app is a simple media converter UI. Each agent-browser instance uses ~300-500 MB RAM.

**Max concurrent validators:** 3 (to stay within headroom on typical developer machines)

## Validation Commands

```bash
# Start dev environment
npm run dev

# Run in separate terminal
npm run dev:electron

# Run tests
npm run test

# Build for production
npm run build
```

## Flow Validator Guidance: file-drop-zone

**Isolation:** Single user session, test files in /tmp/ffmpreg-test-media/

**Important:** The Electron app must be started with remote debugging enabled:
```bash
NODE_ENV=development electron --remote-debugging-port=9222 dist-electron/main/main.js
```

Connect via: `agent-browser connect 9222`

**Status Update (Round 2):** The preload ESM issue has been FIXED - `window.electronAPI` is now properly exposed and React app renders correctly.

**Critical Issue (REMAINING BLOCKER):** React UI does not re-render when queue state changes via `electronAPI.addFiles()`. The backend processes files correctly (metadata extracted, queue updated), but React components don't receive or respond to queue state changes. The sidebar remains in empty state even after files are successfully added.

**Debugging findings:**
- `window.electronAPI` is now defined as an object
- React renders correctly (shows drop zone, sidebar, main panel)
- `electronAPI.addFiles()` returns success with correct metadata
- `getQueueState()` shows items in queue with status=done
- But React UI shows "Select a file to see details" instead of the queued file
- This is a React state synchronization issue with the IPC event system

## Flow Validator Guidance: quality-presets

Same isolation and connection requirements as file-drop-zone.

## Flow Validator Guidance: encoding-progress

Same isolation and connection requirements as file-drop-zone.

## Known Issues

### React UI State Synchronization Issue (CRITICAL BLOCKER for m1)

The React app does not re-render when queue state changes via `electronAPI`:
- `electronAPI.addFiles()` succeeds at IPC level but React doesn't re-render
- `getQueueState()` returns correct data but UI shows stale/empty state
- The `onStatusChange` event listener appears to not sync IPC events properly
- This blocks ALL UI-based assertions that require file to be visible after drop

**Root Cause:** React state management issue - queue state changes are not triggering re-renders in React components.

### Browser-Based File Upload File.path Issue

When using browser-based file upload (via CDP), the `File.path` property is undefined:
- Electron apps expect `File.path` to contain the native file path
- Browser-based file upload doesn't populate this property
- App crashes with "Cannot read properties of undefined (reading 'split')"
- This blocks quality preset assertions (VAL-QUAL-001 through VAL-QUAL-006)

**Workaround:** Use native Electron `showOpenDialog` API instead of browser file input for testing.

### Test Media File Size Issue

The test video file (`test_video.mp4` at 32KB) is too small for timing-dependent tests:
- Encoding completes in under 1 second
- Cannot observe progress bar updates (VAL-ENCODE-002)
- Cannot test cancel functionality (VAL-ENCODE-004)

**Fix:** Create larger test media files (at least 10MB) for timing tests.

### Preload Script ES Module Issue (FIXED)

The preload script ESM issue has been fixed in commit 363b3d9:
- Separate tsconfig for preload outputs CommonJS
- `window.electronAPI` is now properly exposed
- React app renders correctly
