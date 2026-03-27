import { getAvailableFormats } from '../../lib/presets';
import type { InputType } from '../../types/index';

interface FormatSelectorProps {
  inputType: InputType;
  currentFormat: string;
  onChange: (format: string) => void;
}

const FORMAT_LABELS: Record<string, string> = {
  mp4: 'MP4',
  mov: 'MOV',
  mkv: 'MKV',
  webm: 'WebM',
  avi: 'AVI',
  gif: 'GIF',
  mp3: 'MP3',
  aac: 'AAC',
  wav: 'WAV',
  flac: 'FLAC',
  ogg: 'OGG',
  png: 'PNG',
  jpeg: 'JPEG',
  webp: 'WebP',
};

export function FormatSelector({ inputType, currentFormat, onChange }: FormatSelectorProps) {
  const formats = getAvailableFormats(inputType);

  return (
    <div className="detail-section">
      <div className="section-label">Output Format</div>
      <div className="format-pills">
        {formats.map((fmt) => (
          <button
            key={fmt}
            className={`format-pill ${fmt === currentFormat ? 'active' : ''}`}
            onClick={() => onChange(fmt)}
          >
            {FORMAT_LABELS[fmt] ?? fmt.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}
