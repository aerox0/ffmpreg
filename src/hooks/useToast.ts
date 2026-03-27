import { useState, useCallback } from 'react';

export interface Toast {
  id: string;
  fileName: string;
  inputType: 'video' | 'audio' | 'image';
  status: 'done' | 'failed';
  outputSize?: number;
  sourceSize?: number;
}

const MAX_VISIBLE = 3;
const AUTO_DISMISS_MS = 4000;

export function useToast() {
  // Internal queue — holds ALL toasts in memory (FIFO, no drops)
  const [queue, setQueue] = useState<Toast[]>([]);
  const [exiting, setExiting] = useState<Set<string>>(new Set());

  const addToast = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setQueue((prev) => [...prev, { ...toast, id }]);
    if (toast.status !== 'failed') {
      setTimeout(() => dismissToast(id), AUTO_DISMISS_MS);
    }
    return id;
  }, []);

  const dismissToast = useCallback((id: string) => {
    setExiting((prev) => new Set([...prev, id]));
    setTimeout(() => {
      setQueue((prev) => prev.filter((t) => t.id !== id));
      setExiting((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }, 300); // matches CSS exit animation duration
  }, []);

  // Derived: only the last MAX_VISIBLE toasts are shown (FIFO, no drops)
  const visibleToasts = queue.slice(-MAX_VISIBLE);

  return { toasts: visibleToasts, queue, exiting, addToast, dismissToast };
}
