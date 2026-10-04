import nextConfig from 'eslint-config-next';

/**
 * Flat ESLint config (Next 16 / ESLint 9). `eslint-config-next`'s default export is
 * already a full `Linter.Config[]` (core-web-vitals + typescript + its own ignores),
 * so we only add project-specific ignores and a couple of relaxations for tests.
 *
 * @type {import('eslint').Linter.Config[]}
 */
const eslintConfig = [
  { ignores: ['.next/**', 'coverage/**', 'next-env.d.ts'] },
  ...nextConfig,
  {
    files: ['**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}', 'vitest.config.ts', 'vitest.setup.ts'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      // `eslint-plugin-react-hooks` v6 (shipped by `eslint-config-next` 16) adds React
      // Compiler readiness rules as errors. `set-state-in-effect` fires on the
      // legitimate, React-docs-endorsed "sync from an external system" patterns we rely
      // on throughout (SSR-safe mount flags, `matchMedia`/`resize` listeners, restoring
      // the session on load). We don't enable the compiler, so treat it as advisory.
      'react-hooks/set-state-in-effect': 'warn',
    },
  },
];

export default eslintConfig;
