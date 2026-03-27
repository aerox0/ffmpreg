import type { SourceMeta } from '../../types/index';
import { formatBytes, formatDuration } from '../../lib/format';

interface FileHeaderProps {
  source: SourceMeta;
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
