import { expect, it } from 'vitest';
import { formatNumberPlainText as f } from '../src/number_text';

it('nt', () => {
  expect(f(7)).toBe('7');
});
