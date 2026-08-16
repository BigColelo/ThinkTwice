// ThinkTwice ESLint configuration.
// Owned entirely by this repository — it does not extend any shared/private config.
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

module.exports = [
  ...expoConfig,
  prettierConfig,
  {
    ignores: [
      'node_modules/**',
      '.expo/**',
      'dist/**',
      'coverage/**',
      'android/**',
      'ios/**',
      'expo-env.d.ts',
    ],
  },
  {
    rules: {
      // Money and dates must never be manipulated ad hoc — the domain layer owns that.
      eqeqeq: ['error', 'always', { null: 'ignore' }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'prefer-const': 'error',
      'no-var': 'error',
      'import/order': [
        'warn',
        {
          groups: [['builtin', 'external'], 'internal', ['parent', 'sibling', 'index']],
          'newlines-between': 'always',
          alphabetize: { order: 'asc', caseInsensitive: true },
          pathGroups: [{ pattern: '@/**', group: 'internal' }],
          pathGroupsExcludedImportTypes: ['builtin'],
        },
      ],
    },
  },
  {
    // Navigation goes through one wrapper, which drops the duplicate a repeated
    // tap produces. The wrapper itself is the one place allowed to reach for the
    // real thing.
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    ignores: ['src/features/navigation/useAppRouter.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'expo-router',
              importNames: ['useRouter', 'router'],
              message:
                "Use `useAppRouter()` from '@/features/navigation/useAppRouter': it drops the second of two navigations fired by one repeated tap.",
            },
          ],
        },
      ],
    },
  },
  {
    // The @typescript-eslint plugin is only registered for TypeScript files by
    // the Expo config, so rules from it must be scoped the same way.
    files: ['**/*.ts', '**/*.tsx'],
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
    },
  },
  {
    files: ['**/*.test.ts', '**/*.test.tsx', 'jest.setup.ts', 'src/test/**'],
    rules: {
      'no-console': 'off',
    },
  },
  {
    // Build-time scripts run in Node, not in the app bundle.
    files: ['scripts/**/*.js'],
    languageOptions: {
      globals: {
        Buffer: 'readonly',
        __dirname: 'readonly',
        console: 'readonly',
        module: 'writable',
        process: 'readonly',
        require: 'readonly',
      },
    },
    rules: {
      'no-console': 'off',
    },
  },
];
