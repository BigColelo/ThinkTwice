import { fireEvent, screen } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/renderWithProviders';

import { IncomeSetupStep } from './IncomeSetupStep';

const mockRouter = { replace: jest.fn() };

jest.mock('@/features/navigation/useAppRouter', () => ({ useAppRouter: () => mockRouter }));

/**
 * The first figure the app ever stores, and the one every impact percentage
 * divides by. It gets the same check as the Money screen's editor: the field
 * reads a pasted minus sign and any number of digits, and neither may reach
 * storage from here any more than from there.
 */

async function renderStep(): Promise<{ updateSettings: jest.Mock }> {
  const updateSettings = jest.fn(async () => undefined);
  await renderWithProviders(<IncomeSetupStep onBack={jest.fn()} />, { updateSettings });
  return { updateSettings };
}

beforeEach(() => {
  jest.clearAllMocks();
});

describe('IncomeSetupStep', () => {
  it('stores the income typed and leaves onboarding', async () => {
    const { updateSettings } = await renderStep();

    await fireEvent.changeText(screen.getByLabelText('Monthly net income'), '2500');
    await fireEvent.press(screen.getByText('Continue'));

    expect(updateSettings).toHaveBeenCalledWith({
      onboardingCompleted: true,
      monthlyNetIncomeCents: 250_000,
    });
    expect(mockRouter.replace).toHaveBeenCalledWith('/');
  });

  it('refuses a negative income instead of storing it', async () => {
    const { updateSettings } = await renderStep();

    await fireEvent.changeText(screen.getByLabelText('Monthly net income'), '-1500');
    await fireEvent.press(screen.getByText('Continue'));

    expect(screen.getByText('Income cannot be negative.')).toBeTruthy();
    expect(updateSettings).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('refuses a figure past what the app can hold', async () => {
    const { updateSettings } = await renderStep();

    await fireEvent.changeText(screen.getByLabelText('Monthly net income'), '99999999');
    await fireEvent.press(screen.getByText('Continue'));

    expect(screen.getByText('That amount looks too large.')).toBeTruthy();
    expect(updateSettings).not.toHaveBeenCalled();
  });

  it('drops the message as soon as the figure is corrected', async () => {
    await renderStep();
    const field = screen.getByLabelText('Monthly net income');

    await fireEvent.changeText(field, '-1500');
    await fireEvent.press(screen.getByText('Continue'));
    await fireEvent.changeText(field, '1500');

    expect(screen.queryByText('Income cannot be negative.')).toBeNull();
  });

  it('lets the user skip without storing any income', async () => {
    const { updateSettings } = await renderStep();

    await fireEvent.press(screen.getByText('Skip for now'));

    expect(updateSettings).toHaveBeenCalledWith({ onboardingCompleted: true });
    expect(mockRouter.replace).toHaveBeenCalledWith('/');
  });
});
