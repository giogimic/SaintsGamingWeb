import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Cleanup DOM after each test to ensure tests are isolated
afterEach(() => {
  cleanup();
});
