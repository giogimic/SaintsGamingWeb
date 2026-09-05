import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { GlobalSearch } from '../global-search';

// Mock Serapht.js router
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

// Mock ResizeObserver for any Radix UI components if used internally
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('GlobalSearch Component', () => {
  it('renders the collapsed search input by default', () => {
    render(<GlobalSearch />);
    // Input should be present with the default collapsed placeholder
    const input = screen.getByPlaceholderText('Search Saints...');
    expect(input).toBeInTheDocument();
  });

  it('expands when the input is focused', () => {
    render(<GlobalSearch />);
    const input = screen.getByPlaceholderText('Search Saints...');
    fireEvent.focus(input);
    // Placeholder changes when expanded
    expect(screen.getByPlaceholderText('Search Saints Gaming...')).toBeInTheDocument();
  });

  it('opens search with CMD/CTRL+K shortcut', () => {
    render(<GlobalSearch />);
    // Simulate Ctrl+K on window
    fireEvent.keyDown(window, { key: 'k', ctrlKey: true });
    expect(screen.getByPlaceholderText('Search Saints Gaming...')).toBeInTheDocument();
  });

  it('renders quick action links when opened and no query is typed', () => {
    render(<GlobalSearch />);
    const input = screen.getByPlaceholderText('Search Saints...');
    fireEvent.focus(input);
    
    // Quick actions should be visible
    expect(screen.getByText('Quick Navigation')).toBeInTheDocument();
    expect(screen.getByText('The Lobby')).toBeInTheDocument();
    expect(screen.getByText('Forum Discussions')).toBeInTheDocument();
  });
});
