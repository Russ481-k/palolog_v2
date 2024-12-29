import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock next/router
vi.mock('next/router', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
    query: {},
  }),
}));

// Mock environment variables
vi.stubEnv('NEXT_PUBLIC_BASE_URL', 'http://localhost:3000');
vi.stubEnv('NEXT_PUBLIC_ENV_NAME', 'Test Environment');
vi.stubEnv('NEXT_PUBLIC_ENV_EMOJI', '🧪');
vi.stubEnv('NEXT_PUBLIC_ENV_COLOR_SCHEME', 'teal');
vi.stubEnv('NEXT_PUBLIC_IS_DEMO', 'false');
