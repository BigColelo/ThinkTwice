import { Alert, Platform } from 'react-native';

/**
 * Confirmation dialog, behind an adapter.
 *
 * `Alert` is not implemented by `react-native-web`, so calling it directly
 * would make destructive actions silently do nothing in a browser. The web
 * branch uses the browser's own dialog instead.
 *
 * Both button labels are required, and this module supplies no default for
 * either. It has no language of its own — the app's copy lives in `src/i18n` —
 * and an optional label with an English fallback is exactly how every dialog in
 * the app once showed "Cancel" to a reader in Italian: the catalogue tests only
 * see the catalogues, so a literal here is invisible to them. Components get the
 * dismissal label filled in for them by `useConfirm`
 * (`src/features/dialogs/useConfirm`), which is the only place allowed to import
 * this function.
 */

export type ConfirmOptions = {
  title: string;
  message?: string;
  /** Names the action being confirmed — "Delete", "Remove" — never a bare "OK". */
  confirmLabel: string;
  cancelLabel: string;
  destructive?: boolean;
};

export function confirm({
  title,
  message,
  confirmLabel,
  cancelLabel,
  destructive = false,
}: ConfirmOptions): Promise<boolean> {
  if (Platform.OS === 'web') {
    // The browser's dialog labels its own buttons, in the browser's language.
    const text = message ? `${title}\n\n${message}` : title;
    return Promise.resolve(typeof window === 'undefined' ? false : window.confirm(text));
  }

  return new Promise((resolve) => {
    Alert.alert(title, message, [
      { text: cancelLabel, style: 'cancel', onPress: () => resolve(false) },
      {
        text: confirmLabel,
        style: destructive ? 'destructive' : 'default',
        onPress: () => resolve(true),
      },
    ]);
  });
}
