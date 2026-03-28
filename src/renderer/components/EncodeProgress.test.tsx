import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { EncodeProgress, EncodeStatus } from './EncodeProgress';

describe('EncodeProgress', () => {
  const defaultProps = {
    itemId: 'test-item-1',
    status: 'queued' as EncodeStatus,
    progress: 0,
    sourceSize: 100 * 1024 * 1024, // 100 MB
    outputSize: undefined,
    outputPath: undefined,
    error: undefined,
    disabled: false,
    onStartEncode: vi.fn(),
    onCancel: vi.fn(),
    onRetry: vi.fn(),
    onOpenFolder: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the section title', () => {
      render(<EncodeProgress {...defaultProps} />);
      expect(screen.getByText('Encoding')).toBeDefined();
    });

    it('renders Start Encode button when status is queued', () => {
      render(<EncodeProgress {...defaultProps} status="queued" />);
      expect(screen.getByRole('button', { name: 'Start Encode' })).toBeDefined();
    });

    it('does not render Start Encode button when status is converting', () => {
      render(<EncodeProgress {...defaultProps} status="converting" progress={50} />);
      expect(screen.queryByRole('button', { name: 'Start Encode' })).toBeNull();
    });

    it('does not render Start Encode button when status is done', () => {
      render(<EncodeProgress {...defaultProps} status="done" outputPath="/output/video.mp4" />);
      expect(screen.queryByRole('button', { name: 'Start Encode' })).toBeNull();
    });
  });

  describe('status display', () => {
    it('shows "Queued" status badge when queued', () => {
      render(<EncodeProgress {...defaultProps} status="queued" />);
      expect(screen.getByText('Queued')).toBeDefined();
    });

    it('shows "Converting X%" status when converting with progress', () => {
      render(<EncodeProgress {...defaultProps} status="converting" progress={50} />);
      expect(screen.getByText('Converting 50%')).toBeDefined();
    });

    it('shows "Copying..." status when converting with indeterminate progress', () => {
      render(<EncodeProgress {...defaultProps} status="converting" progress={-1} />);
      expect(screen.getByText('Copying...')).toBeDefined();
    });

    it('shows "Done" status when completed', () => {
      render(<EncodeProgress {...defaultProps} status="done" outputPath="/output/video.mp4" />);
      expect(screen.getByText('Done')).toBeDefined();
    });

    it('shows "Failed" status when failed', () => {
      render(<EncodeProgress {...defaultProps} status="failed" error="Test error" />);
      expect(screen.getByText('Failed')).toBeDefined();
    });

    it('shows "Cancelled" status when cancelled', () => {
      render(<EncodeProgress {...defaultProps} status="cancelled" />);
      expect(screen.getByText('Cancelled')).toBeDefined();
    });
  });

  describe('progress bar', () => {
    it('renders progress bar when converting', () => {
      render(<EncodeProgress {...defaultProps} status="converting" progress={50} />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeDefined();
    });

    it('shows correct progress percentage', () => {
      render(<EncodeProgress {...defaultProps} status="converting" progress={75} />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar.getAttribute('aria-valuenow')).toBe('75');
    });

    it('shows indeterminate state for stream copy (progress < 0)', () => {
      render(<EncodeProgress {...defaultProps} status="converting" progress={-1} />);
      const progressBar = screen.getByRole('progressbar');
      expect(progressBar).toBeDefined();
    });

    it('does not render progress bar when not converting', () => {
      render(<EncodeProgress {...defaultProps} status="queued" />);
      expect(screen.queryByRole('progressbar')).toBeNull();
    });
  });

  describe('buttons', () => {
    it('Start Encode button calls onStartEncode when clicked', () => {
      render(<EncodeProgress {...defaultProps} status="queued" />);
      const button = screen.getByRole('button', { name: 'Start Encode' });
      fireEvent.click(button);
      expect(defaultProps.onStartEncode).toHaveBeenCalledTimes(1);
    });

    it('Cancel button appears when converting', () => {
      render(<EncodeProgress {...defaultProps} status="converting" progress={50} />);
      expect(screen.getByRole('button', { name: 'Cancel' })).toBeDefined();
    });

    it('Cancel button calls onCancel when clicked', () => {
      render(<EncodeProgress {...defaultProps} status="converting" progress={50} />);
      const button = screen.getByRole('button', { name: 'Cancel' });
      fireEvent.click(button);
      expect(defaultProps.onCancel).toHaveBeenCalledTimes(1);
    });

    it('Retry button appears when failed', () => {
      render(<EncodeProgress {...defaultProps} status="failed" error="Test error" />);
      expect(screen.getByRole('button', { name: 'Retry' })).toBeDefined();
    });

    it('Retry button calls onRetry when clicked', () => {
      render(<EncodeProgress {...defaultProps} status="failed" error="Test error" />);
      const button = screen.getByRole('button', { name: 'Retry' });
      fireEvent.click(button);
      expect(defaultProps.onRetry).toHaveBeenCalledTimes(1);
    });

    it('Retry button appears when cancelled', () => {
      render(<EncodeProgress {...defaultProps} status="cancelled" />);
      expect(screen.getByRole('button', { name: 'Retry' })).toBeDefined();
    });

    it('Start button is not rendered when disabled is true', () => {
      render(<EncodeProgress {...defaultProps} status="queued" disabled={true} />);
      // When disabled, canStart is false, so button is not rendered
      expect(screen.queryByRole('button', { name: 'Start Encode' })).toBeNull();
    });

    it('Cancel button is not rendered when no itemId', () => {
      render(<EncodeProgress {...defaultProps} status="converting" progress={50} itemId={null} />);
      expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull();
    });
  });

  describe('error display', () => {
    it('shows error message when status is failed', () => {
      render(<EncodeProgress {...defaultProps} status="failed" error="Encoding failed: out of disk space" />);
      // ErrorDisplay classifies "out of disk space" as disk-full and shows user-friendly message
      expect(screen.getByText('Out of Disk Space')).toBeDefined();
    });

    it('shows error title', () => {
      render(<EncodeProgress {...defaultProps} status="failed" error="Test error" />);
      // ErrorDisplay classifies "Test error" as unknown and shows "Error" as title
      expect(screen.getByText('Error')).toBeDefined();
    });

    it('does not show error when status is not failed', () => {
      render(<EncodeProgress {...defaultProps} status="queued" error="Some error" />);
      expect(screen.queryByText('Encoding Failed')).toBeNull();
    });
  });

  describe('completion display', () => {
    it('shows output filename when done', () => {
      render(<EncodeProgress {...defaultProps} status="done" outputPath="/output/dir/video.mp4" />);
      expect(screen.getByText('video.mp4')).toBeDefined();
    });

    it('shows Open Folder button when done', () => {
      render(<EncodeProgress {...defaultProps} status="done" outputPath="/output/dir/video.mp4" />);
      expect(screen.getByRole('button', { name: 'Open Folder' })).toBeDefined();
    });

    it('shows source size when done', () => {
      render(<EncodeProgress {...defaultProps} status="done" outputPath="/output/dir/video.mp4" sourceSize={100 * 1024 * 1024} outputSize={40 * 1024 * 1024} />);
      expect(screen.getByText('Source')).toBeDefined();
    });

    it('shows output size when done', () => {
      render(<EncodeProgress {...defaultProps} status="done" outputPath="/output/dir/video.mp4" sourceSize={100 * 1024 * 1024} outputSize={40 * 1024 * 1024} />);
      expect(screen.getByText('Output')).toBeDefined();
    });

    it('shows full path when done', () => {
      render(<EncodeProgress {...defaultProps} status="done" outputPath="/output/dir/video.mp4" />);
      expect(screen.getByText('Saved to:')).toBeDefined();
      expect(screen.getByText('/output/dir/video.mp4')).toBeDefined();
    });

    it('does not show completion when not done', () => {
      render(<EncodeProgress {...defaultProps} status="converting" progress={50} outputPath="/output/dir/video.mp4" />);
      expect(screen.queryByText('video.mp4')).toBeNull();
    });
  });

  describe('size comparison', () => {
    it('shows smaller ratio when output < source', () => {
      render(<EncodeProgress {...defaultProps} status="done" outputPath="/output/dir/video.mp4" sourceSize={100 * 1024 * 1024} outputSize={40 * 1024 * 1024} />);
      // 40MB vs 100MB = 60% smaller = -60%
      expect(screen.getByText(/-60%/)).toBeDefined();
    });

    it('shows larger ratio when output > source', () => {
      render(<EncodeProgress {...defaultProps} status="done" outputPath="/output/dir/video.mp4" sourceSize={100 * 1024 * 1024} outputSize={150 * 1024 * 1024} />);
      // 150MB vs 100MB = 50% larger = +50%
      expect(screen.getByText(/\+50%/)).toBeDefined();
    });
  });

  describe('cancelled state', () => {
    it('shows cancelled message', () => {
      render(<EncodeProgress {...defaultProps} status="cancelled" />);
      expect(screen.getByText(/Encoding was cancelled/)).toBeDefined();
    });
  });

  describe('disabled state', () => {
    it('renders Start Encode button when not disabled', () => {
      render(<EncodeProgress {...defaultProps} status="queued" disabled={false} />);
      const button = screen.getByRole('button', { name: 'Start Encode' });
      expect(button).toBeDefined();
    });
  });
});
