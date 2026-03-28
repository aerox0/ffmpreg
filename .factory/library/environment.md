# Environment

Environment variables, external dependencies, and setup notes.

**What belongs here:** Required env vars, external API keys/services, dependency quirks, platform-specific notes.
**What does NOT belong here:** Service ports/commands (use `.factory/services.yaml`).

---

## ffmpeg Binaries

- `ffmpeg-static` — bundled with app via npm, path obtained via `require('ffmpeg-static')`
- `ffprobe-static` — dev dependency for metadata extraction, path via `require('ffprobe-static')`

## Platform Notes

- Windows ffmpeg/ffprobe binaries are in `resources/ffmpeg/` (pre-bundled)
- In dev mode on Linux/Mac, ffmpeg-static and ffprobe-static provide the binaries
- The Electron app uses `process.resourcesPath` to find bundled binaries in packaged mode

## Design Tokens

- Dark theme background: `#1a1a1a`
- Amber accent: `#e8a23a`
- Fonts: Cormorant Garamond (Instrument Serif), DM Sans, JetBrains Mono
