import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { QualityPreset } from './QualityPreset';

describe('QualityPreset', () => {
  const defaultProps = {
    selectedPreset: 'good' as const,
    crf: 25,
    audioBitrate: 192,
    onPresetChange: vi.fn(),
    onCrfChange: vi.fn(),
    onAudioBitrateChange: vi.fn(),
    disabled: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('rendering', () => {
    it('renders the quality preset section title', () => {
      render(<QualityPreset {...defaultProps} />);
      expect(screen.getByText('Quality Preset')).toBeDefined();
    });

    it('renders all four preset buttons', () => {
      render(<QualityPreset {...defaultProps} />);
      expect(screen.getByRole('button', { name: /Compact/ })).toBeDefined();
      expect(screen.getByRole('button', { name: /Good/ })).toBeDefined();
      expect(screen.getByRole('button', { name: /High/ })).toBeDefined();
      expect(screen.getByRole('button', { name: /Custom/ })).toBeDefined();
    });

    it('renders CRF slider', () => {
      render(<QualityPreset {...defaultProps} />);
      const slider = screen.getByRole('slider');
      expect(slider).toBeDefined();
    });

    it('renders audio bitrate display', () => {
      render(<QualityPreset {...defaultProps} />);
      expect(screen.getByText('Audio Bitrate')).toBeDefined();
      expect(screen.getByText('192kbps')).toBeDefined();
    });

    it('renders CRF label and value', () => {
      render(<QualityPreset {...defaultProps} />);
      expect(screen.getByText('Quality (CRF)')).toBeDefined();
      expect(screen.getByText('25')).toBeDefined(); // CRF value
    });

    it('renders preset descriptions', () => {
      render(<QualityPreset {...defaultProps} />);
      expect(screen.getByText('Smallest file, lower quality')).toBeDefined();
      expect(screen.getByText('Balanced quality & size')).toBeDefined();
      expect(screen.getByText('Best quality, larger size')).toBeDefined();
      expect(screen.getByText('Manual CRF control')).toBeDefined();
    });
  });

  describe('preset selection', () => {
    it('calls onPresetChange when preset button is clicked', () => {
      render(<QualityPreset {...defaultProps} selectedPreset="good" />);
      
      const compactButton = screen.getByRole('button', { name: /Compact/ });
      fireEvent.click(compactButton);
      
      expect(defaultProps.onPresetChange).toHaveBeenCalledWith('compact');
    });

    it('calls onCrfChange with correct default CRF when switching to compact', () => {
      render(<QualityPreset {...defaultProps} selectedPreset="good" />);
      
      const compactButton = screen.getByRole('button', { name: /Compact/ });
      fireEvent.click(compactButton);
      
      // Compact default CRF is 31
      expect(defaultProps.onCrfChange).toHaveBeenCalledWith(31);
    });

    it('calls onCrfChange with correct default CRF when switching to high', () => {
      render(<QualityPreset {...defaultProps} selectedPreset="good" />);
      
      const highButton = screen.getByRole('button', { name: /High/ });
      fireEvent.click(highButton);
      
      // High default CRF is 20
      expect(defaultProps.onCrfChange).toHaveBeenCalledWith(20);
    });

    it('calls onAudioBitrateChange when switching presets', () => {
      render(<QualityPreset {...defaultProps} selectedPreset="good" />);
      
      const highButton = screen.getByRole('button', { name: /High/ });
      fireEvent.click(highButton);
      
      // High preset uses 256kbps
      expect(defaultProps.onAudioBitrateChange).toHaveBeenCalledWith(256);
    });

    it('highlights the selected preset button', () => {
      render(<QualityPreset {...defaultProps} selectedPreset="high" />);
      
      const highButton = screen.getByRole('button', { name: /High/ });
      expect(highButton.getAttribute('aria-pressed')).toBe('true');
    });

    it('does not call callbacks when disabled', () => {
      render(<QualityPreset {...defaultProps} disabled={true} />);
      
      const compactButton = screen.getByRole('button', { name: /Compact/ });
      fireEvent.click(compactButton);
      
      expect(defaultProps.onPresetChange).not.toHaveBeenCalled();
      expect(defaultProps.onCrfChange).not.toHaveBeenCalled();
    });
  });

  describe('CRF slider bounds', () => {
    it('slider min/max matches compact preset (28-35)', () => {
      render(<QualityPreset {...defaultProps} selectedPreset="compact" crf={31} />);
      
      const slider = screen.getByRole('slider');
      expect(slider.getAttribute('min')).toBe('28');
      expect(slider.getAttribute('max')).toBe('35');
    });

    it('slider min/max matches good preset (22-28)', () => {
      render(<QualityPreset {...defaultProps} selectedPreset="good" crf={25} />);
      
      const slider = screen.getByRole('slider');
      expect(slider.getAttribute('min')).toBe('22');
      expect(slider.getAttribute('max')).toBe('28');
    });

    it('slider min/max matches high preset (18-23)', () => {
      render(<QualityPreset {...defaultProps} selectedPreset="high" crf={20} />);
      
      const slider = screen.getByRole('slider');
      expect(slider.getAttribute('min')).toBe('18');
      expect(slider.getAttribute('max')).toBe('23');
    });

    it('slider min/max matches custom preset (18-35)', () => {
      render(<QualityPreset {...defaultProps} selectedPreset="custom" crf={25} />);
      
      const slider = screen.getByRole('slider');
      expect(slider.getAttribute('min')).toBe('18');
      expect(slider.getAttribute('max')).toBe('35');
    });

    it('displays correct CRF range labels for each preset', () => {
      const { rerender } = render(<QualityPreset {...defaultProps} selectedPreset="compact" />);
      expect(screen.getByText('CRF 28-35')).toBeDefined();

      rerender(<QualityPreset {...defaultProps} selectedPreset="good" />);
      expect(screen.getAllByText(/CRF 22-28/).length).toBeGreaterThan(0);

      rerender(<QualityPreset {...defaultProps} selectedPreset="high" />);
      expect(screen.getAllByText(/CRF 18-23/).length).toBeGreaterThan(0);

      rerender(<QualityPreset {...defaultProps} selectedPreset="custom" />);
      expect(screen.getAllByText(/CRF 18-35/).length).toBeGreaterThan(0);
    });
  });

  describe('CRF slider interaction', () => {
    it('calls onCrfChange when slider value changes', () => {
      render(<QualityPreset {...defaultProps} selectedPreset="good" crf={25} />);
      
      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '26' } });
      
      expect(defaultProps.onCrfChange).toHaveBeenCalledWith(26);
    });

    it('clamps slider value to preset bounds on change', () => {
      render(<QualityPreset {...defaultProps} selectedPreset="compact" crf={31} />);
      
      const slider = screen.getByRole('slider');
      // Try to set value below compact min (28)
      fireEvent.change(slider, { target: { value: '20' } });
      
      // Should clamp to 28
      expect(defaultProps.onCrfChange).toHaveBeenCalledWith(28);
    });

    it('clamps slider value to upper bound on change', () => {
      render(<QualityPreset {...defaultProps} selectedPreset="compact" crf={31} />);
      
      const slider = screen.getByRole('slider');
      // Try to set value above compact max (35)
      fireEvent.change(slider, { target: { value: '40' } });
      
      // Should clamp to 35
      expect(defaultProps.onCrfChange).toHaveBeenCalledWith(35);
    });

    it('updates displayed CRF value when slider changes', () => {
      render(<QualityPreset {...defaultProps} selectedPreset="good" crf={25} />);
      
      const slider = screen.getByRole('slider');
      fireEvent.change(slider, { target: { value: '24' } });
      
      expect(screen.getByText('24')).toBeDefined();
    });

    it('disables slider when disabled prop is true', () => {
      render(<QualityPreset {...defaultProps} disabled={true} />);
      
      const slider = screen.getByRole('slider');
      expect(slider).toHaveProperty('disabled', true);
    });
  });

  describe('slider keyboard accessibility', () => {
    it('decreases CRF on arrow left key', () => {
      render(<QualityPreset {...defaultProps} selectedPreset="good" crf={25} />);
      
      const slider = screen.getByRole('slider');
      fireEvent.keyDown(slider, { key: 'ArrowLeft' });
      
      expect(defaultProps.onCrfChange).toHaveBeenCalledWith(24);
    });

    it('increases CRF on arrow right key', () => {
      render(<QualityPreset {...defaultProps} selectedPreset="good" crf={25} />);
      
      const slider = screen.getByRole('slider');
      fireEvent.keyDown(slider, { key: 'ArrowRight' });
      
      expect(defaultProps.onCrfChange).toHaveBeenCalledWith(26);
    });

    it('sets CRF to minimum on Home key', () => {
      render(<QualityPreset {...defaultProps} selectedPreset="good" crf={25} />);
      
      const slider = screen.getByRole('slider');
      fireEvent.keyDown(slider, { key: 'Home' });
      
      expect(defaultProps.onCrfChange).toHaveBeenCalledWith(22); // Good min
    });

    it('sets CRF to maximum on End key', () => {
      render(<QualityPreset {...defaultProps} selectedPreset="good" crf={25} />);
      
      const slider = screen.getByRole('slider');
      fireEvent.keyDown(slider, { key: 'End' });
      
      expect(defaultProps.onCrfChange).toHaveBeenCalledWith(28); // Good max
    });

    it('respects bounds on keyboard navigation', () => {
      render(<QualityPreset {...defaultProps} selectedPreset="high" crf={18} />);
      
      const slider = screen.getByRole('slider');
      // Try to go below min
      fireEvent.keyDown(slider, { key: 'ArrowLeft' });
      
      expect(defaultProps.onCrfChange).toHaveBeenCalledWith(18); // Already at min
    });
  });

  describe('audio bitrate display', () => {
    it('shows correct bitrate for compact preset', () => {
      render(<QualityPreset {...defaultProps} selectedPreset="compact" audioBitrate={128} />);
      expect(screen.getByText('128kbps')).toBeDefined();
    });

    it('shows correct bitrate for good preset', () => {
      render(<QualityPreset {...defaultProps} selectedPreset="good" audioBitrate={192} />);
      expect(screen.getByText('192kbps')).toBeDefined();
    });

    it('shows correct bitrate for high preset', () => {
      render(<QualityPreset {...defaultProps} selectedPreset="high" audioBitrate={256} />);
      expect(screen.getByText('256kbps')).toBeDefined();
    });

    it('shows custom preset audio range note', () => {
      render(<QualityPreset {...defaultProps} selectedPreset="custom" audioBitrate={192} />);
      expect(screen.getByText(/128-320kbps/)).toBeDefined();
    });

    it('does not show custom preset note for non-custom presets', () => {
      render(<QualityPreset {...defaultProps} selectedPreset="good" audioBitrate={192} />);
      expect(screen.queryByText(/128-320kbps/)).toBeNull();
    });
  });

  describe('slider bounds display', () => {
    it('shows slider bound labels', () => {
      render(<QualityPreset {...defaultProps} selectedPreset="good" />);
      // Good preset has CRF range 22-28
      expect(screen.getByText('22 (Smaller)')).toBeDefined();
      expect(screen.getByText('28 (Larger)')).toBeDefined();
    });
  });
});
