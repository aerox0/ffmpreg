---
name: scaffolding-worker
description: Project scaffolding - package.json, configs, directory structure
---

# Scaffolding Worker

NOTE: Startup and cleanup are handled by `worker-base`. This skill defines the WORK PROCEDURE.

## When to Use This Skill

This worker handles the initial project scaffolding feature (`project-scaffolding`). It sets up all configuration files, directory structure, and ensures the development environment is fully functional before other workers begin.

## Required Skills

None — this is foundational work that does not require verification tools.

## Work Procedure

1. **Create package.json** with all required dependencies:
   - electron, electron-builder
   - react@19, react-dom@19
   - vite@5, @vitejs/plugin-react
   - typescript, @types/react, @types/react-dom, @types/node
   - ffmpeg-static, ffprobe-static
   - vitest, @testing-library/react, @testing-library/user-event, jsdom
   - electron-store

2. **Create tsconfig.json** with proper paths:
   - Target ES2022
   - Module ESNext
   - Strict mode enabled
   - Path aliases: `@/*` → `src/*`, `@shared/*` → `src/shared/*`

3. **Create vite.config.ts**:
   - React plugin with JSX transform
   - Build target: electron-renderer
   - Out dir: dist
   - Sourcemap: true

4. **Create electron-builder.yml**:
   - App ID: com.ffmpreg.app
   - Include dist/**/* and dist-electron/**/*
   - Windows target: nsis
   - Extra resources: resources/ffmpeg/

5. **Create directory structure**:
   ```
   src/main/        - Electron main process
   src/renderer/    - React app
   src/shared/     - Shared utilities
   ```

6. **Create electron main entry** (`src/main/main.ts`):
   - Basic window creation with frameless design
   - Load renderer from dist/index.html

7. **Create React entry** (`src/renderer/main.tsx`):
   - React 19 createRoot
   - Render App component

8. **Run npm install** to verify all dependencies resolve

9. **Run npm run build** to verify TypeScript compiles

## Example Handoff

```json
{
  "salientSummary": "Created full project scaffolding: package.json with all deps, tsconfig.json with paths, vite.config.ts, electron-builder.yml, and initial directory structure.",
  "whatWasImplemented": "package.json (deps: electron, react 19, vite 5, typescript, ffmpeg-static, ffprobe-static, vitest, testing-library), tsconfig.json (strict, paths aliases), vite.config.ts (react plugin, electron-renderer target), electron-builder.yml (app ID, windows nsis), src/main/main.ts (basic window), src/renderer/main.tsx (React 19 createRoot).",
  "whatWasLeftUndone": "",
  "verification": {
    "commandsRun": [
      { "command": "npm install", "exitCode": 0, "observation": "All dependencies resolved" },
      { "command": "npm run build", "exitCode": 0, "observation": "TypeScript compiled without errors" }
    ],
    "interactiveChecks": []
  },
  "tests": { "added": [] },
  "discoveredIssues": []
}
```

## When to Return to Orchestrator

- npm install fails due to missing or conflicting dependencies
- npm run build fails due to TypeScript errors in the config files themselves
- electron-builder config is invalid
