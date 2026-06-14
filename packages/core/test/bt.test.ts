import { expect, it } from 'vitest';
import { formatBooleanPlainText as f } from '../src/bool_text';

it('bt', () => {
  expect(f(true)).toBe('true');
  expect(f(false)).toBe('false');
});
