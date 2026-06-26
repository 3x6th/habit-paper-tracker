import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { loadEnv } from 'vite';

const DEFAULT_BASE_PATH = '/habit-paper-tracker/';

function normalizeBasePath(value: string | undefined): string {
  const basePath = value?.trim() || DEFAULT_BASE_PATH;

  if (basePath === '/' || basePath === './') {
    return basePath;
  }

  if (/^(https?:)?\/\//.test(basePath)) {
    return basePath.endsWith('/') ? basePath : `${basePath}/`;
  }

  const withLeadingSlash = basePath.startsWith('/') ? basePath : `/${basePath}`;
  return withLeadingSlash.endsWith('/') ? withLeadingSlash : `${withLeadingSlash}/`;
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    base: normalizeBasePath(process.env.VITE_BASE_PATH ?? env.VITE_BASE_PATH),
    plugins: [react()],
    test: {
      environment: 'jsdom',
      globals: true,
      setupFiles: './src/test/setup.ts',
    },
  };
});
