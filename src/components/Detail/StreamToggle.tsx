import type { SourceMeta, OutputSettings } from '../../types/index';

interface StreamToggleProps {
  source: SourceMeta;
  mode: 'convert' | 'extract';
  extractStreamIndex: number | null;
  onChange: (settings: Partial<OutputSettings>) => void;
}

export function StreamToggle({ source, mode, extractStreamIndex, onChange }: StreamToggleProps) {
  const streams = source.streams.filter((s) => s.type === 'audio' || s.type === 'subtitle');

  if (streams.length === 0) return null;

  return (
    <div className="detail-section">
      <div className="section-label">Mode</div>
      <div className="mode-toggle">
        <button
          className={`mode-btn ${mode === 'convert' ? 'active' : ''}`}
          onClick={() => onChange({ mode: 'convert', extractStreamIndex: null })}
        >
          Convert
        </button>
        <button
          className={`mode-btn ${mode === 'extract' ? 'active' : ''}`}
          onClick={() => onChange({ mode: 'extract', extractStreamIndex: source.streams[0]?.index ?? null })}
        >
          Extract
        </button>
      </div>

      {mode === 'extract' && (
        <div className="stream-list">
          {streams.map((stream) => (
            <button
              key={stream.index}
              className={`stream-btn ${extractStreamIndex === stream.index ? 'active' : ''}`}
              onClick={() => {
                onChange({
                  extractStreamIndex: stream.index,
                  format: stream.type === 'audio' ? 'mp3' : 'srt',
                });
              }}
            >
              <span className="stream-type">{stream.type}</span>
              <span className="stream-desc">
                {stream.title ?? stream.codec}
                {stream.language && ` (${stream.language})`}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
