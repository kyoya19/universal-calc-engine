import { expect, it } from 'vitest';
import { formatNumberPlainText } from '../src/number_text';

it('formats a signed number as plain text', () => {
  expect(formatNumberPlainText(-3)).toBe('-3');
});

it('formats a positive number without an explicit plus sign', () => {
  expect(formatNumberPlainText(3)).toBe('3');
});
