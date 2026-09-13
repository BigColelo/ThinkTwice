import { screen, fireEvent } from '@testing-library/react-native';

import { PURCHASE_SORTS } from '@/db/repositories';
import { renderWithProviders } from '@/test/renderWithProviders';

import { PurchaseSortBar } from './PurchaseSortBar';

/**
 * The ordering control for the purchase list.
 *
 * Two things: every sort the repository can actually apply is offered, so the
 * bar and the SQL behind it cannot drift apart, and the selected one is
 * announced as selected rather than only filled in.
 */

describe('PurchaseSortBar', () => {
  it('offers every sort the repository supports', async () => {
    await renderWithProviders(<PurchaseSortBar sort="recent" onChange={jest.fn()} count={5} />);

    expect(PURCHASE_SORTS).toHaveLength(5);
    for (const label of [
      'Recent',
      'Most used',
      'Lowest cost/use',
      'Highest cost/use',
      'Highest price',
    ]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it('exposes the current sort as selected, not by colour alone', async () => {
    await renderWithProviders(<PurchaseSortBar sort="most_used" onChange={jest.fn()} count={5} />);

    expect(screen.getByLabelText('Most used').props.accessibilityState.selected).toBe(true);
    expect(screen.getByLabelText('Recent').props.accessibilityState.selected).toBe(false);
  });

  it('reports the sort that was tapped', async () => {
    const onChange = jest.fn();
    await renderWithProviders(<PurchaseSortBar sort="recent" onChange={onChange} count={5} />);

    await fireEvent.press(screen.getByLabelText('Lowest cost/use'));

    expect(onChange).toHaveBeenCalledWith('lowest_cost_per_use');
  });

  it('offers nothing to reorder below two items', async () => {
    await renderWithProviders(<PurchaseSortBar sort="recent" onChange={jest.fn()} count={1} />);

    expect(screen.queryByText('Recent')).toBeNull();
  });
});
