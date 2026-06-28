import { expect, it } from 'vitest';
import { formatNumberPlainText as f } from '../src/number_text';

it('num fn', () => {
  expect(typeof f).toBe('function');
});

it('formats zero as plain text', () => {
  expect(f(0)).toBe('0');
});

it('formats negative zero as plain text zero', () => {
  expect(f(-0)).toBe('0');
});

it('formats positive integers as plain text', () => {
  expect(f(123)).toBe('123');
});