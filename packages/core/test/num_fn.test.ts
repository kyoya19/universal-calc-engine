import { expect, it } from 'vitest';
import { formatNumberPlainText as f } from '../src/number_text';

it('num fn', () => {
  expect(typeof f).toBe('function');
});
