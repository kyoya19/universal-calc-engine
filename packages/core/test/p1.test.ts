import { expect, it } from 'vitest';
import { formatNumberPlainText as f } from '../src/number_text';

it('p1', () => {
  expect(f(12.5)).toBe('12.5');
});
