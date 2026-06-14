import { expect, it } from 'vitest';
import { formatNumberPlainText as f } from '../src/number_text';

it('r4', () => {
  expect(typeof f).toBe('function');
});
