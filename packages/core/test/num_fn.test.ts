import { expect, it } from 'vitest';
import { formatNumberDiagnosticText as d, formatNumberPlainText as f } from '../src/number_text';

it('num fn', () => {
  expect(typeof f).toBe('function');
});

it('formats zero as plain text', () => {
  expect(f(0)).toBe('0');
});

it('formats zero as diagnostic text', () => {
  expect(d(0)).toBe('0');
});

it('formats negative zero as plain text zero', () => {
  expect(f(-0)).toBe('0');
});

it('formats negative zero as diagnostic text zero', () => {
  expect(d(-0)).toBe('0');
});

it('formats positive integers as plain text', () => {
  expect(f(123)).toBe('123');
});

it('formats max safe integer as plain text', () => {
  expect(f(Number.MAX_SAFE_INTEGER)).toBe('9007199254740991');
});

it('formats min safe integer as plain text', () => {
  expect(f(Number.MIN_SAFE_INTEGER)).toBe('-9007199254740991');
});

it('formats positive integers as diagnostic text', () => {
  expect(d(123)).toBe('123');
});

it('formats max safe integer as diagnostic text', () => {
  expect(d(Number.MAX_SAFE_INTEGER)).toBe('9007199254740991');
});

it('formats min safe integer as diagnostic text', () => {
  expect(d(Number.MIN_SAFE_INTEGER)).toBe('-9007199254740991');
});

it('formats negative integers as plain text', () => {
  expect(f(-123)).toBe('-123');
});

it('formats negative integers as diagnostic text', () => {
  expect(d(-123)).toBe('-123');
});

it('formats positive decimals as plain text', () => {
  expect(f(12.5)).toBe('12.5');
});

it('formats positive decimals as diagnostic text', () => {
  expect(d(12.5)).toBe('12.5');
});

it('formats negative decimals as plain text', () => {
  expect(f(-12.5)).toBe('-12.5');
});

it('formats negative decimals as diagnostic text', () => {
  expect(d(-12.5)).toBe('-12.5');
});

it('formats fractional decimals as plain text', () => {
  expect(f(0.125)).toBe('0.125');
});

it('formats fractional decimals as diagnostic text', () => {
  expect(d(0.125)).toBe('0.125');
});

it('formats negative fractional decimals as plain text', () => {
  expect(f(-0.125)).toBe('-0.125');
});

it('formats negative fractional decimals as diagnostic text', () => {
  expect(d(-0.125)).toBe('-0.125');
});

it('formats max value as plain text', () => {
  expect(f(Number.MAX_VALUE)).toBe('1.7976931348623157e+308');
});

it('formats max value as diagnostic text', () => {
  expect(d(Number.MAX_VALUE)).toBe('1.7976931348623157e+308');
});

it('formats positive infinity as plain text', () => {
  expect(f(Infinity)).toBe('Infinity');
});

it('formats negative infinity as plain text', () => {
  expect(f(-Infinity)).toBe('-Infinity');
});

it('formats NaN as plain text', () => {
  expect(f(NaN)).toBe('NaN');
});

it('formats NaN as diagnostic text', () => {
  expect(d(NaN)).toBe('NaN');
});

it('formats positive infinity as diagnostic text', () => {
  expect(d(Infinity)).toBe('Infinity');
});

it('formats negative infinity as diagnostic text', () => {
  expect(d(-Infinity)).toBe('-Infinity');
});