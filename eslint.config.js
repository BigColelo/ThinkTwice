// ThinkTwice ESLint configuration.
// Owned entirely by this repository — it does not extend any shared/private config.
const expoConfig = require('eslint-config-expo/flat');
const prettierConfig = require('eslint-config-prettier');

// Navigation goes through one wrapper, which drops the duplicate a repeated tap
// produces. The wrapper itself is the one place allowed to reach for the real
// thing.
const RESTRICTED_ROUTER = {
  name: 'expo-router',
  importNames: ['useRouter', 'router'],
  message:
    "Use `useAppRouter()` from '@/features/navigation/useAppRouter': it drops the second of two navigations fired by one repeated tap.",
};

// Confirmation dialogs go through one hook, which fills in the translated Cancel
// label. The adapter has no defaults of its own, so a screen importing it
// directly would have to invent a label — which is how an English "Cancel" once
// reached every other language.
const RESTRICTED_CONFIRM = {
  name: '@/utils/confirm',
  importNames: ['confirm'],
  message:
    "Use `useConfirm()` from '@/features/dialogs/useConfirm': it supplies the Cancel label in the screen's language.",
};

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
  // `no-restricted-imports` takes one configuration per file, and a later block
  // replaces an earlier one rather than adding to it. So the full set is declared
  // once, and each exemption re-declares the restrictions that still apply to it.
  {
    files: ['src/**/*.ts', 'src/**/*.tsx'],
    rules: {
      'no-restricted-imports': ['error', { paths: [RESTRICTED_ROUTER, RESTRICTED_CONFIRM] }],
    },
  },
  {
    files: ['src/features/navigation/useAppRouter.ts'],
    rules: {
      'no-restricted-imports': ['error', { paths: [RESTRICTED_CONFIRM] }],
    },
  },
  {
    // The hook, and the tests that mock the adapter to assert what a screen asked.
    files: ['src/features/dialogs/useConfirm.ts', 'src/**/*.test.ts', 'src/**/*.test.tsx'],
    rules: {
      'no-restricted-imports': ['error', { paths: [RESTRICTED_ROUTER] }],
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
