# ffmpreg

A desktop ffmpeg frontend for non-technical users. The core experience is "save as" style format conversion — drag a file, pick a format, convert. Quality settings are guarded by presets with bounded ranges to prevent producing output that is larger and worse than the source.

## Tech Stack

- **Electron** — desktop shell
- **React 19 + Vite** — renderer UI
- **TypeScript** — full stack
- **ffmpeg-static** + **ffprobe-static** — bundled ffmpeg binaries
- **Node.js worker threads** — encoding runs off main process
- **Vitest + testing-library/react** — unit/component testing

## Setup

```bash
# Install dependencies
npm install

# Run in development mode
npm run dev

# Run tests
npm run test

# Build for production
npm run build
```

## Project Structure

```
src/
├── main/           # Electron main process
│   ├── main.ts     # Window creation, IPC handlers
│   ├── preload.ts  # Context bridge API
│   ├── ffprobe.ts  # Metadata extraction
│   └── workers/
│       └── encode.ts  # FFmpeg encoding worker
├── renderer/       # React app
│   ├── App.tsx
│   ├── components/
│   │   ├── FileDropZone.tsx
│   │   ├── FormatSelector.tsx
│   │   ├── QualityPreset.tsx
│   │   ├── SizeEstimation.tsx
│   │   ├── EncodeProgress.tsx
│   │   └── CompletionDisplay.tsx
│   └── styles/
└── shared/         # Shared utilities
    ├── codecs.ts
    ├── presets.ts
    ├── ffmpeg-args.ts
    └── output-path.ts
```

## Quality Presets

| Preset | CRF Range | Audio Bitrate | Compression Ratio |
|--------|-----------|---------------|------------------|
| Compact | 28-35 | 128k | 0.25 |
| Good | 22-28 | 192k | 0.40 |
| High | 18-23 | 256k | 0.65 |
| Custom | 18-35 | 128-320k | 0.40 |

## Supported Conversions

- **Video containers:** MP4, MOV, AVI, MKV, WebM, GIF
- **Audio formats:** MP3, AAC, WAV, FLAC, OGG
- **Image formats:** PNG, JPEG, WebP

## Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server |
| `npm run dev:electron` | Start Electron app |
| `npm run build` | Build for production |
| `npm run test` | Run unit tests |
| `npm run typecheck` | TypeScript type checking |
| `npm run lint` | ESLint checking |
