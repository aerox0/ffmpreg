import { useCallback, useEffect, useRef, useState } from 'react';
import type { QueueItem, OutputSettings } from '../../types/index';
import { useIpc } from '../../hooks/useIpc';

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/** Format seconds as MM:SS.ms (e.g. 01:23.456) */
function formatTimecode(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00.000';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

/** Parse a timecode string back to seconds. Accepts MM:SS.ms or SS.ms */
function parseTimecode(tc: string): number | null {
  const cleaned = tc.trim();
  // MM:SS.ms
  const mmss = cleaned.match(/^(\d{1,3}):(\d{1,2})(?:\.(\d{1,3}))?$/);
  if (mmss) {
    const m = parseInt(mmss[1], 10);
    const s = parseInt(mmss[2], 10);
    const ms = mmss[3] ? parseInt(mmss[3].padEnd(3, '0'), 10) : 0;
    const val = m * 60 + s + ms / 1000;
    return Number.isFinite(val) ? val : null;
  }
  // SS.ms only
  const ssonly = cleaned.match(/^(\d+)(?:\.(\d{1,3}))?$/);
  if (ssonly) {
    const s = parseInt(ssonly[1], 10);
    const ms = ssonly[2] ? parseInt(ssonly[2].padEnd(3, '0'), 10) : 0;
    const val = s + ms / 1000;
    return Number.isFinite(val) ? val : null;
  }
  return null;
}

/** Snap a time value to the nearest frame boundary */
function snapToFrame(time: number, frameRate: number): number {
  const frameDur = 1 / frameRate;
  return Math.round(time / frameDur) * frameDur;
}

const MIN_SELECTION = 0.5; // minimum trim length in seconds
const HANDLE_WIDTH = 8;

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

interface TrimSectionProps {
  item: QueueItem;
  onSettingsChange: (settings: Partial<OutputSettings>) => void;
}

export function TrimSection({ item, onSettingsChange }: TrimSectionProps) {
  const api = useIpc();
  const { source, settings } = item;

  // Current trim state (always computed, even if component will return null)
  const duration = source.duration;
  const trim = settings.trim ?? { start: 0, end: duration || 1 };

  // All hooks must be called before any early returns (Rules of Hooks)
  const [waveformData, setWaveformData] = useState<number[] | null>(null);
  const [waveformLoading, setWaveformLoading] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [editingStart, setEditingStart] = useState(false);
  const [editingEnd, setEditingEnd] = useState(false);
  const [startInput, setStartInput] = useState('');
  const [endInput, setEndInput] = useState('');
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const dragging = useRef<'start' | 'end' | null>(null);
  const [canvasWidth, setCanvasWidth] = useState(0);

  // Visibility guard — after all hooks
  const isVisible = source.inputType === 'video' || source.inputType === 'audio';
  if (!isVisible || duration <= 0) return null;

  /* ---------- Fetch waveform on mount / item change ---------- */

  useEffect(() => {
    let cancelled = false;
    setWaveformData(null);
    setWaveformLoading(true);

    if (api) {
      api
        .getWaveform(source.path)
        .then((data) => {
          if (!cancelled) {
            setWaveformData(data);
            setWaveformLoading(false);
          }
        })
        .catch(() => {
          if (!cancelled) {
            setWaveformData(null);
            setWaveformLoading(false);
          }
        });
    } else {
      setWaveformLoading(false);
    }

    return () => {
      cancelled = true;
    };
  }, [source.path, api]);

  /* ---------- Responsive canvas sizing ---------- */

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setCanvasWidth(entry.contentRect.width);
      }
    });
    observer.observe(container);
    // Initial size
    setCanvasWidth(container.clientWidth);
    return () => observer.disconnect();
  }, []);

  /* ---------- Draw waveform ---------- */

  const drawWaveform = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const w = canvasWidth;
    const h = 64;

    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    ctx.scale(dpr, dpr);

    // Clear
    ctx.clearRect(0, 0, w, h);

    // Calculate handle positions in pixels
    const startFrac = trim.start / duration;
    const endFrac = trim.end / duration;
    const startPx = startFrac * w;
    const endPx = endFrac * w;

    // Draw waveform bars
    const barCount = w;
    const barWidth = Math.max(1, w / (waveformData ? waveformData.length : barCount));

    if (waveformData && waveformData.length > 0) {
      // Map waveform data to bars
      for (let i = 0; i < barCount; i++) {
        const dataIdx = Math.floor((i / barCount) * waveformData.length);
        const amplitude = Math.abs(waveformData[dataIdx] ?? 0);
        const barH = Math.max(1, amplitude * (h * 0.8));

        const x = i;
        const y = (h - barH) / 2;

        // Color based on whether in selected region
        if (x >= startPx && x <= endPx) {
          ctx.fillStyle = '#f59e0b';
          ctx.globalAlpha = 0.85;
        } else {
          ctx.fillStyle = '#55555f';
          ctx.globalAlpha = 0.35;
        }

        ctx.fillRect(x, y, Math.max(1, barWidth - 0.5), barH);
      }
      ctx.globalAlpha = 1;
    } else {
      // No audio — draw flat timeline
      ctx.fillStyle = '#1e1e24';
      ctx.fillRect(0, h / 2 - 1, w, 2);
    }

    // Dimmed overlays for trimmed regions
    ctx.fillStyle = 'rgba(20, 20, 23, 0.65)';
    // Left overlay
    if (startPx > 0) {
      ctx.fillRect(0, 0, startPx, h);
    }
    // Right overlay
    if (endPx < w) {
      ctx.fillRect(endPx, 0, w - endPx, h);
    }

    // Selected region highlight border lines
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(startPx, 0);
    ctx.lineTo(startPx, h);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(endPx, 0);
    ctx.lineTo(endPx, h);
    ctx.stroke();
  }, [canvasWidth, waveformData, trim, duration]);

  useEffect(() => {
    drawWaveform();
  }, [drawWaveform]);

  /* ---------- Pointer handlers for drag ---------- */

  const updateTrimFromPosition = useCallback(
    (clientX: number, handle: 'start' | 'end') => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const frac = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
      let time = frac * duration;

      // Frame snapping
      if (source.frameRate && !source.isVfr) {
        time = snapToFrame(time, source.frameRate);
      }

      // Clamp and enforce minimum selection
      time = Math.max(0, Math.min(duration, time));

      let newStart = trim.start;
      let newEnd = trim.end;

      if (handle === 'start') {
        newStart = Math.min(time, trim.end - MIN_SELECTION);
        newStart = Math.max(0, newStart);
      } else {
        newEnd = Math.max(time, trim.start + MIN_SELECTION);
        newEnd = Math.min(duration, newEnd);
      }

      onSettingsChange({ trim: { start: newStart, end: newEnd } });
    },
    [duration, source.frameRate, source.isVfr, trim, onSettingsChange],
  );

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, handle: 'start' | 'end') => {
      e.preventDefault();
      e.stopPropagation();
      dragging.current = handle;
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!dragging.current) return;
      e.preventDefault();
      updateTrimFromPosition(e.clientX, dragging.current);
    },
    [updateTrimFromPosition],
  );

  const handlePointerUp = useCallback(() => {
    dragging.current = null;
  }, []);

  /* ---------- Time input handlers ---------- */

  const commitStartTime = useCallback(() => {
    const parsed = parseTimecode(startInput);
    if (parsed !== null) {
      const clamped = Math.max(0, Math.min(parsed, trim.end - MIN_SELECTION));
      onSettingsChange({ trim: { start: clamped, end: trim.end } });
    }
    setEditingStart(false);
  }, [startInput, trim.end, onSettingsChange]);

  const commitEndTime = useCallback(() => {
    const parsed = parseTimecode(endInput);
    if (parsed !== null) {
      const clamped = Math.max(trim.start + MIN_SELECTION, Math.min(parsed, duration));
      onSettingsChange({ trim: { start: trim.start, end: clamped } });
    }
    setEditingEnd(false);
  }, [endInput, trim.start, duration, onSettingsChange]);

  /* ---------- Playback ---------- */

  useEffect(() => {
    // Create audio element for playback
    if (!audioRef.current) {
      audioRef.current = new Audio();
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
    };
  }, []);

  // Stop playback at trim end
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onTimeUpdate = () => {
      if (audio.currentTime >= trim.end) {
        audio.pause();
        audio.currentTime = trim.start;
        setIsPlaying(false);
      }
    };

    const onEnded = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);
    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, [trim.end, trim.start]);

  const togglePlayback = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      // Use file:// protocol for local files in Electron
      audio.src = `file://${source.path.split('/').map(encodeURIComponent).join('/')}`;
      audio.currentTime = trim.start;
      audio.play().catch(() => {
        setIsPlaying(false);
      });
      setIsPlaying(true);
    }
  }, [isPlaying, source.path, trim.start]);

  /* ---------- Reset ---------- */

  const handleReset = useCallback(() => {
    onSettingsChange({ trim: null });
    if (audioRef.current) {
      audioRef.current.pause();
      setIsPlaying(false);
    }
  }, [onSettingsChange]);

  /* ---------- Compute handle pixel positions ---------- */

  const startFrac = trim.start / duration;
  const endFrac = trim.end / duration;
  const clipDuration = trim.end - trim.start;

  const hasTrim = settings.trim !== null;

  return (
    <div className="trim-section">
      <div className="trim-section__header">
        <span className="trim-section__label">Trim</span>
        {hasTrim && (
          <button className="btn btn--ghost btn--sm" onClick={handleReset}>
            Reset
          </button>
        )}
      </div>

      {/* Waveform area */}
      <div
        className="trim-section__waveform"
        ref={containerRef}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
      >
        {waveformLoading && (
          <div className="trim-section__loading">Loading waveform...</div>
        )}

        <canvas ref={canvasRef} className="trim-section__canvas" />

        {/* Left handle */}
        <div
          className="trim-section__handle trim-section__handle--start"
          style={{ left: `calc(${startFrac * 100}% - ${HANDLE_WIDTH / 2}px)` }}
          onPointerDown={(e) => handlePointerDown(e, 'start')}
        />

        {/* Right handle */}
        <div
          className="trim-section__handle trim-section__handle--end"
          style={{ left: `calc(${endFrac * 100}% - ${HANDLE_WIDTH / 2}px)` }}
          onPointerDown={(e) => handlePointerDown(e, 'end')}
        />
      </div>

      {/* Time display */}
      <div className="trim-section__time-row">
        {editingStart ? (
          <input
            className="trim-section__time-input"
            value={startInput}
            onChange={(e) => setStartInput(e.target.value)}
            onBlur={commitStartTime}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitStartTime();
              if (e.key === 'Escape') setEditingStart(false);
            }}
            autoFocus
            spellCheck={false}
          />
        ) : (
          <button
            className="trim-section__time-btn"
            onClick={() => {
              setStartInput(formatTimecode(trim.start));
              setEditingStart(true);
            }}
            title="Click to edit start time"
          >
            {formatTimecode(trim.start)}
          </button>
        )}

        <span className="trim-section__duration">
          {hasTrim ? formatTimecode(clipDuration) : formatTimecode(duration)}
        </span>

        {editingEnd ? (
          <input
            className="trim-section__time-input"
            value={endInput}
            onChange={(e) => setEndInput(e.target.value)}
            onBlur={commitEndTime}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitEndTime();
              if (e.key === 'Escape') setEditingEnd(false);
            }}
            autoFocus
            spellCheck={false}
          />
        ) : (
          <button
            className="trim-section__time-btn"
            onClick={() => {
              setEndInput(formatTimecode(trim.end));
              setEditingEnd(true);
            }}
            title="Click to edit end time"
          >
            {formatTimecode(trim.end)}
          </button>
        )}
      </div>

      {/* Playback controls */}
      <div className="trim-section__controls">
        <button
          className="btn btn--ghost btn--sm"
          onClick={togglePlayback}
          title={isPlaying ? 'Pause' : 'Play selection'}
        >
          {isPlaying ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16" rx="1" />
              <rect x="14" y="4" width="4" height="16" rx="1" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="6,4 20,12 6,20" />
            </svg>
          )}
          {isPlaying ? 'Pause' : 'Play'}
        </button>
      </div>
    </div>
  );
}
