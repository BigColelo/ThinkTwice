import { screen, fireEvent } from '@testing-library/react-native';

import { renderWithProviders } from '@/test/renderWithProviders';
import type { RecurringCommitment } from '@/types/domain';
import { confirm } from '@/utils/confirm';

import { CommitmentForm } from './CommitmentForm';

jest.mock('@/utils/confirm', () => ({ confirm: jest.fn(async () => true) }));

/**
 * The shared add/edit form for a recurring commitment.
 *
 * This form is where the figure every other screen measures against is entered,
 * so the two things worth holding in place are that a non-monthly amount is
 * shown as the monthly figure it becomes *before* it is saved, and that the
 * destructive action asks first. None of it was reachable by a test until the
 * form moved out of the route.
 */

const mockedConfirm = jest.mocked(confirm);

function commitment(overrides: Partial<RecurringCommitment> = {}): RecurringCommitment {
  return {
    id: 'c1',
    name: 'Home insurance',
    amountCents: 24_000,
    frequency: 'annual',
    categoryId: 'insurance',
    isActive: true,
    createdAt: '2026-08-01T09:00:00.000Z',
    updatedAt: '2026-08-01T09:00:00.000Z',
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  mockedConfirm.mockResolvedValue(true);
});

describe('CommitmentForm, adding', () => {
  it('refuses to save without a name', async () => {
    const onSubmit = jest.fn(async () => undefined);
    await renderWithProviders(<CommitmentForm submitLabel="Add commitment" onSubmit={onSubmit} />);

    await fireEvent.press(screen.getByText('Add commitment'));

    expect(screen.getByText('Give this commitment a name.')).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('refuses to save without an amount, rather than storing a zero never typed', async () => {
    const onSubmit = jest.fn(async () => undefined);
    await renderWithProviders(<CommitmentForm submitLabel="Add commitment" onSubmit={onSubmit} />);

    await fireEvent.changeText(screen.getByLabelText('Name'), 'Rent');
    await fireEvent.press(screen.getByText('Add commitment'));

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('hands the caller integer cents and the chosen frequency', async () => {
    const onSubmit = jest.fn(async () => undefined);
    await renderWithProviders(<CommitmentForm submitLabel="Add commitment" onSubmit={onSubmit} />);

    await fireEvent.changeText(screen.getByLabelText('Name'), 'Rent');
    await fireEvent.changeText(screen.getByLabelText('Amount'), '600');
    await fireEvent.press(screen.getByText('Add commitment'));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'Rent', amountCents: 60_000, frequency: 'monthly' }),
    );
  });

  it('offers neither the pause switch nor deletion for something not yet saved', async () => {
    await renderWithProviders(
      <CommitmentForm submitLabel="Add commitment" onSubmit={jest.fn(async () => undefined)} />,
    );

    expect(screen.queryByText('Counts towards your month')).toBeNull();
    expect(screen.queryByText('Delete commitment')).toBeNull();
  });

  it('says what a quarterly bill costs per month before it is saved', async () => {
    // €300 every quarter is €100 of the month every purchase is measured against.
    await renderWithProviders(
      <CommitmentForm submitLabel="Add commitment" onSubmit={jest.fn(async () => undefined)} />,
    );

    await fireEvent.changeText(screen.getByLabelText('Amount'), '300');
    await fireEvent.press(screen.getByLabelText('Quarterly'));

    expect(screen.getByText('Monthly equivalent')).toBeTruthy();
    expect(screen.getByText(/EUR\s100 \/ month/)).toBeTruthy();
    expect(screen.getByText(/EUR\s1,200 \/ year/)).toBeTruthy();
  });

  it('leaves the monthly equivalent out when it would only repeat the amount', async () => {
    await renderWithProviders(
      <CommitmentForm submitLabel="Add commitment" onSubmit={jest.fn(async () => undefined)} />,
    );

    await fireEvent.changeText(screen.getByLabelText('Amount'), '600');

    expect(screen.queryByText('Monthly equivalent')).toBeNull();
  });

  it('says so when saving fails, instead of closing as though it worked', async () => {
    const onSubmit = jest.fn(async () => {
      throw new Error('storage');
    });
    await renderWithProviders(<CommitmentForm submitLabel="Add commitment" onSubmit={onSubmit} />);

    await fireEvent.changeText(screen.getByLabelText('Name'), 'Rent');
    await fireEvent.changeText(screen.getByLabelText('Amount'), '600');
    await fireEvent.press(screen.getByText('Add commitment'));

    expect(
      await screen.findByText('This commitment could not be saved. Please try again.'),
    ).toBeTruthy();
  });
});

describe('CommitmentForm, editing', () => {
  it('opens on what was stored', async () => {
    await renderWithProviders(
      <CommitmentForm
        commitment={commitment()}
        submitLabel="Save changes"
        onSubmit={jest.fn(async () => undefined)}
      />,
    );

    expect(screen.getByDisplayValue('Home insurance')).toBeTruthy();
    expect(screen.getByDisplayValue('240')).toBeTruthy();
    expect(screen.getByText('Monthly equivalent')).toBeTruthy();
  });

  it('offers pausing, which keeps the row instead of deleting it', async () => {
    const onSubmit = jest.fn(async () => undefined);
    await renderWithProviders(
      <CommitmentForm commitment={commitment()} submitLabel="Save changes" onSubmit={onSubmit} />,
    );

    await fireEvent(screen.getByLabelText('Counts towards your month'), 'valueChange', false);
    await fireEvent.press(screen.getByText('Save changes'));

    expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ isActive: false }));
  });

  it('asks before deleting, then hands the deletion to the caller', async () => {
    const onDelete = jest.fn(async () => undefined);
    await renderWithProviders(
      <CommitmentForm
        commitment={commitment()}
        submitLabel="Save changes"
        onSubmit={jest.fn(async () => undefined)}
        onDelete={onDelete}
      />,
    );

    await fireEvent.press(screen.getByText('Delete commitment'));

    expect(mockedConfirm).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Delete this commitment?',
        destructive: true,
        cancelLabel: 'Cancel',
      }),
    );
    expect(onDelete).toHaveBeenCalledTimes(1);
  });

  it('deletes nothing when the confirmation is declined', async () => {
    mockedConfirm.mockResolvedValue(false);
    const onDelete = jest.fn(async () => undefined);
    await renderWithProviders(
      <CommitmentForm
        commitment={commitment()}
        submitLabel="Save changes"
        onSubmit={jest.fn(async () => undefined)}
        onDelete={onDelete}
      />,
    );

    await fireEvent.press(screen.getByText('Delete commitment'));

    expect(onDelete).not.toHaveBeenCalled();
  });

  it('says so when the deletion fails', async () => {
    const onDelete = jest.fn(async () => {
      throw new Error('storage');
    });
    await renderWithProviders(
      <CommitmentForm
        commitment={commitment()}
        submitLabel="Save changes"
        onSubmit={jest.fn(async () => undefined)}
        onDelete={onDelete}
      />,
    );

    await fireEvent.press(screen.getByText('Delete commitment'));

    expect(
      await screen.findByText('This commitment could not be deleted. Please try again.'),
    ).toBeTruthy();
  });
});
