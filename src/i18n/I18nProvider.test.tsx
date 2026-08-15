import { fireEvent, render, screen } from '@testing-library/react-native';
import React, { useState } from 'react';
import { Pressable, Text } from 'react-native';

import { I18nProvider, useT } from './I18nProvider';
import { applyLanguage } from './instance';

/**
 * The provider's two jobs, and the one hazard between them.
 *
 * A language change has to reach the screens below it, and it must not reach
 * anything above it mid-render. The app's tree makes that a real risk rather
 * than a theoretical one: `DatabaseGate` renders copy and sits *above* the
 * provider that follows the stored preference, so an implementation that pushed
 * the change through i18next's `languageChanged` event updated a committed
 * ancestor while a descendant was still rendering — which React reports as
 * "Cannot update a component while rendering a different component".
 */

function Copy({ testID }: { testID: string }): React.ReactElement {
  const t = useT();
  return <Text testID={testID}>{t('common.cancel')}</Text>;
}

afterEach(() => {
  applyLanguage('en');
});

describe('I18nProvider', () => {
  it('translates the subtree below it', async () => {
    await render(
      <I18nProvider language="it">
        <Copy testID="inner" />
      </I18nProvider>,
    );

    expect(screen.getByTestId('inner')).toHaveTextContent('Annulla');
  });

  it('resolves `system` to a language it ships', async () => {
    await render(
      <I18nProvider language="system">
        <Copy testID="inner" />
      </I18nProvider>,
    );

    expect(screen.getByTestId('inner').props.children).toBeTruthy();
  });

  it('leaves an outer provider on its own language when an inner one changes', async () => {
    // The shape of the real tree: the gate reads the bootstrap provider, the
    // screens read the one that follows settings. Each keeps its own language
    // rather than both tracking whichever was applied last.
    await render(
      <I18nProvider language="en">
        <Copy testID="gate" />
        <I18nProvider language="de">
          <Copy testID="screen" />
        </I18nProvider>
      </I18nProvider>,
    );

    expect(screen.getByTestId('gate')).toHaveTextContent('Cancel');
    expect(screen.getByTestId('screen')).toHaveTextContent('Abbrechen');
  });

  it('changes language without updating a component above it', async () => {
    // Reproduces the crash directly: the switch happens while a descendant of
    // the outer provider re-renders, with a committed sibling above reading copy.
    const messages: string[] = [];
    const spy = jest.spyOn(console, 'error').mockImplementation((...args) => {
      messages.push(String(args[0]));
    });

    function Switcher(): React.ReactElement {
      const [language, setLanguage] = useState<'en' | 'de'>('en');
      return (
        <>
          <Pressable testID="switch" onPress={() => setLanguage('de')}>
            <Text>switch</Text>
          </Pressable>
          <I18nProvider language={language}>
            <Copy testID="screen" />
          </I18nProvider>
        </>
      );
    }

    await render(
      <I18nProvider language="en">
        <Copy testID="gate" />
        <Switcher />
      </I18nProvider>,
    );

    await fireEvent.press(screen.getByTestId('switch'));

    expect(screen.getByTestId('screen')).toHaveTextContent('Abbrechen');
    expect(messages.filter((message) => message.includes('while rendering'))).toEqual([]);

    spy.mockRestore();
  });

  it('throws rather than falling back when used outside a provider', async () => {
    const spy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    await expect(render(<Copy testID="orphan" />)).rejects.toThrow(/I18nProvider/);

    spy.mockRestore();
  });
});
