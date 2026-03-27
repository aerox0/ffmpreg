import type { SourceMeta } from '../../types/index';

interface FileHeaderProps {
  source: SourceMeta;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatDuration(seconds: number): string {
  if (seconds === 0) return '—';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function FileHeader({ source }: FileHeaderProps) {
  return (
    <div className="detail-section file-header">
      <div className="file-name">{source.fileName}</div>
      <div className="file-meta">
        {source.inputType === 'video' && (
          <>
            <span>{source.width}×{source.height}</span>
            <span className="meta-sep">•</span>
            <span>{source.videoCodec}</span>
            <span className="meta-sep">•</span>
            <span>{formatDuration(source.duration)}</span>
          </>
        )}
        {source.inputType === 'audio' && (
          <>
            <span>{source.audioCodec}</span>
            <span className="meta-sep">•</span>
            <span>{source.audioChannels}ch</span>
            <span className="meta-sep">•</span>
            <span>{formatDuration(source.duration)}</span>
          </>
        )}
        {source.inputType === 'image' && (
          <span>{source.width}×{source.height}</span>
        )}
        <span className="meta-sep">•</span>
        <span>{formatBytes(source.fileSize)}</span>
      </div>
    </div>
  );
}
