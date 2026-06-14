import { expect, it } from 'vitest';
import { formatNumberPlainText as f } from '../src';

it('npub', () => {
  expect(f(3)).toBe('3');
});
