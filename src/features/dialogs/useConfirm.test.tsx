import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import React from 'react';
import { Pressable, Text } from 'react-native';

import { applyLanguage, DEFAULT_LANGUAGE, I18nProvider } from '@/i18n';
import type { LanguageCode } from '@/types/domain';
import { confirm } from '@/utils/confirm';

import { useConfirm, type ConfirmRequest } from './useConfirm';

jest.mock('@/utils/confirm', () => ({ confirm: jest.fn(async () => true) }));

/**
 * The hook exists for one reason: the dismissal label used to default to an
 * English "Cancel" inside the adapter, where no catalogue test could see it, so
 * every dialog in the app showed it to readers of the other five languages.
 * What is asserted is therefore the label itself, in a language other than
 * English, coming from the provider the screen was rendered under.
 */

const mockedConfirm = jest.mocked(confirm);

function Probe({
  request,
  onAnswer,
}: {
  request: ConfirmRequest;
  onAnswer: (answer: boolean) => void;
}): React.ReactElement {
  const confirm = useConfirm();
  return (
    <Pressable testID="ask" onPress={() => void confirm(request).then(onAnswer)}>
      <Text>ask</Text>
    </Pressable>
  );
}

async function ask(
  language: LanguageCode,
  request: ConfirmRequest,
  onAnswer: (answer: boolean) => void = () => undefined,
): Promise<void> {
  await render(
    <I18nProvider language={language}>
      <Probe request={request} onAnswer={onAnswer} />
    </I18nProvider>,
  );
  await fireEvent.press(screen.getByTestId('ask'));
}

afterEach(() => {
  jest.clearAllMocks();
  applyLanguage(DEFAULT_LANGUAGE);
});

describe('useConfirm', () => {
  it('fills in the dismissal label in the language of the screen', async () => {
    await ask('it', { title: 'Eliminare?', confirmLabel: 'Elimina', destructive: true });

    expect(mockedConfirm).toHaveBeenCalledWith({
      title: 'Eliminare?',
      confirmLabel: 'Elimina',
      destructive: true,
      cancelLabel: 'Annulla',
    });
  });

  it('follows the provider it was rendered under, not the default language', async () => {
    await ask('ar', { title: 'حذف؟', confirmLabel: 'حذف' });

    expect(mockedConfirm).toHaveBeenCalledWith(expect.objectContaining({ cancelLabel: 'إلغاء' }));
  });

  it('leaves a dismissal label the caller chose alone', async () => {
    await ask('de', { title: 'Löschen?', confirmLabel: 'Löschen', cancelLabel: 'Behalten' });

    expect(mockedConfirm).toHaveBeenCalledWith(
      expect.objectContaining({ cancelLabel: 'Behalten' }),
    );
  });

  it('hands the answer back unchanged', async () => {
    mockedConfirm.mockResolvedValueOnce(false);
    const onAnswer = jest.fn();

    await ask('en', { title: 'Delete?', confirmLabel: 'Delete' }, onAnswer);

    await waitFor(() => expect(onAnswer).toHaveBeenCalledWith(false));
  });
});
