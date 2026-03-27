import { useEffect, useCallback } from 'react';

interface KeyboardShortcutsOptions {
  onDelete?: () => void;
  onEnter?: () => void;
  onEscape?: () => void;
  onArrowUp?: () => void;
  onArrowDown?: () => void;
  onSelectAll?: () => void;
  enabled?: boolean;
}

export function useKeyboardShortcuts({
  onDelete,
  onEnter,
  onEscape,
  onArrowUp,
  onArrowDown,
  onSelectAll,
  enabled = true,
}: KeyboardShortcutsOptions) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!enabled) return;

      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onDelete?.();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        onEnter?.();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        onEscape?.();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        onArrowUp?.();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        onArrowDown?.();
      } else if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        onSelectAll?.();
      }
    },
    [enabled, onDelete, onEnter, onEscape, onArrowUp, onArrowDown, onSelectAll],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);
}
