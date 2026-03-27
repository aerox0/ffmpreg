import { useState, useEffect } from 'react';
import type { AppSettings } from '../../hooks/useSettings';

interface SettingsModalProps {
  settings: AppSettings;
  onClose: () => void;
  onUpdate: (updates: Partial<AppSettings>) => void;
  onPickDir: () => Promise<string | null>;
}

export function SettingsModal({ settings, onClose, onUpdate, onPickDir }: SettingsModalProps) {
  const [outputDir, setOutputDir] = useState(settings.outputDir ?? '');
  const [overwriteBehavior, setOverwriteBehavior] = useState(settings.overwriteBehavior);

  useEffect(() => {
    setOutputDir(settings.outputDir ?? '');
    setOverwriteBehavior(settings.overwriteBehavior);
  }, [settings]);

  const handlePickDir = async () => {
    const dir = await onPickDir();
    if (dir) {
      setOutputDir(dir);
      onUpdate({ outputDir: dir });
    }
  };

  const handleOverwriteChange = (val: string) => {
    const behavior = val as AppSettings['overwriteBehavior'];
    setOverwriteBehavior(behavior);
    onUpdate({ overwriteBehavior: behavior });
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Settings</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <div className="modal-body">
          <div className="settings-group">
            <label className="settings-label">Output Directory</label>
            <div className="settings-dir-row">
              <input
                type="text"
                className="settings-dir-input"
                value={outputDir}
                readOnly
                placeholder="Same as source file"
              />
              <button className="settings-browse-btn" onClick={handlePickDir}>
                Browse...
              </button>
            </div>
            <p className="settings-hint">Leave empty to save output alongside source file</p>
          </div>

          <div className="settings-group">
            <label className="settings-label">When output file exists</label>
            <select
              className="settings-select"
              value={overwriteBehavior}
              onChange={(e) => handleOverwriteChange(e.target.value)}
            >
              <option value="auto-rename">Auto-rename (add -1, -2 suffix)</option>
              <option value="prompt">Ask each time</option>
              <option value="skip">Skip file</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
