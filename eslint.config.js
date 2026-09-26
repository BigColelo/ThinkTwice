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

// A route is a default export and nothing else: it reads its parameters,
// composes feature components and decides what an action means. Anything it
// drew itself could never be tested — Expo Router ships every `.tsx` under
// `src/app` as a screen, test files included — so markup, text and layout live
// in `src/features/<area>/components`, and these keep them from drifting back.
const ROUTE_MARKUP_MESSAGE =
  'A route composes feature components. Markup of its own belongs in src/features/<area>/components, where it can be tested.';

const RESTRICTED_ROUTE_MARKUP = [
  { name: 'react-native', message: ROUTE_MARKUP_MESSAGE },
  { name: '@/components/ui/AppText', message: ROUTE_MARKUP_MESSAGE },
  { name: '@/theme', importNames: ['useTheme', 'useThemedStyles'], message: ROUTE_MARKUP_MESSAGE },
];

const ROUTE_EXPORT_MESSAGE =
  'A route file holds its default export and nothing else. Move this into src/features/<area>, where it can be tested.';

const ROUTE_HOLDS_ITS_DEFAULT_EXPORT_ONLY = [
  { selector: 'Program > FunctionDeclaration', message: ROUTE_EXPORT_MESSAGE },
  { selector: 'Program > ClassDeclaration', message: ROUTE_EXPORT_MESSAGE },
  {
    selector:
      'Program > VariableDeclaration > VariableDeclarator[init.type=/^(ArrowFunctionExpression|FunctionExpression)$/]',
    message: ROUTE_EXPORT_MESSAGE,
  },
  {
    selector: 'Program > ExportNamedDeclaration > :matches(FunctionDeclaration, ClassDeclaration)',
    message: ROUTE_EXPORT_MESSAGE,
  },
  {
    selector:
      'Program > ExportNamedDeclaration > VariableDeclaration > VariableDeclarator[init.type=/^(ArrowFunctionExpression|FunctionExpression)$/]',
    message: ROUTE_EXPORT_MESSAGE,
  },
];

// Reads go through a feature hook and writes through a service — the service
// is what names the entities a write touched, and that is the only thing that
// refreshes the other open screens. A repository reached from a screen or a
// component skips it, and the failure is silent.
const REPOSITORY_MESSAGE =
  'Screens and components never touch a repository: read through a feature hook, write through a service.';

const NO_DIRECT_REPOSITORY_ACCESS = [
  { selector: "MemberExpression[object.name='repositories']", message: REPOSITORY_MESSAGE },
  {
    selector: "VariableDeclarator[id.type='ObjectPattern'][init.callee.name='useRepositories']",
    message: REPOSITORY_MESSAGE,
  },
];

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
    files: ['src/app/**/*.tsx'],
    rules: {
      'no-restricted-imports': [
        'error',
        { paths: [RESTRICTED_ROUTER, RESTRICTED_CONFIRM, ...RESTRICTED_ROUTE_MARKUP] },
      ],
      'no-restricted-syntax': [
        'error',
        ...ROUTE_HOLDS_ITS_DEFAULT_EXPORT_ONLY,
        ...NO_DIRECT_REPOSITORY_ACCESS,
      ],
    },
  },
  {
    files: ['src/features/**/*.tsx', 'src/components/**/*.tsx'],
    // The settings provider is the one query that lives in context rather than
    // in a hook, so it reads its own row; the tests build fake repositories.
    ignores: ['**/*.test.tsx', 'src/features/settings/SettingsProvider.tsx'],
    rules: {
      'no-restricted-syntax': ['error', ...NO_DIRECT_REPOSITORY_ACCESS],
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
