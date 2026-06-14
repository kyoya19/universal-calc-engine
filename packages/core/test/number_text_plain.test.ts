import { expect, it } from 'vitest';
import { formatNumberPlainText } from '../src/number_text';

it('formats 0 as plain text', () => {
  expect(formatNumberPlainText(0)).toBe('0');
});

it('formats a decimal number as plain text', () => {
  expect(formatNumberPlainText(1.25)).toBe('1.25');
});
