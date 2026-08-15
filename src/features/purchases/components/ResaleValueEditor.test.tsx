import { screen, fireEvent } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/renderWithProviders';

import { ResaleValueEditor } from './ResaleValueEditor';

/**
 * The one figure on the purchase screen the user revises over time.
 *
 * Two things are asserted that are easy to get wrong: `null` and `0` are
 * different answers and both have to survive the round trip, and the save button
 * only exists while there is something to save.
 */

const saver = (): jest.Mock<Promise<void>, [number | null]> =>
  jest.fn(async (_valueCents: number | null) => undefined);

describe('ResaleValueEditor', () => {
  it('offers nothing to save until something changes', async () => {
    await renderWithProviders(<ResaleValueEditor valueCents={20_000} onSave={saver()} />);

    expect(screen.getByDisplayValue('200')).toBeTruthy();
    expect(screen.queryByText('Save resale value')).toBeNull();
  });

  it('saves the amount the user typed', async () => {
    const onSave = saver();
    await renderWithProviders(<ResaleValueEditor valueCents={20_000} onSave={onSave} />);

    await fireEvent.changeText(screen.getByLabelText('What is it worth today?'), '175.50');
    await fireEvent.press(screen.getByText('Save resale value'));

    expect(onSave).toHaveBeenCalledWith(17_550);
  });

  it('treats zero as a real answer, not as an empty field', async () => {
    // "It is worth nothing today" is a different statement from "I never said".
    const onSave = saver();
    await renderWithProviders(<ResaleValueEditor valueCents={20_000} onSave={onSave} />);

    await fireEvent.changeText(screen.getByLabelText('What is it worth today?'), '0');
    await fireEvent.press(screen.getByText('Save resale value'));

    expect(onSave).toHaveBeenCalledWith(0);
  });

  it('clears the estimate with null when the field is emptied', async () => {
    const onSave = saver();
    await renderWithProviders(<ResaleValueEditor valueCents={20_000} onSave={onSave} />);

    await fireEvent.changeText(screen.getByLabelText('What is it worth today?'), '');
    await fireEvent.press(screen.getByText('Save resale value'));

    expect(onSave).toHaveBeenCalledWith(null);
  });

  it('adopts a value that changed elsewhere without losing the field', async () => {
    const view = await renderWithProviders(
      <ResaleValueEditor valueCents={20_000} onSave={saver()} />,
    );

    await view.rerender(<ResaleValueEditor valueCents={15_000} onSave={saver()} />);

    expect(screen.getByDisplayValue('150')).toBeTruthy();
    expect(screen.queryByText('Save resale value')).toBeNull();
  });

  it('says so when saving fails, and keeps the draft', async () => {
    const onSave = jest.fn(async () => {
      throw new Error('write failed');
    });
    await renderWithProviders(<ResaleValueEditor valueCents={null} onSave={onSave} />);

    await fireEvent.changeText(screen.getByLabelText('What is it worth today?'), '90');
    await fireEvent.press(screen.getByText('Save resale value'));

    expect(screen.getByText('This could not be saved. Please try again.')).toBeTruthy();
    expect(screen.getByDisplayValue('90')).toBeTruthy();
  });
});
