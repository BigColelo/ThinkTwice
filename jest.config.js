/** @type {import('jest').Config} */
module.exports = {
  preset: 'jest-expo',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Metro resolves lucide's `react-native` export condition to an .mjs bundle
    // that Jest's transform does not cover. Point the test runner at the
    // equivalent CommonJS build instead.
    '^lucide-react-native$':
      '<rootDir>/node_modules/lucide-react-native/dist/cjs/lucide-react-native.js',
  },
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|lucide-react-native|react-native-safe-area-context|react-clone-referenced-element)',
  ],
  collectCoverageFrom: [
    'src/domain/**/*.ts',
    'src/utils/**/*.ts',
    'src/db/**/*.ts',
    '!**/*.d.ts',
    '!**/index.ts',
  ],
  testPathIgnorePatterns: ['/node_modules/', '/.expo/', '/dist/'],
};
