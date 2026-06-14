import { expect, it } from 'vitest';
import { formatNumberPlainText } from '../src/number_text';

it('formats a signed number as plain text', () => {
  expect(formatNumberPlainText(-3)).toBe('-3');
});
