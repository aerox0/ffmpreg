import type { SourceMeta } from '../../types/index';

interface FileHeaderProps {
  source: SourceMeta;
}

function formatDuration(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds <= 0) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(k)), units.length - 1);
  const value = bytes / Math.pow(k, i);
  return `${value.toFixed(1)} ${units[i]}`;
}

export function FileHeader({ source }: FileHeaderProps) {
  const metaItems: string[] = [];

  if (source.inputType === 'video') {
    if (source.width > 0 && source.height > 0) {
      metaItems.push(`${source.width}x${source.height}`);
    }
    if (source.videoCodec) {
      metaItems.push(source.videoCodec);
    }
    if (source.audioCodec) {
      metaItems.push(source.audioCodec);
    }
    metaItems.push(formatDuration(source.duration));
    metaItems.push(formatBytes(source.fileSize));
  } else if (source.inputType === 'audio') {
    if (source.audioCodec) {
      metaItems.push(source.audioCodec);
    }
    if (source.audioChannels > 0) {
      const ch = source.audioChannels === 1 ? 'mono' : source.audioChannels === 2 ? 'stereo' : `${source.audioChannels}ch`;
      metaItems.push(ch);
    }
    if (source.audioSampleRate > 0) {
      metaItems.push(`${(source.audioSampleRate / 1000).toFixed(1)} kHz`);
    }
    metaItems.push(formatDuration(source.duration));
    metaItems.push(formatBytes(source.fileSize));
  } else if (source.inputType === 'image') {
    if (source.width > 0 && source.height > 0) {
      metaItems.push(`${source.width}x${source.height}`);
    }
    if (source.videoCodec) {
      metaItems.push(source.videoCodec);
    }
    metaItems.push(formatBytes(source.fileSize));
  }

  return (
    <div className="file-header">
      <div className="file-header__name" title={source.fileName}>
        {source.fileName}
      </div>
      <div className="file-header__meta">
        {metaItems.map((item, i) => (
          <span key={i} className="file-header__meta-item">
            {i > 0 && <span className="file-header__meta-sep">&middot;</span>}
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
