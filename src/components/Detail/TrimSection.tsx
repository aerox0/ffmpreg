import { useEffect, useRef, useState, useCallback } from 'react';
import type { SourceMeta, TrimRange } from '../../types/index';
import { hasElectronAPI } from '../../hooks/useIpc';

interface TrimSectionProps {
  source: SourceMeta;
  trim: TrimRange | null;
  onTrimChange: (trim: TrimRange | null) => void;
}

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${s.toFixed(1).padStart(4, '0')}`;
  return `${m}:${String(Math.floor(s)).padStart(2, '0')}.${(s % 1).toFixed(1).slice(2)}`;
}

export function TrimSection({ source, trim, onTrimChange }: TrimSectionProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [amplitudes, setAmplitudes] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [dragging, setDragging] = useState<'start' | 'end' | null>(null);
  const [localTrim, setLocalTrim] = useState<TrimRange>(
    trim ?? { start: 0, end: source.duration },
  );

  // Fetch waveform data
  useEffect(() => {
    if (!hasElectronAPI()) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    window.electronAPI!.getWaveform(source.path).then((data: unknown) => {
      if (!cancelled) {
        setAmplitudes(data as number[]);
        setLoading(false);
      }
    }).catch(() => {
      if (!cancelled) {
        setAmplitudes([]);
        setLoading(false);
      }
    });

    return () => { cancelled = true; };
  }, [source.path]);

  // Render waveform
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || amplitudes.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const w = rect.width;
    const h = rect.height;
    const bucketWidth = w / amplitudes.length;

    ctx.clearRect(0, 0, w, h);

    const trimStartFrac = localTrim.start / source.duration;
    const trimEndFrac = localTrim.end / source.duration;

    amplitudes.forEach((amp, i) => {
      const x = i * bucketWidth;
      const barHeight = amp * (h * 0.9);
      const inTrim = i / amplitudes.length >= trimStartFrac && i / amplitudes.length <= trimEndFrac;
      ctx.fillStyle = inTrim ? '#e8a23a' : '#444';
      ctx.fillRect(x, (h - barHeight) / 2, Math.max(1, bucketWidth - 1), barHeight);
    });
  }, [amplitudes, localTrim, source.duration]);

  const getPositionFromEvent = useCallback(
    (e: MouseEvent | React.MouseEvent): number => {
      const container = containerRef.current;
      if (!container) return 0;
      const rect = container.getBoundingClientRect();
      const frac = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      return frac * source.duration;
    },
    [source.duration],
  );

  const handleMouseDown = useCallback(
    (which: 'start' | 'end') => (e: React.MouseEvent) => {
      e.preventDefault();
      setDragging(which);
    },
    [],
  );

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const time = getPositionFromEvent(e);
      setLocalTrim((prev) => {
        if (dragging === 'start') {
          const newStart = Math.min(time, prev.end - 0.1);
          return { ...prev, start: Math.max(0, newStart) };
        } else {
          const newEnd = Math.max(time, prev.start + 0.1);
          return { ...prev, end: Math.min(source.duration, newEnd) };
        }
      });
    };

    const handleMouseUp = () => {
      setDragging(null);
      onTrimChange(localTrim);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, getPositionFromEvent, onTrimChange, source.duration, localTrim]);

  // Snap to frame boundaries for CFR content
  const snapToFrame = (time: number): number => {
    if (!source.frameRate || source.isVfr) return time;
    const frameDuration = 1 / source.frameRate;
    return Math.round(time / frameDuration) * frameDuration;
  };

  const startFrac = localTrim.start / source.duration;
  const endFrac = localTrim.end / source.duration;

  return (
    <div className="detail-section trim-section">
      <div className="section-label">Trim</div>

      {loading && <div className="trim-loading">Loading waveform...</div>}

      {!loading && (
        <>
          <div className="trim-container" ref={containerRef}>
            <canvas ref={canvasRef} className="waveform-canvas" />

            {/* Start handle */}
            <div
              className="trim-handle trim-handle-start"
              style={{ left: `${startFrac * 100}%` }}
              onMouseDown={handleMouseDown('start')}
            >
              <div className="trim-handle-bar" />
            </div>

            {/* End handle */}
            <div
              className="trim-handle trim-handle-end"
              style={{ left: `${endFrac * 100}%` }}
              onMouseDown={handleMouseDown('end')}
            >
              <div className="trim-handle-bar" />
            </div>
          </div>

          <div className="trim-times-row">
            <span className="trim-time">
              <input
                type="text"
                className="trim-input"
                value={formatTime(localTrim.start)}
                onChange={(e) => {
                  const match = e.target.value.match(/^(\d+):(\d+)(?:\.(\d+))?$/);
                  if (!match) return;
                  const h = parseInt(match[1], 10);
                  const m = parseInt(match[2], 10);
                  const s = match[3] ? parseInt(match[3].padEnd(1, '0'), 10) / (match[3].length === 1 ? 1 : 10) : 0;
                  const time = h * 3600 + m * 60 + s;
                  const snapped = snapToFrame(time);
                  setLocalTrim((prev) => ({ ...prev, start: Math.max(0, Math.min(snapped, prev.end - 0.1)) }));
                }}
                onBlur={() => onTrimChange(localTrim)}
              />
            </span>
            <span className="trim-duration">
              {(localTrim.end - localTrim.start).toFixed(1)}s
            </span>
            <span className="trim-time">
              <input
                type="text"
                className="trim-input"
                value={formatTime(localTrim.end)}
                onChange={(e) => {
                  const match = e.target.value.match(/^(\d+):(\d+)(?:\.(\d+))?$/);
                  if (!match) return;
                  const h = parseInt(match[1], 10);
                  const m = parseInt(match[2], 10);
                  const s = match[3] ? parseInt(match[3].padEnd(1, '0'), 10) / (match[3].length === 1 ? 1 : 10) : 0;
                  const time = h * 3600 + m * 60 + s;
                  const snapped = snapToFrame(time);
                  setLocalTrim((prev) => ({ ...prev, end: Math.min(source.duration, Math.max(snapped, prev.start + 0.1)) }));
                }}
                onBlur={() => onTrimChange(localTrim)}
              />
            </span>
          </div>

          <div className="trim-controls">
            <button
              className="trim-clear-btn"
              onClick={() => { setLocalTrim({ start: 0, end: source.duration }); onTrimChange(null); }}
            >
              Clear Trim
            </button>
          </div>
        </>
      )}
    </div>
  );
}
