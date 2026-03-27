# UX Enhancement Pack — Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers-extended-cc:subagent-driven-development (if subagents available) or superpowers-extended-cc:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add animated waveform trim (C2), live stats bar (C3), toast notifications (D1), overall progress in header (D2), and keyboard shortcuts (D3).

**Architecture:**
- Toast: reuse existing `onStatusChange` IPC listener to derive toasts — no new IPC channel needed. "Open" triggers `shell:open-folder` IPC handler.
- Waveform: mouse tracking in `TrimSection`, CSS transitions for handle glow/scale
- Stats bar: computed width/color in `StatsRow`, CSS transition
- Header progress: derived from existing `items` state in `App.tsx`, no new IPC
- Keyboard: `useKeyboardShortcuts` custom hook in `App.tsx`
- Space key pause/resume: IPC stubs added now; worker support is future work

**Tech Stack:** React 19, TypeScript, CSS animations/transitions, Electron IPC

---

## Task 1: Toast System — `useToast` Hook

**Files:**
- Create: `src/hooks/useToast.ts`

- [ ] **Step 1: Create `src/hooks/useToast.ts`**

```typescript
import { useState, useCallback } from 'react';

export interface Toast {
  id: string;
  fileName: string;
  inputType: 'video' | 'audio' | 'image';
  status: 'done' | 'failed';
  outputSize?: number;
  sourceSize?: number;
}

const MAX_VISIBLE = 3;
const AUTO_DISMISS_MS = 4000;

export function useToast() {
  // Internal queue — holds ALL toasts in memory (FIFO, no drops)
  const [queue, setQueue] = useState<Toast[]>([]);
  const [exiting, setExiting] = useState<Set<string>>(new Set());

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setQueue((prev) => [...prev, { ...toast, id }]);
    if (toast.status !== 'failed') {
      setTimeout(() => dismissToast(id), AUTO_DISMISS_MS);
    }
    return id;
  }, []);

  const dismissToast = useCallback((id: string) => {
    setExiting((prev) => new Set([...prev, id]));
    setTimeout(() => {
      setQueue((prev) => prev.filter((t) => t.id !== id));
      setExiting((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 300); // matches CSS exit animation duration
  }, []);

  // Derived: only the last MAX_VISIBLE toasts are shown (FIFO, no drops)
  const visibleToasts = queue.slice(-MAX_VISIBLE);

  return { toasts: visibleToasts, queue, exiting, addToast, dismissToast };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useToast.ts
git commit -m "feat(toast): add useToast hook for toast state management"
```

---

## Task 2: Toast System — `ToastContainer` Component + IPC Wiring

**Files:**
- Create: `src/components/Queue/ToastContainer.tsx`
- Modify: `src/App.tsx` (add `<ToastContainer>`, wire `onStatusChange` to `addToast`)
- Modify: `src/App.css` (add toast styles)
- Modify: `electron/main.ts` (add `shell:open-folder` IPC handler)
- Modify: `src/hooks/useIpc.ts` (add `shellOpenFolder` to electronAPI type)

- [ ] **Step 1: Create `src/components/Queue/ToastContainer.tsx`**

```tsx
import type { Toast } from '../../hooks/useToast';

interface ToastContainerProps {
  toasts: Toast[];
  exiting: Set<string>;
  onDismiss: (id: string) => void;
  onOpenFolder: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function TypeIcon({ type }: { type: Toast['inputType'] }) {
  const color = 'currentColor';
  if (type === 'video') return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={color}>
      <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4z"/>
    </svg>
  );
  if (type === 'audio') return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={color}>
      <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3h-6z"/>
    </svg>
  );
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill={color}>
      <path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/>
    </svg>
  );
}

export function ToastContainer({ toasts, exiting, onDismiss, onOpenFolder }: ToastContainerProps) {
  return (
    <div className="toast-container">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`toast ${toast.status} ${exiting.has(toast.id) ? 'exiting' : 'entering'}`}
        >
          <div className="toast-icon">
            <TypeIcon type={toast.inputType} />
          </div>
          <div className="toast-content">
            <div className="toast-filename" title={toast.fileName}>
              {toast.fileName.length > 28 ? toast.fileName.slice(0, 28) + '…' : toast.fileName}
            </div>
            <div className="toast-meta">
              <span className={`toast-status ${toast.status}`}>
                {toast.status === 'done' ? 'Done' : 'Failed'}
              </span>
              {toast.status === 'done' && toast.outputSize != null && (
                <span className="toast-size">
                  {toast.sourceSize && toast.sourceSize > 0
                    ? `${Math.round((1 - toast.outputSize / toast.sourceSize) * 100)}% smaller`
                    : formatBytes(toast.outputSize)}
                </span>
              )}
            </div>
          </div>
          {toast.status === 'done' && (
            <button className="toast-open" onClick={onOpenFolder} title="Open output folder">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>
              </svg>
            </button>
          )}
          <button className="toast-dismiss" onClick={() => onDismiss(toast.id)} title="Dismiss">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Add `shellOpenFolder` to `src/hooks/useIpc.ts`**

Add to the `electronAPI` interface:
```typescript
shellOpenFolder: (dirPath: string) => Promise<void>;
```

Add to `CHANNELS`:
```typescript
SHELL_OPEN_FOLDER: 'shell:open-folder',
```

- [ ] **Step 3: Add `shell:open-folder` IPC handler to `electron/main.ts`**

Add to the `registerIpcHandlers` function (before the closing `}`):
```typescript
// shell:open-folder
ipcMain.handle('shell:open-folder', async (_event, dirPath: string) => {
  const { shell } = await import('electron');
  if (dirPath) shell.openPath(dirPath);
});
```

- [ ] **Step 4: Expose `shellOpenFolder` in `electron/preload.ts`**

Add to the `contextBridge.exposeInMainWorld('electronAPI', ...)`:
```typescript
shellOpenFolder: (dirPath: string) => ipcRenderer.invoke('shell:open-folder', dirPath),
```

- [ ] **Step 5: Add toast styles to `src/App.css`**

Add these styles at the end of `App.css`:

```css
/* ─── Toast Notifications ─────────────────────────────────────────────────── */

.toast-container {
  position: fixed;
  bottom: 80px;
  right: 20px;
  z-index: 200;
  display: flex;
  flex-direction: column;
  gap: 8px;
  pointer-events: none;
}

.toast {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: var(--bg-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  min-width: 280px;
  max-width: 360px;
  pointer-events: all;
  border-left: 3px solid var(--border);
}

.toast.done { border-left-color: var(--success); }
.toast.failed { border-left-color: var(--danger); }

.toast.entering { animation: toastIn 0.3s var(--ease-out) forwards; }
.toast.exiting { animation: toastOut 0.3s var(--ease-out) forwards; }

@keyframes toastIn {
  from { opacity: 0; transform: translateX(40px); }
  to { opacity: 1; transform: translateX(0); }
}

@keyframes toastOut {
  from { opacity: 1; transform: translateX(0); }
  to { opacity: 0; transform: translateX(40px); }
}

.toast-icon {
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--bg-3);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
}

.toast-content { flex: 1; min-width: 0; }

.toast-filename {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-h);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.toast-meta {
  display: flex;
  gap: 8px;
  margin-top: 2px;
  font-size: 11px;
}

.toast-status {
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.3px;
}
.toast-status.done { color: var(--success); }
.toast-status.failed { color: var(--danger); }

.toast-size { color: var(--text-muted); }

.toast-open,
.toast-dismiss {
  flex-shrink: 0;
  width: 26px;
  height: 26px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-sm);
  border: none;
  background: transparent;
  color: var(--text-faint);
  cursor: pointer;
  transition: all 0.15s;
}

.toast-open:hover {
  background: var(--accent-dim);
  color: var(--accent);
}

.toast-dismiss:hover {
  background: var(--danger-dim);
  color: var(--danger);
}
```

- [ ] **Step 6: Integrate toast system in `App.tsx`**

In `App.tsx`:
```tsx
import { useToast } from './hooks/useToast';
import { ToastContainer } from './components/Queue/ToastContainer';

const { toasts, exiting, addToast, dismissToast } = useToast();

// In the existing onStatusChange useEffect, after the existing handler:
if (status === 'done' || status === 'failed') {
  const item = items.find(i => i.id === id);
  if (item) {
    addToast({
      fileName: item.source.fileName,
      inputType: item.source.inputType,
      status: status as 'done' | 'failed',
      outputSize: item.outputSize ?? undefined,
      sourceSize: item.source.fileSize,
    });
  }
}

// Add onOpenFolder handler:
const handleOpenFolder = useCallback(async () => {
  if (!hasElectronAPI()) return;
  const settings = await window.electronAPI!.getSettings() as { outputDir: string | null };
  if (settings.outputDir) {
    window.electronAPI!.shellOpenFolder(settings.outputDir);
  }
}, []);

// Add ToastContainer in JSX:
<ToastContainer
  toasts={toasts}
  exiting={exiting}
  onDismiss={dismissToast}
  onOpenFolder={handleOpenFolder}
/>
```

- [ ] **Step 7: Commit**

```bash
git add src/components/Queue/ToastContainer.tsx src/App.tsx src/App.css src/hooks/useIpc.ts electron/main.ts electron/preload.ts
git commit -m "feat(toast): add ToastContainer with Open action, shell:open-folder IPC, and App integration"
```

---

## Task 3: Waveform Hover Scrub + Handle Glow (C2)

**Files:**
- Modify: `src/components/Detail/TrimSection.tsx`
- Modify: `src/App.css`

- [ ] **Step 1: Add hover state, container ref, and scrub tooltip to `TrimSection.tsx`**

Add `useRef`, `useState` for hover tracking:

```tsx
// Add containerRef after canvasRef:
const containerRef = useRef<HTMLDivElement>(null);

// Add hover state after localTrim:
const [hoverTime, setHoverTime] = useState<number | null>(null);
const [isHovering, setIsHovering] = useState(false);
```

Add to the trim container div (add `ref` and mouse handlers):
```tsx
ref={containerRef}
onMouseMove={(e) => {
  const rect = containerRef.current?.getBoundingClientRect();
  if (!rect) return;
  const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  setHoverTime(frac * source.duration);
}}
onMouseEnter={() => setIsHovering(true)}
onMouseLeave={() => { setIsHovering(false); setHoverTime(null); }}
```

Add playhead line and tooltip inside `.trim-container`, after the end handle div:
```tsx
{isHovering && hoverTime != null && containerRef.current && (
  <>
    <div
      className="trim-playhead"
      style={{ left: `${(hoverTime / source.duration) * 100}%` }}
    />
    <div
      className="trim-tooltip"
      style={{
        left: Math.min(
          (hoverTime / source.duration) * containerRef.current.getBoundingClientRect().width,
          containerRef.current.getBoundingClientRect().width - 50
        ),
      }}
    >
      {formatTime(hoverTime)}
    </div>
  </>
)}
```

- [ ] **Step 2: Update CSS in `src/App.css`**

Add to the trim section styles:
```css
.trim-playhead {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 1px;
  background: rgba(255, 255, 255, 0.4);
  pointer-events: none;
  z-index: 3;
}

.trim-tooltip {
  position: absolute;
  top: -28px;
  transform: translateX(-50%);
  background: var(--bg-4);
  color: var(--text-h);
  font-family: var(--font-mono);
  font-size: 11px;
  padding: 3px 7px;
  border-radius: var(--radius-sm);
  pointer-events: none;
  z-index: 4;
  white-space: nowrap;
  box-shadow: var(--shadow-sm);
}
```

Update `.trim-handle-bar` to add scale transition (scale 1.3x per spec):
```css
.trim-handle-bar {
  transition: transform 0.15s var(--ease-spring), box-shadow 0.15s;
}

.trim-handle:hover .trim-handle-bar {
  transform: scaleX(1.3);
  box-shadow: 0 0 20px var(--accent-glow);
}
```

Add region shimmer overlay to `.trim-container::after`:
```css
.trim-container::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg, transparent,
    rgba(240, 160, 80, 0.06) 30%,
    rgba(240, 160, 80, 0.08) 50%,
    rgba(240, 160, 80, 0.06) 70%,
    transparent
  );
  background-size: 200% 100%;
  animation: regionShimmer 3s ease-in-out infinite;
  pointer-events: none;
  z-index: 1;
  border-radius: var(--radius-md);
}

@keyframes regionShimmer {
  0%, 100% { background-position: 0% 0%; }
  50% { background-position: 100% 0%; }
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Detail/TrimSection.tsx src/App.css
git commit -m "feat(waveform): add hover scrub tooltip, playhead, and handle glow"
```

---

## Task 4: Live Stats Bar (C3)

**Files:**
- Modify: `src/components/Detail/StatsRow.tsx`
- Modify: `src/App.css`

- [ ] **Step 1: Add proportional bar to `StatsRow.tsx`**

Add computed `barWidth` and `barColor` after the existing `savings` computation:

```tsx
const barWidth = Math.min(100, source.fileSize > 0
  ? (estimatedSize / source.fileSize) * 100
  : 0);

const barColor = estimatedSize < source.fileSize * 0.9
  ? 'var(--success)'
  : estimatedSize > source.fileSize
    ? 'var(--danger)'
    : 'var(--accent)';
```

Source card — add a bar showing 100% reference:
```tsx
<div className="stat-card">
  <div className="stat-label">Source</div>
  <div className="stat-value">{formatBytes(source.fileSize)}</div>
  <div className="stat-bar">
    <div className="stat-bar-fill" style={{ width: '100%', background: 'var(--border-light)' }} />
  </div>
</div>
```

Estimated card — add the proportional bar with color and transition:
```tsx
<div className="stat-card">
  <div className="stat-label">Estimated</div>
  <div className="stat-value">~{formatBytes(estimatedSize)}</div>
  <div className="stat-bar">
    <div
      className="stat-bar-fill"
      style={{
        width: `${barWidth}%`,
        background: barColor,
        transition: 'width 0.4s var(--ease-out), background 0.3s',
      }}
    />
  </div>
</div>
```

Savings card — unchanged (no bar per spec).

- [ ] **Step 2: Add CSS for stat bars in `src/App.css`**

```css
.stat-bar {
  margin-top: 8px;
  height: 4px;
  background: var(--bg-4);
  border-radius: 2px;
  overflow: hidden;
}

.stat-bar-fill {
  height: 100%;
  border-radius: 2px;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/Detail/StatsRow.tsx src/App.css
git commit -m "feat(stats): add animated proportional bar to stat cards"
```

---

## Task 5: Overall Progress in Header (D2)

**Files:**
- Modify: `src/App.tsx` (header area)
- Modify: `src/App.css`

- [ ] **Step 1: Compute progress from items in `App.tsx`**

Add near the top of the `App` component:

```tsx
const total = items.filter(i => ['queued', 'converting', 'done'].includes(i.status)).length;
const done = items.filter(i => i.status === 'done').length;
const activeConverting = items.find(i => i.status === 'converting');
const progressPct = total > 0 ? (done / total) * 100 : 0;
```

Update the header JSX:

```tsx
<div className="app-header">
  <div className="app-title">ffmpreg</div>
  {total > 0 && (
    <div className="header-progress">
      <span className="header-progress-label">
        {done} / {total}
        {activeConverting && <span className="header-active-dot" />}
      </span>
      {activeConverting && (
        <span className="header-active-name">
          {activeConverting.source.fileName.slice(0, 40)}
        </span>
      )}
    </div>
  )}
  <button className="settings-btn" onClick={() => setShowSettings(true)}>Settings</button>
  {total > 0 && (
    <div className="header-progress-bar">
      <div className="header-progress-fill" style={{ width: `${progressPct}%` }} />
    </div>
  )}
</div>
```

- [ ] **Step 2: Add header progress CSS to `src/App.css`**

Add before the `.settings-btn` section:
```css
/* ─── Header Progress ─────────────────────────────────────────────────────── */

.header-progress {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-left: auto;
  margin-right: 12px;
}

.header-progress-label {
  font-size: 12px;
  font-family: var(--font-mono);
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 6px;
}

.header-active-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  animation: pulse 1.5s ease-in-out infinite;
}

.header-active-name {
  font-size: 11px;
  color: var(--text);
  max-width: 200px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.header-progress-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: var(--bg-4);
}

.header-progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--accent), var(--accent-hover));
  transition: width 0.4s var(--ease-out);
  border-radius: 0 2px 2px 0;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx src/App.css
git commit -m "feat(header): add overall progress indicator to header"
```

---

## Task 6: Keyboard Shortcuts + IPC Pause/Resume Stubs (D3)

**Files:**
- Create: `src/hooks/useKeyboardShortcuts.ts`
- Modify: `src/App.tsx`
- Modify: `electron/main.ts` (add `pause-item`/`resume-item` stubs)
- Modify: `src/hooks/useIpc.ts` (add `pauseItem`/`resumeItem` to electronAPI)

- [ ] **Step 1: Create `src/hooks/useKeyboardShortcuts.ts`**

```typescript
import { useEffect, useCallback } from 'react';

interface KeyboardShortcutsOptions {
  onDelete?: () => void;
  onEnter?: () => void;
  onEscape?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onSelectAll?: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  onDelete,
  onEnter,
  onEscape,
  onArrowUp,
  onArrowDown,
  onSelectAll,
  enabled = true,
}: KeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onDelete?.();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onEnter?.();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onEscape?.();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        onArrowUp?.();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        onArrowDown?.();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        onSelectAll?.();
      }
    },
    [enabled, onDelete, onEnter, onEscape, onArrowUp, onArrowDown, onSelectAll],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
```

**Note:** Space key pause/resume is intentionally excluded — IPC stubs added below but worker does not support pause yet.

- [ ] **Step 2: Add `pauseItem`/`resumeItem` to `src/hooks/useIpc.ts`**

Add to `CHANNELS`:
```typescript
QUEUE_PAUSE: 'queue:pause-item',
QUEUE_RESUME: 'queue:resume-item',
```

Add to `electronAPI` interface:
```typescript
pauseItem: (id: string) => Promise<void>;
resumeItem: (id: string) => Promise<void>;
```

- [ ] **Step 3: Add pause/resume stubs to `electron/main.ts`**

Add to `registerIpcHandlers`:
```typescript
// queue:pause-item (stub — worker pause not yet implemented)
ipcMain.handle('queue:pause-item', async (_event, id: string): Promise<void> => {
  console.log('[IPC] pause-item stub called for', id);
  // TODO: worker-level pause requires significant changes to encode worker
  // This is a no-op stub for now
});

// queue:resume-item (stub)
ipcMain.handle('queue:resume-item', async (_event, id: string): Promise<void> => {
  console.log('[IPC] resume-item stub called for', id);
  // TODO: worker-level resume
});
```

- [ ] **Step 4: Expose `pauseItem`/`resumeItem` in `electron/preload.ts`**

```typescript
pauseItem: (id: string) => ipcRenderer.invoke('queue:pause-item', id),
resumeItem: (id: string) => ipcRenderer.invoke('queue:resume-item', id),
```

- [ ] **Step 5: Wire shortcuts in `App.tsx`**

```tsx
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';

// Add handlers:
const handleDelete = useCallback(() => {
  selectedIds.forEach((id) => removeItem(id));
}, [selectedIds, removeItem]);

const handleEnter = useCallback(() => {
  if (!items.some(i => i.status === 'converting') && items.length > 0) {
    startQueue();
  }
}, [items, startQueue]);

const handleEscape = useCallback(() => {
  selectItem('', false);
}, [selectItem]);

const handleArrowDown = useCallback(() => {
  const idx = items.findIndex(i => i.id === activeItem?.id);
  if (idx < items.length - 1) {
    selectItem(items[idx + 1].id, false);
  }
}, [items, activeItem, selectItem]);

const handleArrowUp = useCallback(() => {
  const idx = items.findIndex(i => i.id === activeItem?.id);
  if (idx > 0) {
    selectItem(items[idx - 1].id, false);
  }
}, [items, activeItem, selectItem]);

const handleSelectAll = useCallback(() => {
  items.forEach((item) => selectItem(item.id, true));
}, [items, selectItem]);

// Add hook:
useKeyboardShortcuts({
  onDelete: handleDelete,
  onEnter: handleEnter,
  onEscape: handleEscape,
  onArrowUp: handleArrowUp,
  onArrowDown: handleArrowDown,
  onSelectAll: handleSelectAll,
  enabled: true,
});
```

- [ ] **Step 6: Commit**

```bash
git add src/hooks/useKeyboardShortcuts.ts src/App.tsx src/hooks/useIpc.ts electron/main.ts electron/preload.ts
git commit -m "feat(keyboard): add keyboard shortcuts and pause/resume IPC stubs"
```

---

## Task 7: Build & Verify

- [ ] **Step 1: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 2: Run Vite build**

```bash
bun run build
```

Expected: Clean build, CSS includes all new styles.

- [ ] **Step 3: Run tests**

```bash
bun run test
```

Expected: All tests pass.

- [ ] **Step 4: Commit all remaining changes**

```bash
git add src/components/Detail/TrimSection.tsx src/components/Detail/StatsRow.tsx src/components/Queue/ToastContainer.tsx src/hooks/useToast.ts src/hooks/useKeyboardShortcuts.ts src/App.tsx src/App.css src/hooks/useIpc.ts electron/main.ts electron/preload.ts
git commit -m "feat: complete UX enhancement pack — toasts, waveform polish, stats bar, header progress, keyboard shortcuts"
```
