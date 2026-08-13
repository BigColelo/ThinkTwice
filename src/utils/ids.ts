/**
 * Lexicographically sortable identifiers (ULID-shaped, 26 characters of
 * Crockford base32): 50 bits of timestamp, 15 bits of monotonic sequence and
 * 65 bits of randomness.
 *
 * Written in-repo rather than pulled from a package because it is ~40 lines,
 * has no platform caveats, and gives ids that sort by creation time — which
 * makes SQLite ordering cheap and keeps a future sync/merge straightforward.
 * `Math.random` is adequate here: ids are local, non-secret and never guessed.
 */

const ENCODING = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'; // Crockford base32 (no I, L, O, U)
const TIME_LENGTH = 10;
const SEQUENCE_LENGTH = 3;
const RANDOM_LENGTH = 13;

/** 32³ − 1: ids that can be minted inside a single millisecond before rolling over. */
const SEQUENCE_MAX = 32 ** SEQUENCE_LENGTH - 1;

function encodeBase32(value: number, length: number): string {
  let remaining = value;
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out = ENCODING.charAt(remaining % 32) + out;
    remaining = Math.floor(remaining / 32);
  }
  return out;
}

function encodeRandom(length: number): string {
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += ENCODING.charAt(Math.floor(Math.random() * 32));
  }
  return out;
}

let lastTime = 0;
let sequence = 0;

/**
 * Creates a new sortable id.
 *
 * Ids are strictly increasing even when many are created inside one
 * millisecond, and even if the system clock steps backwards: in both cases the
 * sequence advances instead, and the recorded time is nudged forward if the
 * sequence would overflow.
 */
export function createId(): string {
  const now = Date.now();

  if (now > lastTime) {
    lastTime = now;
    sequence = 0;
  } else {
    sequence += 1;
    if (sequence > SEQUENCE_MAX) {
      lastTime += 1;
      sequence = 0;
    }
  }

  return (
    encodeBase32(lastTime, TIME_LENGTH) +
    encodeBase32(sequence, SEQUENCE_LENGTH) +
    encodeRandom(RANDOM_LENGTH)
  );
}
