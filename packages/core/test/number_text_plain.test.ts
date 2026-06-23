import { expect, it } from 'vitest';
import * as core from '../src';
import { formatNumberDiagnosticText, formatNumberPlainText } from '../src/number_text';

it('formats 0 as plain text', () => {
  expect(formatNumberPlainText(0)).toBe('0');
});

it('formats a decimal number as plain text', () => {
  expect(formatNumberPlainText(1.25)).toBe('1.25');
});

it('formats a larger integer as plain text', () => {
  expect(formatNumberPlainText(12345)).toBe('12345');
});

it('keeps generated number text output explicit', () => {
  const generatedValues = [0 / 0, 1 / 0, -1 / 0];

  for (const value of generatedValues) {
    expect(formatNumberPlainText(value)).toBe(String(value));
  }
});

it('keeps diagnostic number text output aligned with generated text', () => {
  const generatedValues = [0 / 0, 1 / 0, -1 / 0, 12.5];

  for (const value of generatedValues) {
    expect(formatNumberDiagnosticText(value)).toBe(String(value));
  }
});

it('keeps finite number text formatters aligned with the public entrypoint', () => {
  expect(core.formatNumberPlainText(1.25)).toBe(formatNumberPlainText(1.25));
  expect(core.formatNumberDiagnosticText(1.25)).toBe(formatNumberDiagnosticText(1.25));
});

it('keeps finite number text JSON output explicit', () => {
  expect(
    JSON.stringify({
      diagnostic: formatNumberDiagnosticText(1.25),
      plain: formatNumberPlainText(1.25)
    })
  ).toBe('{"diagnostic":"1.25","plain":"1.25"}');
});

it('keeps signed finite number text JSON output explicit', () => {
  expect(
    JSON.stringify({
      diagnostic: formatNumberDiagnosticText(-1.25),
      plain: formatNumberPlainText(-1.25)
    })
  ).toBe('{"diagnostic":"-1.25","plain":"-1.25"}');
});

it('keeps signed public number text JSON output explicit', () => {
  expect(
    JSON.stringify({
      diagnostic: core.formatNumberDiagnosticText(-1.25),
      plain: core.formatNumberPlainText(-1.25)
    })
  ).toBe('{"diagnostic":"-1.25","plain":"-1.25"}');
});

it('keeps zero public number text JSON output explicit', () => {
  expect(
    JSON.stringify({
      diagnostic: core.formatNumberDiagnosticText(0),
      plain: core.formatNumberPlainText(0)
    })
  ).toBe('{"diagnostic":"0","plain":"0"}');
});

it('keeps large public number text JSON output explicit', () => {
  expect(
    JSON.stringify({
      diagnostic: core.formatNumberDiagnosticText(12345),
      plain: core.formatNumberPlainText(12345)
    })
  ).toBe('{"diagnostic":"12345","plain":"12345"}');
});

it('keeps generated public number text JSON output explicit', () => {
  expect(
    JSON.stringify({
      diagnostic: core.formatNumberDiagnosticText(0 / 0),
      plain: core.formatNumberPlainText(0 / 0)
    })
  ).toBe('{"diagnostic":"NaN","plain":"NaN"}');
});

it('keeps generated overflow public number text JSON output explicit', () => {
  expect(
    JSON.stringify({
      diagnostic: core.formatNumberDiagnosticText(1 / 0),
      plain: core.formatNumberPlainText(1 / 0)
    })
  ).toBe('{"diagnostic":"Infinity","plain":"Infinity"}');
});
