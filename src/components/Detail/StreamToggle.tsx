import { useCallback } from 'react';
import type { QueueItem, OutputSettings, MediaStream } from '../../types/index';
import { getCodecForContainer } from '../../lib/codecs';

interface StreamToggleProps {
  item: QueueItem;
  onSettingsChange: (settings: Partial<OutputSettings>) => void;
}

function StreamTypeIcon({ type }: { type: MediaStream['type'] }) {
  if (type === 'video') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polygon points="23 7 16 12 23 17 23 7" />
        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
      </svg>
    );
  }
  if (type === 'audio') {
    return (
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M9 18V5l12-2v13" />
        <circle cx="6" cy="18" r="3" />
        <circle cx="18" cy="16" r="3" />
      </svg>
    );
  }
  // subtitle
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <line x1="6" y1="14" x2="18" y2="14" />
      <line x1="6" y1="18" x2="14" y2="18" />
    </svg>
  );
}

export function StreamToggle({ item, onSettingsChange }: StreamToggleProps) {
  const { source, settings } = item;
  const streams = source.streams;

  // Only show toggle when source has multiple streams
  const hasMultipleStreams = streams.length > 1;
  if (!hasMultipleStreams) return null;

  const mode = settings.mode;

  const handleModeChange = useCallback((newMode: 'convert' | 'extract') => {
    if (newMode === 'convert') {
      onSettingsChange({ mode: 'convert', extractStreamIndex: null });
    } else {
      onSettingsChange({ mode: 'extract' });
    }
  }, [onSettingsChange]);

  const handleStreamSelect = useCallback((stream: MediaStream) => {
    let targetFormat: string;

    if (stream.type === 'audio') {
      // Pick a codec-appropriate audio format
      const codecMap: Record<string, string> = {
        aac: 'aac',
        mp3: 'mp3',
        mp3float: 'mp3',
        flac: 'flac',
        vorbis: 'ogg',
        opus: 'ogg',
        pcm_s16le: 'wav',
        pcm_s24le: 'wav',
        pcm_f32le: 'wav',
      };
      targetFormat = codecMap[stream.codec] ?? 'aac';
    } else if (stream.type === 'video') {
      targetFormat = 'mp4';
    } else {
      // subtitle — default to mp4 container
      targetFormat = 'mp4';
    }

    onSettingsChange({
      mode: 'extract',
      extractStreamIndex: stream.index,
      format: targetFormat,
    });
  }, [onSettingsChange]);

  return (
    <div className="stream-toggle">
      <div className="stream-toggle__tabs">
        <button
          className={`stream-toggle__tab ${mode === 'convert' ? 'stream-toggle__tab--active' : ''}`}
          onClick={() => handleModeChange('convert')}
        >
          Convert
        </button>
        <button
          className={`stream-toggle__tab ${mode === 'extract' ? 'stream-toggle__tab--active' : ''}`}
          onClick={() => handleModeChange('extract')}
        >
          Extract
        </button>
      </div>
      {mode === 'extract' && (
        <div className="stream-toggle__list">
          {streams.map((stream) => {
            const isSelected = settings.extractStreamIndex === stream.index;
            return (
              <button
                key={stream.index}
                className={`stream-toggle__stream ${isSelected ? 'stream-toggle__stream--selected' : ''}`}
                onClick={() => handleStreamSelect(stream)}
              >
                <span className="stream-toggle__stream-icon">
                  <StreamTypeIcon type={stream.type} />
                </span>
                <span className="stream-toggle__stream-info">
                  <span className="stream-toggle__stream-type">{stream.type}</span>
                  <span className="stream-toggle__stream-codec">{stream.codec}</span>
                  {stream.language && (
                    <span className="stream-toggle__stream-lang">{stream.language}</span>
                  )}
                  {stream.type === 'audio' && stream.channels != null && (
                    <span className="stream-toggle__stream-ch">
                      {stream.channels === 1 ? 'mono' : stream.channels === 2 ? 'stereo' : `${stream.channels}ch`}
                    </span>
                  )}
                  {stream.title && (
                    <span className="stream-toggle__stream-title">{stream.title}</span>
                  )}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
