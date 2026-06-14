import { expect, it } from 'vitest';
import { formatNumberPlainText } from '../src';

it('exports number text formatting from the package entrypoint', () => {
  expect(formatNumberPlainText(3)).toBe('3');
});
