import { COMMITMENT_FREQUENCY_IDS, USAGE_FREQUENCY_IDS } from './enums';
import { COMMITMENT_FREQUENCIES } from './frequencies';
import { USAGE_PRESETS } from './usagePresets';

/**
 * The tuples are checked against their unions by `satisfies`, which the compiler
 * enforces. What it cannot see is the other direction: two of them mirror a
 * table of presets elsewhere in this directory, and a preset added to the table
 * without an id here would validate as unknown input — a chip the user can pick
 * and the schema then rejects.
 */

describe('id tuples', () => {
  it('lists every commitment frequency the picker offers, in the same order', () => {
    expect(COMMITMENT_FREQUENCY_IDS).toEqual(COMMITMENT_FREQUENCIES.map((option) => option.id));
  });

  it('lists every usage preset the forms offer, in the same order', () => {
    expect(USAGE_FREQUENCY_IDS).toEqual(USAGE_PRESETS.map((preset) => preset.id));
  });
});
