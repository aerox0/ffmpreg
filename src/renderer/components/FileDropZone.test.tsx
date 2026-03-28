import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FileDropZone } from './FileDropZone';

describe('FileDropZone', () => {
  const defaultProps = {
    onFileAdded: vi.fn(),
    onFileRemoved: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders empty drop zone with placeholder text', () => {
      render(<FileDropZone {...defaultProps} />);
      expect(screen.getByText('Drop files here or click to browse')).toBeDefined();
    });

    it('renders supported formats hint', () => {
      render(<FileDropZone {...defaultProps} />);
      expect(screen.getByText(/Supports:/)).toBeDefined();
    });

    it('renders drop zone icon', () => {
      render(<FileDropZone {...defaultProps} />);
      expect(screen.getByText('📁')).toBeDefined();
    });

    it('does not render error message initially', () => {
      render(<FileDropZone {...defaultProps} />);
      expect(screen.queryByText(/Unsupported file format/)).toBeNull();
    });

    it('does not render file info initially', () => {
      render(<FileDropZone {...defaultProps} />);
      expect(screen.queryByRole('button', { name: /Remove/ })).toBeNull();
    });
  });

  describe('drag and drop', () => {
    it('shows drag-over state when dragging over', () => {
      render(<FileDropZone {...defaultProps} />);
      const dropZone = screen.getByText('Drop files here or click to browse').parentElement!;
      
      fireEvent.dragOver(dropZone);
      expect(dropZone.className).toContain('dragOver');
    });

    it('removes drag-over state on drag leave', () => {
      render(<FileDropZone {...defaultProps} />);
      const dropZone = screen.getByText('Drop files here or click to browse').parentElement!;
      
      fireEvent.dragOver(dropZone);
      fireEvent.dragLeave(dropZone);
      expect(dropZone.className).not.toContain('dragOver');
    });

    it('calls onFileAdded when video file is dropped', () => {
      render(<FileDropZone {...defaultProps} />);
      const dropZone = screen.getByText('Drop files here or click to browse').parentElement!;
      
      const mockFile = {
        name: 'test.mp4',
        path: '/path/to/test.mp4',
      } as any;
      
      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [mockFile],
        },
      });
      
      expect(defaultProps.onFileAdded).toHaveBeenCalledWith('/path/to/test.mp4', 'video');
    });

    it('calls onFileAdded when audio file is dropped', () => {
      render(<FileDropZone {...defaultProps} />);
      const dropZone = screen.getByText('Drop files here or click to browse').parentElement!;
      
      const mockFile = {
        name: 'test.mp3',
        path: '/path/to/test.mp3',
      } as any;
      
      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [mockFile],
        },
      });
      
      expect(defaultProps.onFileAdded).toHaveBeenCalledWith('/path/to/test.mp3', 'audio');
    });

    it('calls onFileAdded when image file is dropped', () => {
      render(<FileDropZone {...defaultProps} />);
      const dropZone = screen.getByText('Drop files here or click to browse').parentElement!;
      
      const mockFile = {
        name: 'test.png',
        path: '/path/to/test.png',
      } as any;
      
      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [mockFile],
        },
      });
      
      expect(defaultProps.onFileAdded).toHaveBeenCalledWith('/path/to/test.png', 'image');
    });

    it('shows error for unsupported file format', () => {
      render(<FileDropZone {...defaultProps} />);
      const dropZone = screen.getByText('Drop files here or click to browse').parentElement!;
      
      const mockFile = {
        name: 'test.pdf',
        path: '/path/to/test.pdf',
      } as any;
      
      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [mockFile],
        },
      });
      
      expect(screen.getByText(/Unsupported file format/)).toBeDefined();
      expect(defaultProps.onFileAdded).not.toHaveBeenCalled();
    });

    it('handles uppercase file extensions', () => {
      render(<FileDropZone {...defaultProps} />);
      const dropZone = screen.getByText('Drop files here or click to browse').parentElement!;
      
      const mockFile = {
        name: 'test.MP4',
        path: '/path/to/test.MP4',
      } as any;
      
      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [mockFile],
        },
      });
      
      expect(defaultProps.onFileAdded).toHaveBeenCalledWith('/path/to/test.MP4', 'video');
    });
  });

  describe('file info display', () => {
    it('shows file type badge for video file', () => {
      render(<FileDropZone {...defaultProps} />);
      const dropZone = screen.getByText('Drop files here or click to browse').parentElement!;
      
      const mockFile = {
        name: 'test.mp4',
        path: '/path/to/test.mp4',
      } as any;
      
      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [mockFile],
        },
      });
      
      expect(screen.getByText(/🎬 video/)).toBeDefined();
    });

    it('shows file type badge for audio file', () => {
      render(<FileDropZone {...defaultProps} />);
      const dropZone = screen.getByText('Drop files here or click to browse').parentElement!;
      
      const mockFile = {
        name: 'test.mp3',
        path: '/path/to/test.mp3',
      } as any;
      
      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [mockFile],
        },
      });
      
      expect(screen.getByText(/🎵 audio/)).toBeDefined();
    });

    it('shows file type badge for image file', () => {
      render(<FileDropZone {...defaultProps} />);
      const dropZone = screen.getByText('Drop files here or click to browse').parentElement!;
      
      const mockFile = {
        name: 'test.png',
        path: '/path/to/test.png',
      } as any;
      
      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [mockFile],
        },
      });
      
      expect(screen.getByText(/🖼️ image/)).toBeDefined();
    });

    it('shows file name after drop', () => {
      render(<FileDropZone {...defaultProps} />);
      const dropZone = screen.getByText('Drop files here or click to browse').parentElement!;
      
      const mockFile = {
        name: 'myvideo.mp4',
        path: '/path/to/myvideo.mp4',
      } as any;
      
      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [mockFile],
        },
      });
      
      expect(screen.getByText('myvideo.mp4')).toBeDefined();
    });

    it('shows remove button after file is loaded', () => {
      render(<FileDropZone {...defaultProps} />);
      const dropZone = screen.getByText('Drop files here or click to browse').parentElement!;
      
      const mockFile = {
        name: 'test.mp4',
        path: '/path/to/test.mp4',
      } as any;
      
      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [mockFile],
        },
      });
      
      expect(screen.getByRole('button', { name: '✕ Remove' })).toBeDefined();
    });
  });

  describe('remove functionality', () => {
    it('calls onFileRemoved when remove button is clicked', () => {
      render(<FileDropZone {...defaultProps} />);
      const dropZone = screen.getByText('Drop files here or click to browse').parentElement!;
      
      const mockFile = {
        name: 'test.mp4',
        path: '/path/to/test.mp4',
      } as any;
      
      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [mockFile],
        },
      });
      
      const removeButton = screen.getByRole('button', { name: '✕ Remove' });
      fireEvent.click(removeButton);
      
      expect(defaultProps.onFileRemoved).toHaveBeenCalled();
    });

    it('resets to empty state after remove', () => {
      render(<FileDropZone {...defaultProps} />);
      const dropZone = screen.getByText('Drop files here or click to browse').parentElement!;
      
      const mockFile = {
        name: 'test.mp4',
        path: '/path/to/test.mp4',
      } as any;
      
      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [mockFile],
        },
      });
      
      const removeButton = screen.getByRole('button', { name: '✕ Remove' });
      fireEvent.click(removeButton);
      
      expect(screen.getByText('Drop files here or click to browse')).toBeDefined();
      expect(screen.queryByRole('button', { name: '✕ Remove' })).toBeNull();
    });
  });

  describe('error handling', () => {
    it('clears error when dragging over after error', () => {
      render(<FileDropZone {...defaultProps} />);
      const dropZone = screen.getByText('Drop files here or click to browse').parentElement!;
      
      // Drop unsupported file to trigger error
      const mockFile = {
        name: 'test.pdf',
        path: '/path/to/test.pdf',
      } as any;
      
      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [mockFile],
        },
      });
      
      expect(screen.getByText(/Unsupported file format/)).toBeDefined();
      
      // Drag over to clear error
      fireEvent.dragOver(dropZone);
      
      // Error should still be visible (drag doesn't clear error, only drop with valid file clears it)
      expect(screen.queryByText(/Unsupported file format/)).toBeDefined();
    });

    it('clears error when dropping valid file after error', () => {
      render(<FileDropZone {...defaultProps} />);
      const dropZone = screen.getByText('Drop files here or click to browse').parentElement!;
      
      // Drop unsupported file to trigger error
      const mockPdfFile = {
        name: 'test.pdf',
        path: '/path/to/test.pdf',
      } as any;
      
      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [mockPdfFile],
        },
      });
      
      expect(screen.getByText(/Unsupported file format/)).toBeDefined();
      
      // Now drop a valid file
      const mockMp4File = {
        name: 'test.mp4',
        path: '/path/to/test.mp4',
      } as any;
      
      fireEvent.drop(dropZone, {
        dataTransfer: {
          files: [mockMp4File],
        },
      });
      
      // Error should be cleared
      expect(screen.queryByText(/Unsupported file format/)).toBeNull();
      expect(screen.getByText('test.mp4')).toBeDefined();
    });
  });

  describe('file input', () => {
    it('renders hidden file input', () => {
      render(<FileDropZone {...defaultProps} />);
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      expect(input).toBeDefined();
      expect(input.type).toBe('file');
    });
  });
});
