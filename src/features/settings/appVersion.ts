import Constants from 'expo-constants';

/**
 * The app's own version, as declared in `app.json`.
 *
 * Read through `expo-constants` because that is where the manifest reaches the
 * running app. It returns `null` rather than a placeholder when there is no
 * manifest to read — some runtimes have no `expoConfig` — so the screen can leave
 * the line out instead of showing the user the word "unknown".
 *
 * This is the *app* version. The schema version shown under Data is a different
 * number: what the local database looks like, which migrations move forward
 * independently of any release.
 */
export function appVersion(): string | null {
  const version = Constants.expoConfig?.version;
  return typeof version === 'string' && version !== '' ? version : null;
}
