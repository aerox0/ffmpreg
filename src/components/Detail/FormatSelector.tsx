interface FormatSelectorProps {
  formats: string[];
  activeFormat: string;
  onFormatChange: (format: string) => void;
}

export function FormatSelector({ formats, activeFormat, onFormatChange }: FormatSelectorProps) {
  return (
    <div className="format-selector">
      <div className="format-selector__label">Output Format</div>
      <div className="format-selector__pills">
        {formats.map((fmt) => (
          <button
            key={fmt}
            className={`format-selector__pill ${fmt === activeFormat ? 'format-selector__pill--active' : ''}`}
            onClick={() => onFormatChange(fmt)}
          >
            {fmt.toUpperCase()}
          </button>
        ))}
      </div>
    </div>
  );
}
