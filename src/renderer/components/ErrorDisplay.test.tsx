import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorDisplay, classifyError, getErrorTitle, getErrorMessage } from './ErrorDisplay';

describe('ErrorDisplay', () => {
  const defaultProps = {
    title: 'Test Error',
    message: 'This is a test error message',
    severity: 'error' as const,
    showRetry: false,
    onRetry: undefined,
    className: '',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders error title', () => {
      render(<ErrorDisplay {...defaultProps} />);
      expect(screen.getByText('Test Error')).toBeDefined();
    });

    it('renders error message', () => {
      render(<ErrorDisplay {...defaultProps} />);
      expect(screen.getByText('This is a test error message')).toBeDefined();
    });

    it('renders error icon', () => {
      render(<ErrorDisplay {...defaultProps} />);
      expect(screen.getByText('!')).toBeDefined();
    });

    it('renders warning severity icon', () => {
      render(<ErrorDisplay {...defaultProps} severity="warning" />);
      expect(screen.getByText('⚠')).toBeDefined();
    });

    it('renders info severity icon', () => {
      render(<ErrorDisplay {...defaultProps} severity="info" />);
      expect(screen.getByText('i')).toBeDefined();
    });

    it('renders with custom className', () => {
      const { container } = render(<ErrorDisplay {...defaultProps} className="custom-class" />);
      expect((container.firstChild as Element)?.className).toContain('custom-class');
    });
  });

  describe('retry button', () => {
    it('does not render retry button when showRetry is false', () => {
      render(<ErrorDisplay {...defaultProps} showRetry={false} />);
      expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
    });

    it('does not render retry button when onRetry is not provided', () => {
      render(<ErrorDisplay {...defaultProps} showRetry={true} />);
      expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
    });

    it('renders retry button when showRetry and onRetry are provided', () => {
      const onRetry = vi.fn();
      render(<ErrorDisplay {...defaultProps} showRetry={true} onRetry={onRetry} />);
      expect(screen.getByRole('button', { name: 'Retry' })).toBeDefined();
    });

    it('calls onRetry when retry button is clicked', () => {
      const onRetry = vi.fn();
      render(<ErrorDisplay {...defaultProps} showRetry={true} onRetry={onRetry} />);
      const button = screen.getByRole('button', { name: 'Retry' });
      fireEvent.click(button);
      expect(onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('severity styling', () => {
    it('applies error severity class', () => {
      const { container } = render(<ErrorDisplay {...defaultProps} severity="error" />);
      expect((container.firstChild as Element)?.className).toContain('error');
    });

    it('applies warning severity class', () => {
      const { container } = render(<ErrorDisplay {...defaultProps} severity="warning" />);
      expect((container.firstChild as Element)?.className).toContain('warning');
    });

    it('applies info severity class', () => {
      const { container } = render(<ErrorDisplay {...defaultProps} severity="info" />);
      expect((container.firstChild as Element)?.className).toContain('info');
    });
  });
});

describe('classifyError', () => {
  it('classifies ffprobe errors', () => {
    expect(classifyError('ffprobe exited with code 1')).toBe('ffprobe-failed');
    expect(classifyError('ffprobe: error parsing input')).toBe('ffprobe-failed');
    expect(classifyError('Invalid data found')).toBe('ffprobe-failed');
  });

  it('classifies disk full errors', () => {
    expect(classifyError('No space left on device')).toBe('disk-full');
    expect(classifyError('disk full')).toBe('disk-full');
  });

  it('classifies file not found errors', () => {
    expect(classifyError('File not found')).toBe('file-not-found');
    expect(classifyError('enoent')).toBe('file-not-found');
    expect(classifyError('No such file')).toBe('file-not-found');
  });

  it('classifies permission errors', () => {
    expect(classifyError('Permission denied')).toBe('permission-denied');
    expect(classifyError('EACCES')).toBe('permission-denied');
  });

  it('classifies encode errors', () => {
    expect(classifyError('ffmpeg encoding failed')).toBe('encode-failed');
    expect(classifyError('ffmpeg encode error')).toBe('encode-failed');
    expect(classifyError('Error during encode')).toBe('encode-failed');
  });

  it('returns unknown for unclassified messages', () => {
    expect(classifyError('some random error')).toBe('unknown');
  });

  it('returns unknown for empty messages', () => {
    expect(classifyError('')).toBe('unknown');
    expect(classifyError(undefined)).toBe('unknown');
  });
});

describe('getErrorTitle', () => {
  it('returns appropriate titles for each error type', () => {
    expect(getErrorTitle('ffprobe-failed')).toBe('File Cannot Be Read');
    expect(getErrorTitle('encode-failed')).toBe('Encoding Failed');
    expect(getErrorTitle('disk-full')).toBe('Out of Disk Space');
    expect(getErrorTitle('file-not-found')).toBe('File Not Found');
    expect(getErrorTitle('permission-denied')).toBe('Permission Denied');
    expect(getErrorTitle('unknown')).toBe('Error');
  });
});

describe('getErrorMessage', () => {
  it('returns user-friendly messages for each error type', () => {
    expect(getErrorMessage('ffprobe-failed')).toContain('corrupt');
    expect(getErrorMessage('encode-failed')).toContain('encoding');
    expect(getErrorMessage('disk-full')).toContain('disk space');
    expect(getErrorMessage('file-not-found')).toContain('moved or deleted');
    expect(getErrorMessage('permission-denied')).toContain('permission');
    expect(getErrorMessage('unknown')).toContain('unexpected');
  });

  it('uses raw message when provided for encode-failed', () => {
    const rawMsg = 'Custom error message';
    expect(getErrorMessage('encode-failed', rawMsg)).toBe(rawMsg);
  });

  it('uses raw message when provided for unknown', () => {
    const rawMsg = 'Something went wrong';
    expect(getErrorMessage('unknown', rawMsg)).toBe(rawMsg);
  });

  it('ignores raw message for known error types', () => {
    const rawMsg = 'Custom disk full message';
    const msg = getErrorMessage('disk-full', rawMsg);
    expect(msg).not.toBe(rawMsg);
    expect(msg).toContain('disk space');
  });
});
