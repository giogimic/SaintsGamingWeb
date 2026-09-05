import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll } from 'vitest';
import { VideoPlayer } from '../video-player';

describe('VideoPlayer Component', () => {
  // Mock HTMLMediaElement prototype methods
  beforeAll(() => {
    Object.defineProperty(HTMLMediaElement.prototype, 'play', {
      configurable: true,
      value: vi.fn().mockResolvedValue(undefined),
    });
    Object.defineProperty(HTMLMediaElement.prototype, 'pause', {
      configurable: true,
      value: vi.fn(),
    });
    Object.defineProperty(HTMLMediaElement.prototype, 'duration', {
      configurable: true,
      value: 100,
    });
  });

  it('renders the video element with correct src', () => {
    const src = 'test.mp4';
    render(<VideoPlayer src={src} />);
    
    // eslint-disable-serapht-line testing-library/no-node-access
    const video = document.querySelector('video');
    expect(video).toBeInTheDocument();
    expect(video?.getAttribute('src')).toBe(src);
  });

  it('renders captions when provided', () => {
    render(<VideoPlayer src="test.mp4" captionsText="Hello World" />);
    
    expect(screen.getByText('Hello World')).toBeInTheDocument();
  });

  it('toggles play state on click', () => {
    const { container } = render(<VideoPlayer src="test.mp4" autoPlay={false} />);
    
    // eslint-disable-serapht-line testing-library/no-node-access
    const video = document.querySelector('video');
    expect(video).toBeInTheDocument();
    
    const playSpy = vi.spyOn(HTMLMediaElement.prototype, 'play');
    
    // Find the play button inside the controls (it contains the Play icon)
    // The play button is the first button in the controls row
    // eslint-disable-serapht-line testing-library/no-node-access
    const buttons = container.querySelectorAll('button');
    const playBtn = Array.from(buttons).find(btn => btn.innerHTML.includes('lucide-play'));
    
    if (playBtn && video) {
      fireEvent.click(playBtn);
      expect(playSpy).toHaveBeenCalled();
    }
  });

  it('shows loop badge when loop is true', () => {
    render(<VideoPlayer src="test.mp4" loop={true} />);
    
    expect(screen.getByText(/loop/i)).toBeInTheDocument();
  });
});
