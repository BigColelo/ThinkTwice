import Constants from 'expo-constants';

import { appVersion } from './appVersion';

jest.mock('expo-constants', () => ({
  __esModule: true,
  default: { expoConfig: { version: '1.0.0' } },
}));

/** The manifest is not guaranteed to be there, or to be complete. */
const manifest = Constants as unknown as { expoConfig: { version?: unknown } | null };

describe('appVersion', () => {
  it('reads the version declared in the app manifest', () => {
    manifest.expoConfig = { version: '1.2.3' };

    expect(appVersion()).toBe('1.2.3');
  });

  it('returns null when there is no manifest to read', () => {
    // Some runtimes have no `expoConfig`; the screen then leaves the line out
    // rather than printing a placeholder.
    manifest.expoConfig = null;

    expect(appVersion()).toBeNull();
  });

  it('treats a missing or empty version as no version', () => {
    manifest.expoConfig = {};
    expect(appVersion()).toBeNull();

    manifest.expoConfig = { version: '' };
    expect(appVersion()).toBeNull();

    manifest.expoConfig = { version: 3 };
    expect(appVersion()).toBeNull();
  });
});
