import { clamp, isDisplayableNumber, roundTo, safeDivide } from './numbers';

describe('safeDivide', () => {
  it('divides normally', () => {
    expect(safeDivide(10, 4)).toBe(2.5);
  });

  it('returns null instead of Infinity when dividing by zero', () => {
    expect(safeDivide(10, 0)).toBeNull();
    expect(safeDivide(-10, 0)).toBeNull();
    expect(safeDivide(0, 0)).toBeNull();
  });

  it('returns null for non-finite operands', () => {
    expect(safeDivide(Number.NaN, 2)).toBeNull();
    expect(safeDivide(2, Number.NaN)).toBeNull();
    expect(safeDivide(Number.POSITIVE_INFINITY, 2)).toBeNull();
  });
});

describe('clamp', () => {
  it('bounds a value to the range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
  });

  it('falls back to the minimum for NaN', () => {
    expect(clamp(Number.NaN, 0, 10)).toBe(0);
  });
});

describe('roundTo', () => {
  it('rounds to the requested number of decimals', () => {
    expect(roundTo(2.0749, 1)).toBe(2.1);
    expect(roundTo(2.0749, 2)).toBe(2.07);
    expect(roundTo(1.005, 2)).toBe(1.01);
  });
});

describe('isDisplayableNumber', () => {
  it('accepts only finite numbers', () => {
    expect(isDisplayableNumber(0)).toBe(true);
    expect(isDisplayableNumber(-1.5)).toBe(true);
    expect(isDisplayableNumber(null)).toBe(false);
    expect(isDisplayableNumber(undefined)).toBe(false);
    expect(isDisplayableNumber(Number.NaN)).toBe(false);
    expect(isDisplayableNumber(Number.POSITIVE_INFINITY)).toBe(false);
  });
});
