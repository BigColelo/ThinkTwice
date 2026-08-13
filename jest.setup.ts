import { setLocaleForTesting } from '@/utils/currency';

/**
 * Test setup.
 *
 * The locale is pinned before every test so assertions about formatted money
 * and dates do not depend on the machine running the suite — and so a test that
 * deliberately switches locale cannot leak into the next one, even if it fails
 * before restoring it.
 */
beforeEach(() => {
  setLocaleForTesting('en-GB');
});

afterAll(() => {
  setLocaleForTesting(null);
});
