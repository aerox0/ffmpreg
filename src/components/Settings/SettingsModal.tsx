import { useState, useEffect, useCallback } from 'react';

interface SettingsModalProps {
  onClose: () => void;
}

type OverwriteBehavior = 'rename' | 'prompt' | 'skip';

export function SettingsModal({ onClose }: SettingsModalProps) {
  const [outputDir, setOutputDir] = useState<string | null>(null);
  const [overwriteBehavior, setOverwriteBehavior] = useState<OverwriteBehavior>('rename');

  useEffect(() => {
    const api = window.electronAPI;
    if (!api) return;

    api.getSettings().then((settings) => {
      if (settings.outputDir !== undefined) setOutputDir(settings.outputDir as string | null);
      if (settings.overwriteBehavior !== undefined)
        setOverwriteBehavior(settings.overwriteBehavior as OverwriteBehavior);
    });
  }, []);

  const handleBrowse = useCallback(async () => {
    const api = window.electronAPI;
    if (!api) return;

    const dir = await api.browseDirectory();
    if (dir !== null) {
      setOutputDir(dir);
    }
  }, []);

  const handleSave = useCallback(async () => {
    const api = window.electronAPI;
    if (!api) return;

    await api.updateSettings({
      outputDir,
      overwriteBehavior,
    });
    onClose();
  }, [outputDir, overwriteBehavior, onClose]);

  const handleReset = useCallback(() => {
    setOutputDir(null);
  }, []);

  return (
    <div className="settings-modal__overlay" onClick={onClose}>
      <div className="settings-modal__card" onClick={(e) => e.stopPropagation()}>
        <div className="settings-modal__header">
          <h2 className="settings-modal__title">Settings</h2>
          <button className="settings-modal__close" onClick={onClose} title="Close">
            <svg width="14" height="14" viewBox="0 0 14 14">
              <line x1="1" y1="1" x2="13" y2="13" stroke="currentColor" strokeWidth="1.5" />
              <line x1="13" y1="1" x2="1" y2="13" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>
        </div>

        <div className="settings-modal__body">
          <div className="settings-modal__section">
            <label className="settings-modal__section-label">Output Directory</label>
            <div className="settings-modal__dir-row">
              <span className="settings-modal__dir-path">
                {outputDir ?? 'Same as source directory'}
              </span>
              <button className="settings-modal__browse-btn btn btn--ghost btn--sm" onClick={handleBrowse}>
                Browse
              </button>
              {outputDir && (
                <button className="settings-modal__reset-btn btn btn--ghost btn--sm" onClick={handleReset}>
                  Reset
                </button>
              )}
            </div>
          </div>

          <div className="settings-modal__section">
            <label className="settings-modal__section-label">When file exists</label>
            <div className="settings-modal__radio-group">
              <label className="settings-modal__radio">
                <input
                  type="radio"
                  name="overwriteBehavior"
                  value="rename"
                  checked={overwriteBehavior === 'rename'}
                  onChange={() => setOverwriteBehavior('rename')}
                />
                <span className="settings-modal__radio-label">
                  <span className="settings-modal__radio-title">Auto-rename</span>
                  <span className="settings-modal__radio-desc">Append a number to the filename</span>
                </span>
              </label>
              <label className="settings-modal__radio">
                <input
                  type="radio"
                  name="overwriteBehavior"
                  value="prompt"
                  checked={overwriteBehavior === 'prompt'}
                  onChange={() => setOverwriteBehavior('prompt')}
                />
                <span className="settings-modal__radio-label">
                  <span className="settings-modal__radio-title">Prompt</span>
                  <span className="settings-modal__radio-desc">Ask what to do each time</span>
                </span>
              </label>
              <label className="settings-modal__radio">
                <input
                  type="radio"
                  name="overwriteBehavior"
                  value="skip"
                  checked={overwriteBehavior === 'skip'}
                  onChange={() => setOverwriteBehavior('skip')}
                />
                <span className="settings-modal__radio-label">
                  <span className="settings-modal__radio-title">Skip</span>
                  <span className="settings-modal__radio-desc">Skip the file and continue</span>
                </span>
              </label>
            </div>
          </div>
        </div>

        <div className="settings-modal__footer">
          <button className="btn btn--ghost" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn--primary" onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
