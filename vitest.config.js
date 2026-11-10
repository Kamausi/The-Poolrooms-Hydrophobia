import { defineConfig } from 'vitest/config';
// Unit tests: pure modules only (director, memory, hull, maths, content). No browser.
export default defineConfig({ test: { include: ['tests/unit/**/*.test.js'], environment: 'node' } });
