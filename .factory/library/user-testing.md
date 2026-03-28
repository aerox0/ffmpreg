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
