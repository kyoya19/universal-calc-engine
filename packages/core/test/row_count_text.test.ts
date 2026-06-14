import { expect, it } from 'vitest';
import { formatRowCountPlainText } from '../src/row_count_text';

it('formats row count', () => {
  expect(formatRowCountPlainText(3)).toBe('rows: 3');
});
