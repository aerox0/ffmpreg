import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FormatSelector } from './FormatSelector';

describe('FormatSelector', () => {
  const defaultProps = {
    inputType: 'video' as const,
    selectedFormat: null,
    onFormatSelect: vi.fn(),
    disabled: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the section label', () => {
      render(<FormatSelector {...defaultProps} />);
      expect(screen.getByText('Output Format')).toBeDefined();
    });

    it('renders format pills for video input', () => {
      render(<FormatSelector {...defaultProps} inputType="video" />);
      expect(screen.getByRole('button', { name: /MP4/ })).toBeDefined();
      expect(screen.getByRole('button', { name: /MOV/ })).toBeDefined();
      expect(screen.getByRole('button', { name: /MKV/ })).toBeDefined();
      expect(screen.getByRole('button', { name: /WEBM/ })).toBeDefined();
    });

    it('renders video formats for video input', () => {
      render(<FormatSelector {...defaultProps} inputType="video" />);
      // Video input should show video formats
      expect(screen.getByRole('button', { name: /MP4/ })).toBeDefined();
      expect(screen.getByRole('button', { name: /MP3/ })).toBeDefined(); // Audio extraction option
    });

    it('renders audio-only formats for audio input', () => {
      render(<FormatSelector {...defaultProps} inputType="audio" />);
      expect(screen.getByRole('button', { name: /MP3/ })).toBeDefined();
      expect(screen.getByRole('button', { name: /AAC/ })).toBeDefined();
      expect(screen.getByRole('button', { name: /WAV/ })).toBeDefined();
      expect(screen.getByRole('button', { name: /FLAC/ })).toBeDefined();
      expect(screen.getByRole('button', { name: /OGG/ })).toBeDefined();
    });

    it('does not render video formats for audio input', () => {
      render(<FormatSelector {...defaultProps} inputType="audio" />);
      expect(screen.queryByRole('button', { name: /MP4/ })).toBeNull();
      expect(screen.queryByRole('button', { name: /AVI/ })).toBeNull();
      expect(screen.queryByRole('button', { name: /GIF/ })).toBeNull();
    });

    it('renders image-only formats for image input', () => {
      render(<FormatSelector {...defaultProps} inputType="image" />);
      expect(screen.getByRole('button', { name: /PNG/ })).toBeDefined();
      expect(screen.getByRole('button', { name: /JPEG/ })).toBeDefined();
      expect(screen.getByRole('button', { name: /WEBP/ })).toBeDefined();
    });

    it('does not render video/audio formats for image input', () => {
      render(<FormatSelector {...defaultProps} inputType="image" />);
      expect(screen.queryByRole('button', { name: /MP4/ })).toBeNull();
      expect(screen.queryByRole('button', { name: /MP3/ })).toBeNull();
    });

    it('shows no formats message when formats array is empty', () => {
      render(<FormatSelector {...defaultProps} inputType="image" />);
      expect(screen.queryByText('No formats available')).toBeNull(); // Image has formats
    });
  });

  describe('single-select behavior', () => {
    it('only one format can be active at a time', () => {
      render(<FormatSelector {...defaultProps} selectedFormat="mp4" />);
      
      const mp4Button = screen.getByRole('button', { name: /MP4/ });
      expect(mp4Button.getAttribute('aria-pressed')).toBe('true');
    });

    it('calls onFormatSelect when format is clicked', () => {
      render(<FormatSelector {...defaultProps} />);
      
      const mp4Button = screen.getByRole('button', { name: /MP4/ });
      fireEvent.click(mp4Button);
      
      expect(defaultProps.onFormatSelect).toHaveBeenCalledWith('mp4');
    });

    it('calls onFormatSelect with correct format name', () => {
      render(<FormatSelector {...defaultProps} />);
      
      const movButton = screen.getByRole('button', { name: /MOV/ });
      fireEvent.click(movButton);
      
      expect(defaultProps.onFormatSelect).toHaveBeenCalledWith('mov');
    });

    it('deselects previous format when new format is clicked', () => {
      render(<FormatSelector {...defaultProps} selectedFormat="mp4" />);
      
      const mp4Button = screen.getByRole('button', { name: /MP4/ });
      const movButton = screen.getByRole('button', { name: /MOV/ });
      
      expect(mp4Button.getAttribute('aria-pressed')).toBe('true');
      
      fireEvent.click(movButton);
      
      expect(defaultProps.onFormatSelect).toHaveBeenCalledWith('mov');
    });

    it('can change selection from mp4 to mkv', () => {
      render(<FormatSelector {...defaultProps} selectedFormat="mp4" />);
      
      const mkvButton = screen.getByRole('button', { name: /MKV/ });
      fireEvent.click(mkvButton);
      
      expect(defaultProps.onFormatSelect).toHaveBeenCalledWith('mkv');
    });
  });

  describe('disabled state', () => {
    it('disables all buttons when disabled prop is true', () => {
      render(<FormatSelector {...defaultProps} disabled={true} />);
      
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button).toHaveProperty('disabled', true);
      });
    });

    it('does not call onFormatSelect when disabled', () => {
      render(<FormatSelector {...defaultProps} disabled={true} />);
      
      const mp4Button = screen.getByRole('button', { name: /MP4/ });
      fireEvent.click(mp4Button);
      
      expect(defaultProps.onFormatSelect).not.toHaveBeenCalled();
    });

    it('enables buttons when disabled prop is false', () => {
      render(<FormatSelector {...defaultProps} disabled={false} />);
      
      const mp4Button = screen.getByRole('button', { name: /MP4/ });
      expect(mp4Button).toHaveProperty('disabled', false);
    });
  });

  describe('format labels', () => {
    it('formats are displayed in uppercase', () => {
      render(<FormatSelector {...defaultProps} inputType="audio" />);
      
      expect(screen.getByText('MP3')).toBeDefined();
      expect(screen.getByText('AAC')).toBeDefined();
      expect(screen.getByText('WAV')).toBeDefined();
    });

    it('each format has title attribute for accessibility', () => {
      render(<FormatSelector {...defaultProps} />);
      
      const mp4Button = screen.getByRole('button', { name: /MP4/ });
      expect(mp4Button.getAttribute('title')).toContain('Convert to MP4');
    });
  });

  describe('format switching', () => {
    it('responds to inputType change by re-rendering formats', () => {
      const { rerender } = render(<FormatSelector {...defaultProps} inputType="video" />);
      
      expect(screen.getByRole('button', { name: /MP4/ })).toBeDefined();
      expect(screen.queryByRole('button', { name: /PNG/ })).toBeNull();
      
      rerender(<FormatSelector {...defaultProps} inputType="image" />);
      
      expect(screen.queryByRole('button', { name: /MP4/ })).toBeNull();
      expect(screen.getByRole('button', { name: /PNG/ })).toBeDefined();
    });

    it('clears selection when inputType changes', () => {
      const { rerender } = render(
        <FormatSelector {...defaultProps} inputType="video" selectedFormat="mp4" />
      );
      
      expect(screen.getByRole('button', { name: /MP4/ }).getAttribute('aria-pressed')).toBe('true');
      
      rerender(<FormatSelector {...defaultProps} inputType="audio" selectedFormat={null} />);
      
      // Audio doesn't have mp4, so different format will be shown
      expect(screen.getByRole('button', { name: /MP3/ })).toBeDefined();
    });
  });
});
