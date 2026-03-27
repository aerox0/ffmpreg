import type { QueueItem, OutputSettings } from '../../types/index';
import { FileHeader } from './FileHeader';
import { FormatSelector } from './FormatSelector';
import { QualitySection } from './QualitySection';
import { StatsRow } from './StatsRow';
import { StreamToggle } from './StreamToggle';

interface DetailPanelProps {
  item: QueueItem;
  onSettingsChange: (settings: Partial<OutputSettings>) => void;
}

export function DetailPanel({ item, onSettingsChange }: DetailPanelProps) {
  const { source, settings } = item;
  const { format, quality, trim, mode, extractStreamIndex } = settings;

  return (
    <div className="detail-panel-content">
      <FileHeader source={source} />

      <StreamToggle
        source={source}
        mode={mode}
        extractStreamIndex={extractStreamIndex}
        onChange={onSettingsChange}
      />

      <FormatSelector
        inputType={source.inputType}
        currentFormat={format}
        onChange={(f) => onSettingsChange({ format: f })}
      />

      <QualitySection
        inputType={source.inputType}
        format={format}
        currentPreset={quality.preset}
        currentCrf={quality.crf}
        currentAudioBitrate={quality.audioBitrate}
        onChange={(q) => onSettingsChange({ quality: { ...quality, ...q } })}
      />

      <StatsRow source={source} settings={settings} />

      {trim && (
        <div className="detail-section trim-info">
          <div className="section-label">Trim</div>
          <div className="trim-times">
            {trim.start.toFixed(1)}s → {trim.end.toFixed(1)}s
            ({(trim.end - trim.start).toFixed(1)}s)
          </div>
        </div>
      )}
    </div>
  );
}
