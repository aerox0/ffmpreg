import { useCallback, MouseEvent } from 'react';
import { getAvailableFormats, InputType } from '../../shared/presets';
import styles from './FormatSelector.module.css';

interface FormatSelectorProps {
  /** The type of input file (video, audio, image) */
  inputType: InputType;
  /** Currently selected output format */
  selectedFormat: string | null;
  /** Callback when a format is selected */
  onFormatSelect?: (format: string) => void;
  /** Whether the selector is disabled */
  disabled?: boolean;
}

/**
 * Get the CSS class suffix based on input type for color coding.
 */
function getInputTypeClass(inputType: InputType): string {
  switch (inputType) {
    case 'video':
      return 'video-format';
    case 'audio':
      return 'audio-format';
    case 'image':
      return 'image-format';
    default:
      return '';
  }
}

/**
 * FormatSelector displays pill-style buttons for each available output format
 * based on the input file type (video, audio, or image).
 * 
 * Features:
 * - Single-select behavior (only one pill can be active at a time)
 * - Visual highlight on active selection with color coding by input type
 * - Formats adapt based on input type
 */
export function FormatSelector({
  inputType,
  selectedFormat,
  onFormatSelect,
  disabled = false,
}: FormatSelectorProps) {
  const formats = getAvailableFormats(inputType);
  const inputTypeClass = getInputTypeClass(inputType);

  const handleFormatClick = useCallback(
    (e: MouseEvent<HTMLButtonElement>, format: string) => {
      e.preventDefault();
      e.stopPropagation();
      if (!disabled) {
        onFormatSelect?.(format);
      }
    },
    [disabled, onFormatSelect]
  );

  if (formats.length === 0) {
    return (
      <div className={styles.formatSelector}>
        <span className={styles.label}>Output Format</span>
        <span className={styles.noFormats}>No formats available</span>
      </div>
    );
  }

  return (
    <div className={styles.formatSelector}>
      <span className={styles.label}>Output Format</span>
      <div className={styles.formatPills}>
        {formats.map((format) => {
          const isActive = selectedFormat === format;
          return (
            <button
              key={format}
              type="button"
              className={[
                styles.formatPill,
                styles[inputTypeClass],
                isActive ? styles.active : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={(e) => handleFormatClick(e, format)}
              disabled={disabled}
              aria-pressed={isActive}
              title={`Convert to ${format.toUpperCase()}`}
            >
              {format.toUpperCase()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
