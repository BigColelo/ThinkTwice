import { createId } from './ids';

describe('createId', () => {
  it('produces ids of a fixed length', () => {
    expect(createId()).toHaveLength(26);
  });

  it('uses only Crockford base32 characters', () => {
    for (let i = 0; i < 200; i += 1) {
      expect(createId()).toMatch(/^[0-9A-HJKMNP-TV-Z]{26}$/);
    }
  });

  it('does not repeat', () => {
    const ids = new Set(Array.from({ length: 5_000 }, createId));
    expect(ids.size).toBe(5_000);
  });

  it('sorts in creation order, including within the same millisecond', () => {
    const ids = Array.from({ length: 500 }, createId);
    const sorted = [...ids].sort();
    expect(sorted).toEqual(ids);
  });
});
