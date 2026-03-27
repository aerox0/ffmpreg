import { useState, useCallback, useRef, useEffect } from 'react';
import type { QueueItem, QualitySettings } from '../types/index';
import { useIpc } from './useIpc';

export interface UseQueueReturn {
  items: QueueItem[];
  selectedIds: Set<string>;
  activeId: string | null;
  addFiles: (paths: string[]) => Promise<void>;
  removeItem: (id: string) => Promise<void>;
  selectItem: (id: string, multi: boolean) => void;
  selectRange: (id: string) => void;
  startQueue: () => Promise<void>;
  cancelItem: (id: string) => Promise<void>;
  cancelAll: () => Promise<void>;
  retryItem: (id: string) => Promise<void>;
  clearDone: () => Promise<void>;
  updateItemSettings: (id: string, settings: Partial<QueueItem['settings']>) => Promise<void>;
  bulkApplySettings: (format: string, quality: QualitySettings) => Promise<void>;
}

export function useQueue(): UseQueueReturn {
  const api = useIpc();
  const [items, setItems] = useState<QueueItem[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [activeId, setActiveId] = useState<string | null>(null);

  // Refs to avoid stale closures in callbacks
  const activeIdRef = useRef<string | null>(null);
  const selectedIdsRef = useRef<Set<string>>(new Set());
  const itemsRef = useRef<QueueItem[]>([]);

  // Keep refs in sync with state
  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);
  useEffect(() => {
    selectedIdsRef.current = selectedIds;
  }, [selectedIds]);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  // Subscribe to IPC events
  useEffect(() => {
    if (!api) return;

    const unsubProgress = api.onProgress((id: string, progress: number) => {
      setItems(prev => prev.map(item =>
        item.id === id ? { ...item, progress } : item,
      ));
    });

    const unsubStatus = api.onStatusChange((id: string, status: string, detail?: unknown) => {
      setItems(prev => prev.map(item => {
        if (item.id !== id) return item;

        const updated = { ...item, status: status as QueueItem['status'] };

        if (status === 'converting') {
          updated.progress = 0;
        }

        if (status === 'done') {
          updated.progress = 100;
          if (detail && typeof detail === 'object' && 'outputSize' in detail) {
            updated.outputSize = (detail as { outputSize: number }).outputSize;
          }
        }

        if (status === 'failed') {
          if (typeof detail === 'string') {
            updated.error = detail;
          }
        }

        if (status === 'queued') {
          updated.progress = 0;
          updated.error = null;
          updated.outputPath = null;
          updated.outputSize = null;
        }

        if (status === 'cancelled') {
          updated.progress = 0;
        }

        return updated;
      }));
    });

    return () => {
      unsubProgress();
      unsubStatus();
    };
  }, [api]);

  const addFiles = useCallback(async (paths: string[]) => {
    if (!api || paths.length === 0) return;
    const newItems = await api.addFiles(paths);
    setItems(prev => [...prev, ...newItems]);
  }, [api]);

  const removeItem = useCallback(async (id: string) => {
    if (!api) return;
    await api.removeItem(id);
    setItems(prev => prev.filter(item => item.id !== id));
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    if (activeIdRef.current === id) {
      setActiveId(null);
    }
  }, [api]);

  const selectItem = useCallback((id: string, multi: boolean) => {
    if (multi) {
      setSelectedIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) {
          next.delete(id);
        } else {
          next.add(id);
        }
        return next;
      });
    } else {
      setSelectedIds(new Set([id]));
    }
    setActiveId(id);
  }, []);

  const selectRange = useCallback((id: string) => {
    const prevActive = activeIdRef.current;
    if (!prevActive) {
      selectItem(id, false);
      return;
    }

    const ids = itemsRef.current.map(item => item.id);
    const startIdx = ids.indexOf(prevActive);
    const endIdx = ids.indexOf(id);

    if (startIdx === -1 || endIdx === -1) return;

    const lo = Math.min(startIdx, endIdx);
    const hi = Math.max(startIdx, endIdx);
    const rangeIds = ids.slice(lo, hi + 1);

    setSelectedIds(new Set(rangeIds));
  }, [selectItem]);

  const startQueue = useCallback(async () => {
    if (!api) return;
    await api.startQueue();
  }, [api]);

  const cancelItem = useCallback(async (id: string) => {
    if (!api) return;
    await api.cancelItem(id);
  }, [api]);

  const cancelAll = useCallback(async () => {
    if (!api) return;
    await api.cancelAll();
  }, [api]);

  const retryItem = useCallback(async (id: string) => {
    if (!api) return;
    await api.retryItem(id);
  }, [api]);

  const clearDone = useCallback(async () => {
    if (!api) return;
    await api.clearDone();
    setItems(prev => prev.filter(item => item.status !== 'done'));
  }, [api]);

  const updateItemSettings = useCallback(async (id: string, settings: Partial<QueueItem['settings']>) => {
    if (!api) return;
    await api.updateItemSettings(id, settings);
    setItems(prev => prev.map(item => {
      if (item.id !== id) return item;
      return {
        ...item,
        settings: { ...item.settings, ...settings },
      };
    }));
  }, [api]);

  const bulkApplySettings = useCallback(async (format: string, quality: QualitySettings) => {
    if (!api) return;
    const currentSelected = selectedIdsRef.current;
    const promises: Promise<void>[] = [];
    currentSelected.forEach(id => {
      promises.push(api.updateItemSettings(id, { format, quality }));
    });
    await Promise.all(promises);

    // Update local state using the snapshot captured before IPC calls
    const appliedIds = currentSelected;
    setItems(prev => prev.map(item => {
      if (!appliedIds.has(item.id)) return item;
      return {
        ...item,
        settings: {
          ...item.settings,
          format,
          quality,
        },
      };
    }));
  }, [api]);

  return {
    items,
    selectedIds,
    activeId,
    addFiles,
    removeItem,
    selectItem,
    selectRange,
    startQueue,
    cancelItem,
    cancelAll,
    retryItem,
    clearDone,
    updateItemSettings,
    bulkApplySettings,
  };
}
