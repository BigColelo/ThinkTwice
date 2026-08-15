import { z } from 'zod';

/**
 * A money field the user has to fill in, held as `null` while it is empty.
 *
 * A money input cannot sensibly start at zero. Amounts as small as `0,01` are
 * valid, so the field cannot treat a leading `0` as a placeholder digit and drop
 * it on the first keystroke — typing `5` would leave `05`. The zero is also a
 * figure the user never entered, and this app keeps "nothing here yet" as `null`
 * rather than as a number that happens to be zero.
 *
 * So the form holds `null` until something is typed, and this wraps the field's
 * own rules to reject that `null`: it is allowed through the first step and
 * refused by the second, which is the same schema and therefore carries the same
 * "enter an amount" message a missing value gets. What reaches `handleSubmit` is
 * always a plain integer.
 *
 * Only the value's absence is decided here — whether zero itself is acceptable
 * stays with the caller's rules (`.positive()` for a price, `.min(0)` for an
 * amount the user may legitimately record as nothing).
 */
export function requiredAmount(
  amount: z.ZodNumber,
): z.ZodPipe<z.ZodNullable<z.ZodNumber>, z.ZodNumber> {
  return amount.nullable().pipe(amount);
}
