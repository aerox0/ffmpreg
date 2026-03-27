import { useState, useEffect, useCallback } from 'react';
import { hasElectronAPI } from './useIpc';

export interface AppSettings {
  outputDir: string | null;
  overwriteBehavior: 'auto-rename' | 'prompt' | 'skip';
}

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>({
    outputDir: null,
    overwriteBehavior: 'auto-rename',
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!hasElectronAPI()) {
      setLoading(false);
      return;
    }

    window.electronAPI!.getSettings().then((data) => {
      setSettings(data as AppSettings);
      setLoading(false);
    });
  }, []);

  const updateSettings = useCallback(async (updates: Partial<AppSettings>) => {
    const next = { ...settings, ...updates };
    setSettings(next);
    if (hasElectronAPI()) {
      await window.electronAPI!.updateSettings(updates);
    }
  }, [settings]);

  const pickOutputDir = useCallback(async (): Promise<string | null> => {
    if (!hasElectronAPI()) return null;
    return window.electronAPI!.showOpenDialog({
      properties: ['openDirectory'],
      title: 'Select Output Directory',
    });
  }, []);

  return { settings, loading, updateSettings, pickOutputDir };
}
