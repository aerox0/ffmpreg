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

**Critical Issue (m1 validation):** The preload script (`src/main/preload.ts`) has a critical bug where it fails to expose `window.electronAPI` due to ES module/CommonJS incompatibility. The preload uses `import { contextBridge, ipcRenderer } from 'electron'` which fails in the preload context. This causes React to not render because components call `window.electronAPI` methods.

**Debugging findings:**
- `window.electronAPI` is undefined in the renderer
- React fails to mount (root div is empty)
- The preload script needs to be fixed to use `require('electron')` or proper ES module handling
- The TypeScript compilation outputs `export {};` making it a module, but uses `require()` internally which doesn't work in ES modules

## Flow Validator Guidance: quality-presets

Same isolation and connection requirements as file-drop-zone.

## Flow Validator Guidance: encoding-progress

Same isolation and connection requirements as file-drop-zone.

## Known Issues

### Preload Script ES Module Issue (BLOCKER for m1)

The preload script at `src/main/preload.ts` fails to expose `electronAPI` due to module system incompatibility:
- TypeScript compiles to ES modules with `export {};`
- But code uses `require('electron')` which is CommonJS
- In ES module context, `require` is not available
- Fix: Change preload to use proper ES module imports or use a bundler for the preload

### Dev Electron Script Path Issue

The `dev:electron` script in package.json was pointing to wrong directory:
- Was: `electron dist-electron/electron/main.js`
- Should be: `electron dist-electron/main/main.js`
- Fixed by updating package.json
