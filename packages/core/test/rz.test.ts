import { expect, it } from 'vitest';
import { formatRowCountPlainText as f } from '../src/row_count_text';

it('rz', () => {
  expect(f(0)).toBe('rows: 0');
});
