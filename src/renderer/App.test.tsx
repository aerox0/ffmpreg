import { describe, it, expect, beforeEach } from 'vitest';
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
