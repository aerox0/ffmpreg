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
      getQueueState: vi.fn().mockResolvedValue({ items: [], currentItemId: null, isProcessing: false }),
      addFiles: vi.fn().mockResolvedValue({ success: true, items: [] }),
      removeItem: vi.fn().mockResolvedValue({ success: true }),
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
