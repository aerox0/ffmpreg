# UX Enhancement Pack — Design Specification

## Context

ffmpreg is a desktop FFmpeg frontend with waveform trimming. The UI was recently redesigned with a cinematic dark theme. This spec adds targeted UX enhancements across visual polish (animated waveform, live stats) and global experience (toasts, progress, keyboard shortcuts).

---

## C2 — Animated Waveform Trim

### Behavior
- **Hover scrub**: Moving the mouse over the waveform displays a timestamp tooltip at the top of the container, showing the time at the cursor position.
- **Playhead line**: A thin vertical line follows the cursor while hovering over the waveform area.
- **Handle affordance**: Trim handles glow and scale (1.3x) on hover. During drag, handle bar widens slightly and glow intensifies.
- **Region highlight**: The selected trim region has a subtle animated gradient (slow color shift within the amber palette) to indicate it is the active selection.

### Technical Notes
- Mouse position → time: `frac = (clientX - rect.left) / rect.width`, `time = frac * duration`.
- Tooltip positioned absolutely above the container, updated on `mousemove`.
- CSS transitions on `.trim-handle-bar` for scale and box-shadow.

---

## C3 — Live Stats Bar

### Behavior
- Each of the three stat cards (Source, Estimated, Savings) gains a proportional fill bar beneath the value.
- The Estimated bar shows `estimatedSize / sourceSize` as a percentage fill.
- Bar color: green (`var(--success)`) when estimated < source, amber (`var(--accent)`) when within 10%, red (`var(--danger)`) when larger.
- Bar animates smoothly (CSS `transition: width 0.4s var(--ease-out)`) when CRF slider changes.
- No bar shown for Savings card (percentage text is sufficient).

### Technical Notes
- Computed in `StatsRow` component, passed down from parent via props.
- Width percentage: `Math.min(100, (estimatedSize / sourceSize) * 100)`.
- Color logic: `estimatedSize < sourceSize * 0.9 ? success : estimatedSize > sourceSize ? danger : accent`.

---

## D1 — Toast Notifications

### Behavior
- Toast stack appears bottom-right, above the queue footer.
- Each toast shows: file icon (by type), filename (truncated), status badge (Done / Failed), output size/savings.
- Duration: auto-dismiss after 4s. Failed toasts persist until dismissed.
- Actions: "Open" button (opens output folder), "Dismiss" button.
- Max 3 visible; additional toasts are held in renderer state and shown as others dismiss (FIFO queue in memory, not dropped).

### Data Flow
- Main process detects conversion complete via IPC `onStatusChange` (already fires on done/failed).
- Renderer `useEffect` listens to `onStatusChange`; when `status === 'done' || status === 'failed'`, calls `addToast()` from `useToast` hook.
- No new IPC channel needed — reuse existing `encode:status` event.
- Toast auto-dismiss uses `setTimeout` cleared on unmount or manual dismiss.
- "Open" action: renderer calls IPC `shell:open-folder` with the output directory path (via new IPC handler).

### States
- `entering` — slide-in animation
- `visible` — static display
- `exiting` — slide-out animation
- `done` — Done status, green accent
- `failed` — Failed status, red accent

---

## D2 — Overall Progress in Header

### Behavior
- Header right side shows: `"{done} / {total}"` where total = items with status queued/converting/done. If queue is empty, header shows nothing for progress.
- A slim progress line (3px) spans the full header width beneath the title row.
- Progress fill: `done / total * 100%`.
- If item is converting, header also shows the active filename (truncated to 40 chars) with a subtle pulsing dot.
- The header title area remains draggable.

### Technical Notes
- Derived from `items` state — no new IPC needed.
- Computed in `App.tsx`, passed as props to header (or header reads via context).

---

## D3 — Keyboard Shortcuts

### Shortcuts
| Key | Action |
|-----|--------|
| `Delete` / `Backspace` | Remove selected items |
| `Enter` | Start queue |
| `Escape` | Deselect all |
| `Space` | Toggle pause on active conversion (IPC stubs `pause-item`/`resume-item` added now; worker support is future work) |
| `↑` / `↓` | Navigate queue (move activeItem) |
| `Ctrl+A` / `Cmd+A` | Select all items |

### Implementation
- `useEffect` on `window` for `keydown` events, attached in `App.tsx`.
- `useCallback` for each handler to avoid re-registration.
- Prevent default on `Space` to avoid page scroll.
- `e.key` normalized for cross-platform (check `e.metaKey` for Cmd on Mac).
- `pause-item` and `resume-item` IPC channels added as stubs (main process handlers registered; worker pause/resume is future work). `shell:open-folder` IPC handler added to `electron/main.ts` for toast "Open" action.

---

## File Changes

| File | Change |
|------|--------|
| `src/App.tsx` | Add keyboard listeners, header progress display, toast container |
| `src/components/Detail/TrimSection.tsx` | Add hover scrub, handle glow/scale, region highlight |
| `src/components/Detail/StatsRow.tsx` | Add proportional bar visualization |
| `src/components/Queue/ToastContainer.tsx` | New — toast stack management |
| `src/hooks/useToast.ts` | New — toast state management |
| `src/ipc/channels.ts` | Add `pause-item`, `resume-item` channels (stubs); add `shell:open-folder` channel |
| `electron/main.ts` | Add `shell:open-folder` IPC handler; add `pause-item`/`resume-item` stubs |
| `src/index.css` | Add toast animations, progress bar styles |
| `src/App.css` | Add header progress styles, toast styles |

---

## Acceptance Criteria

- [ ] Waveform shows hover timestamp tooltip and cursor playhead line
- [ ] Trim handles glow on hover and scale during drag
- [ ] Stats row shows animated proportional bar with correct color
- [ ] Toast appears when conversion completes, auto-dismisses after 4s
- [ ] Toast shows file info, status, and Open action
- [ ] Header shows "X / Y complete" with progress line
- [ ] Header shows active conversion filename with pulse dot
- [ ] Delete key removes selected items
- [ ] Enter starts queue, Escape deselects
- [ ] Arrow keys navigate queue items
- [ ] Ctrl+A selects all items
- [ ] All animations are smooth (60fps) with no layout thrashing
