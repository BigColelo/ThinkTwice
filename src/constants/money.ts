import type { Cents } from '@/types/domain';

/**
 * The largest amount any form accepts, in minor units — one million of the
 * major unit.
 *
 * Not a limit on what someone can own: it is the bound that catches a slip. An
 * amount is typed on a phone keyboard, and a held key or a pasted string turns
 * €1,200 into something that would then be divided into every ratio the app
 * shows. Past this point the figure is far more likely to be a mistake than a
 * purchase, and a validation message is a better answer than a percentage with
 * six digits in it.
 *
 * One constant rather than one per schema, because three schemas had written
 * the same number and nothing tied them together.
 */
export const MAX_MONEY_CENTS: Cents = 100_000_000;
