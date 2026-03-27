import type { QueueItem, OutputSettings } from '../../types/index';
import { getAvailableFormats } from '../../lib/presets';
import { FileHeader } from './FileHeader';
import { StreamToggle } from './StreamToggle';
import { FormatSelector } from './FormatSelector';
import { QualitySection } from './QualitySection';
import { StatsRow } from './StatsRow';
import { TrimSection } from './TrimSection';

interface DetailPanelProps {
  item: QueueItem | null;
  onSettingsChange: (id: string, settings: Partial<OutputSettings>) => void;
}

export function DetailPanel({ item, onSettingsChange }: DetailPanelProps) {
  if (!item) {
    return (
      <div className="detail-panel">
        <div className="detail-panel__placeholder">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" opacity="0.3">
            <rect x="2" y="2" width="20" height="20" rx="2" ry="2" />
            <line x1="9" y1="2" x2="9" y2="22" />
          </svg>
          <p>Select a file to view details</p>
        </div>
      </div>
    );
  }

  const formats = getAvailableFormats(item.source.inputType);
  const currentFormat = item.settings.format;

  const handleFormatChange = (format: string) => {
    onSettingsChange(item.id, { format });
  };

  const handleSettingsChange = (settings: Partial<OutputSettings>) => {
    onSettingsChange(item.id, settings);
  };

  return (
    <div className="detail-panel">
      <div className="detail-panel__content">
        <FileHeader source={item.source} />
        <StreamToggle item={item} onSettingsChange={handleSettingsChange} />
        {item.settings.mode === 'convert' && (
          <>
            <FormatSelector
              formats={formats}
              activeFormat={currentFormat}
              onFormatChange={handleFormatChange}
            />
            <QualitySection item={item} onSettingsChange={handleSettingsChange} />
          </>
        )}
        <StatsRow item={item} />
        <TrimSection item={item} onSettingsChange={handleSettingsChange} />
      </div>
    </div>
  );
}
