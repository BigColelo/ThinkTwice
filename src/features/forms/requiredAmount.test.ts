import { z } from 'zod';

import { requiredAmount } from './requiredAmount';

/**
 * The empty-money-field rule.
 *
 * What this has to get right is the difference between "nothing entered" and
 * "zero", and it has to keep the caller's own messages: a form that answered
 * "Invalid input" to an empty field, or that lost "That amount looks too large",
 * would be worse than the zero it replaced.
 */

const amount = z
  .number({ error: 'Enter an amount.' })
  .int()
  .min(0, 'The amount cannot be negative.')
  .max(100_000, 'That amount looks too large.');

const schema = z.object({ amountCents: requiredAmount(amount) });

function messageFor(value: unknown): string | undefined {
  const result = schema.safeParse({ amountCents: value });
  return result.success ? undefined : result.error.issues[0]?.message;
}

describe('requiredAmount', () => {
  it('refuses an empty field with the message written for a missing value', () => {
    expect(messageFor(null)).toBe('Enter an amount.');
  });

  it('refuses a field that was never present at all', () => {
    expect(messageFor(undefined)).toBe('Enter an amount.');
  });

  it('accepts a zero the user typed, which is not the same as an empty field', () => {
    expect(schema.safeParse({ amountCents: 0 })).toMatchObject({
      success: true,
      data: { amountCents: 0 },
    });
  });

  it('keeps the rules the caller wrote, and their messages', () => {
    expect(messageFor(-1)).toBe('The amount cannot be negative.');
    expect(messageFor(100_001)).toBe('That amount looks too large.');
    expect(messageFor(12.5)).toBeDefined();
  });

  it('reports the failure on the field, so the form can render it', () => {
    const result = schema.safeParse({ amountCents: null });

    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.path).toEqual(['amountCents']);
  });

  it('hands a plain number on, never the null it accepted', () => {
    const parsed = schema.parse({ amountCents: 1_799 });
    // The type is `number` here rather than `number | null`: everything
    // downstream of validation works with cents, not with an empty field.
    const cents: number = parsed.amountCents;

    expect(cents).toBe(1_799);
  });
});
