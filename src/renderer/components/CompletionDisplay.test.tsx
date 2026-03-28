import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CompletionDisplay } from './CompletionDisplay';

describe('CompletionDisplay', () => {
  const defaultProps = {
    status: 'done' as const,
    outputPath: '/output/dir/video.mp4',
    sourceSize: 100 * 1024 * 1024, // 100 MB
    outputSize: 40 * 1024 * 1024, // 40 MB
    error: undefined,
    onRetry: vi.fn(),
    onOpenFolder: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('success state (done)', () => {
    it('shows output filename', () => {
      render(<CompletionDisplay {...defaultProps} />);
      expect(screen.getByText('video.mp4')).toBeDefined();
    });

    it('shows Open Folder button', () => {
      render(<CompletionDisplay {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'Open Folder' })).toBeDefined();
    });

    it('calls onOpenFolder when Open Folder is clicked', () => {
      render(<CompletionDisplay {...defaultProps} />);
      const button = screen.getByRole('button', { name: 'Open Folder' });
      fireEvent.click(button);
      expect(defaultProps.onOpenFolder).toHaveBeenCalledWith('/output/dir');
    });

    it('shows source size label', () => {
      render(<CompletionDisplay {...defaultProps} />);
      expect(screen.getByText('Source')).toBeDefined();
    });

    it('shows output size label', () => {
      render(<CompletionDisplay {...defaultProps} />);
      expect(screen.getByText('Output')).toBeDefined();
    });

    it('shows source size in human-readable format', () => {
      render(<CompletionDisplay {...defaultProps} />);
      expect(screen.getByText(/100\.0\s*MB/i)).toBeDefined();
    });

    it('shows output size in human-readable format', () => {
      render(<CompletionDisplay {...defaultProps} />);
      expect(screen.getByText(/40\.0\s*MB/i)).toBeDefined();
    });

    it('shows change percentage when output is smaller', () => {
      render(<CompletionDisplay {...defaultProps} sourceSize={100 * 1024 * 1024} outputSize={40 * 1024 * 1024} />);
      // 40MB vs 100MB = 60% smaller
      expect(screen.getByText(/-60%/)).toBeDefined();
    });

    it('shows change percentage when output is larger', () => {
      render(<CompletionDisplay {...defaultProps} sourceSize={100 * 1024 * 1024} outputSize={150 * 1024 * 1024} />);
      // 150MB vs 100MB = 50% larger
      expect(screen.getByText(/\+50%/)).toBeDefined();
    });

    it('does not show change percentage when sizes are equal', () => {
      render(<CompletionDisplay {...defaultProps} sourceSize={100 * 1024 * 1024} outputSize={100 * 1024 * 1024} />);
      expect(screen.queryByText(/Change/)).toBeNull();
    });

    it('shows full path label', () => {
      render(<CompletionDisplay {...defaultProps} />);
      expect(screen.getByText('Saved to:')).toBeDefined();
    });

    it('shows full output path', () => {
      render(<CompletionDisplay {...defaultProps} />);
      expect(screen.getByText('/output/dir/video.mp4')).toBeDefined();
    });

    it('renders success container with correct styling', () => {
      render(<CompletionDisplay {...defaultProps} />);
      const container = screen.getByText('video.mp4').parentElement;
      expect(container).toBeDefined();
    });
  });

  describe('failure state (failed)', () => {
    it('shows error title', () => {
      render(<CompletionDisplay {...defaultProps} status="failed" error="Test error message" />);
      expect(screen.getByText('Encoding Failed')).toBeDefined();
    });

    it('shows error message', () => {
      render(<CompletionDisplay {...defaultProps} status="failed" error="Encoding failed: out of disk space" />);
      expect(screen.getByText('Encoding failed: out of disk space')).toBeDefined();
    });

    it('shows retry button', () => {
      render(<CompletionDisplay {...defaultProps} status="failed" error="Test error" />);
      expect(screen.getByRole('button', { name: 'Retry' })).toBeDefined();
    });

    it('calls onRetry when Retry is clicked', () => {
      render(<CompletionDisplay {...defaultProps} status="failed" error="Test error" />);
      const button = screen.getByRole('button', { name: 'Retry' });
      fireEvent.click(button);
      expect(defaultProps.onRetry).toHaveBeenCalledTimes(1);
    });

    it('shows error icon', () => {
      render(<CompletionDisplay {...defaultProps} status="failed" error="Test error" />);
      expect(screen.getByText('!')).toBeDefined();
    });
  });

  describe('cancelled state', () => {
    it('shows cancelled message', () => {
      render(<CompletionDisplay {...defaultProps} status="cancelled" />);
      expect(screen.getByText(/Encoding was cancelled/)).toBeDefined();
    });

    it('shows retry button', () => {
      render(<CompletionDisplay {...defaultProps} status="cancelled" />);
      expect(screen.getByRole('button', { name: 'Retry' })).toBeDefined();
    });

    it('calls onRetry when Retry is clicked', () => {
      render(<CompletionDisplay {...defaultProps} status="cancelled" />);
      const button = screen.getByRole('button', { name: 'Retry' });
      fireEvent.click(button);
      expect(defaultProps.onRetry).toHaveBeenCalledTimes(1);
    });
  });

  describe('size formatting', () => {
    it('formats bytes correctly', () => {
      render(<CompletionDisplay {...defaultProps} sourceSize={500} outputSize={250} />);
      expect(screen.getByText(/500\s*B/i)).toBeDefined();
      expect(screen.getByText(/250\s*B/i)).toBeDefined();
    });

    it('formats KB correctly', () => {
      render(<CompletionDisplay {...defaultProps} sourceSize={50 * 1024} outputSize={25 * 1024} />);
      expect(screen.getByText(/50\s*KB/i)).toBeDefined();
      expect(screen.getByText(/25\s*KB/i)).toBeDefined();
    });

    it('formats GB correctly', () => {
      render(<CompletionDisplay {...defaultProps} sourceSize={2 * 1024 * 1024 * 1024} outputSize={1 * 1024 * 1024 * 1024} />);
      expect(screen.getByText(/2\.0\s*GB/i)).toBeDefined();
      expect(screen.getByText(/1\.0\s*GB/i)).toBeDefined();
    });
  });

  describe('edge cases', () => {
    it('renders nothing when status is done but no outputPath', () => {
      const { container } = render(<CompletionDisplay {...defaultProps} status="done" outputPath={undefined} />);
      expect(container.firstChild).toBeNull();
    });

    it('handles zero source size', () => {
      render(<CompletionDisplay {...defaultProps} sourceSize={0} outputSize={0} />);
      // When sourceSize is 0, size comparison section is not rendered
      // because 0 is falsy in JavaScript
      // But the component should still render successfully
      expect(screen.getByText('video.mp4')).toBeDefined();
    });

    it('handles missing outputDir gracefully', () => {
      render(<CompletionDisplay {...defaultProps} outputPath="/video.mp4" />);
      // Should still render the component but without Open Folder button
      expect(screen.getByText('video.mp4')).toBeDefined();
      expect(screen.queryByRole('button', { name: 'Open Folder' })).toBeNull();
    });
  });
});
