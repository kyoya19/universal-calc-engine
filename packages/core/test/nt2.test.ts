import { expect, it } from 'vitest';
import { formatNumberPlainText as f } from '../src/number_text';

it('nt2', () => {
  expect(f(0)).toBe('0');
});
