import { expect, it } from 'vitest';
import { formatSummaryRowsText as f } from '../src/rc_text';

it('rct', () => {
  expect(f({ ok: 2, warning: 1, rejected: 0, info: 3 })).toBe('rows: 6');
});

it('formats zero summary rows as plain text', () => {
  expect(f({ ok: 0, warning: 0, rejected: 0, info: 0 })).toBe('rows: 0');
});

it('formats a single rejected summary row as plain text', () => {
  expect(f({ ok: 0, warning: 0, rejected: 1, info: 0 })).toBe('rows: 1');
});
