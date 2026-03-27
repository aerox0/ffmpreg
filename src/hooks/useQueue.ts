import { useState, useEffect, useCallback } from 'react';
import type { QueueItem, OutputSettings } from '../types/index';
import { hasElectronAPI } from './useIpc';

interface UseQueueState {
  items: QueueItem[];
  selectedIds: Set<string>;
  activeItemId: string | null;
}

type StatusChangeCallback = (id: string, status: string, item: QueueItem | undefined, error?: string) => void;

export function useQueue(onStatusChange?: StatusChangeCallback) {
  const [state, setState] = useState<UseQueueState>({
    items: [],
    selectedIds: new Set(),
    activeItemId: null,
  });

  // Set up IPC listeners
  useEffect(() => {
    if (!hasElectronAPI()) return;

    window.electronAPI!.onProgress((id, percent) => {
      setState((prev) => ({
        ...prev,
        items: prev.items.map((item) =>
          item.id === id ? { ...item, progress: percent } : item,
        ),
      }));
    });

    window.electronAPI!.onStatusChange((id, status, error) => {
      let updatedItem: QueueItem | undefined;
      setState((prev) => {
        const newItems = prev.items.map((item) =>
          item.id === id
            ? {
                ...item,
                status: status as QueueItem['status'],
                error: error ?? null,
                progress: status === 'done' ? 100 : item.progress,
              }
            : item,
        );
        updatedItem = newItems.find((item) => item.id === id);
        return { ...prev, items: newItems };
      });
      if (onStatusChange) {
        onStatusChange(id, status, updatedItem, error);
      }
    });
  }, [onStatusChange]);

  const addFiles = useCallback(async (paths: string[]) => {
    if (!hasElectronAPI()) return;
    const newItems = (await window.electronAPI!.addFiles(paths)) as QueueItem[];
    setState((prev) => ({
      ...prev,
      items: [...prev.items, ...newItems],
      activeItemId: prev.activeItemId ?? newItems[0]?.id ?? null,
    }));
  }, []);

  const removeItem = useCallback(async (id: string) => {
    if (!hasElectronAPI()) return;
    await window.electronAPI!.removeItem(id);
    setState((prev) => {
      const newItems = prev.items.filter((item) => item.id !== id);
      const newSelectedIds = new Set(prev.selectedIds);
      newSelectedIds.delete(id);
      return {
        ...prev,
        items: newItems,
        selectedIds: newSelectedIds,
        activeItemId: prev.activeItemId === id ? (newItems[0]?.id ?? null) : prev.activeItemId,
      };
    });
  }, []);

  const clearDone = useCallback(async () => {
    if (!hasElectronAPI()) return;
    await window.electronAPI!.clearDone();
    setState((prev) => ({
      ...prev,
      items: prev.items.filter((item) => item.status !== 'done'),
    }));
  }, []);

  const startQueue = useCallback(async () => {
    if (!hasElectronAPI()) return;
    await window.electronAPI!.startQueue();
  }, []);

  const cancelItem = useCallback(async (id: string) => {
    if (!hasElectronAPI()) return;
    await window.electronAPI!.cancelItem(id);
  }, []);

  const cancelAll = useCallback(async () => {
    if (!hasElectronAPI()) return;
    await window.electronAPI!.cancelAll();
  }, []);

  const retryItem = useCallback(async (id: string) => {
    if (!hasElectronAPI()) return;
    await window.electronAPI!.retryItem(id);
    setState((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, status: 'queued' as const, error: null, progress: 0 } : item,
      ),
    }));
  }, []);

  const updateItemSettings = useCallback(async (id: string, settings: Partial<OutputSettings>) => {
    if (!hasElectronAPI()) return;
    await window.electronAPI!.updateItemSettings(id, settings);
    setState((prev) => ({
      ...prev,
      items: prev.items.map((item) =>
        item.id === id ? { ...item, settings: { ...item.settings, ...settings } } : item,
      ),
    }));
  }, []);

  const bulkApplySettings = useCallback(
    async (settings: Partial<OutputSettings>) => {
      for (const id of state.selectedIds) {
        await updateItemSettings(id, settings);
      }
    },
    [state.selectedIds, updateItemSettings],
  );

  const selectItem = useCallback((id: string, multi = false) => {
    setState((prev) => {
      if (multi) {
        const newSelected = new Set(prev.selectedIds);
        if (newSelected.has(id)) {
          newSelected.delete(id);
        } else {
          newSelected.add(id);
        }
        return { ...prev, selectedIds: newSelected, activeItemId: id };
      }
      return { ...prev, selectedIds: new Set([id]), activeItemId: id };
    });
  }, []);

  const rangeSelect = useCallback((toId: string) => {
    setState((prev) => {
      if (prev.selectedIds.size === 0) {
        return { ...prev, selectedIds: new Set([toId]), activeItemId: toId };
      }
      // Find indices of first selected and target
      const selectedArr = Array.from(prev.selectedIds);
      const firstSelected = selectedArr[0];
      const items = prev.items;
      const firstIdx = items.findIndex((i) => i.id === firstSelected);
      const toIdx = items.findIndex((i) => i.id === toId);
      if (firstIdx === -1 || toIdx === -1) return prev;
      const start = Math.min(firstIdx, toIdx);
      const end = Math.max(firstIdx, toIdx);
      const newSelected = new Set<string>();
      for (let i = start; i <= end; i++) {
        newSelected.add(items[i].id);
      }
      return { ...prev, selectedIds: newSelected, activeItemId: toId };
    });
  }, []);

  const activeItem = state.items.find((i) => i.id === state.activeItemId) ?? null;

  return {
    items: state.items,
    selectedIds: state.selectedIds,
    activeItem,
    addFiles,
    removeItem,
    clearDone,
    startQueue,
    cancelItem,
    cancelAll,
    retryItem,
    updateItemSettings,
    bulkApplySettings,
    selectItem,
    rangeSelect,
  };
}
