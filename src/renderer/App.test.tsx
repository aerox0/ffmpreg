import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { App } from './App';

// Mock the electronAPI
beforeEach(() => {
  Object.defineProperty(window, 'electronAPI', {
    value: {
      minimizeWindow: () => {},
      maximizeWindow: () => {},
      closeWindow: () => {},
      isMaximized: () => Promise.resolve(false),
      onMaximizeChange: () => () => {},
      onStatusChange: () => () => {},
      onProgress: () => () => {},
      getQueueState: vi.fn().mockResolvedValue({ items: [], currentItemId: null, isProcessing: false }),
      addFiles: vi.fn().mockResolvedValue({ success: true, items: [] }),
      removeItem: vi.fn().mockResolvedValue({ success: true }),
      updateItemSettings: vi.fn().mockResolvedValue({ success: true }),
      startQueue: vi.fn().mockResolvedValue({ success: true }),
      cancelItem: vi.fn().mockResolvedValue({ success: true }),
      retryItem: vi.fn().mockResolvedValue({ success: true }),
      getQueueItem: vi.fn().mockResolvedValue(undefined),
      shellOpenFolder: vi.fn().mockResolvedValue({ success: true }),
    },
    writable: true,
  });
});

describe('App', () => {
  it('renders without crashing', () => {
    render(<App />);
    expect(screen.getByText('ffmpreg')).toBeDefined();
  });
});
