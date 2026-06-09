import { describe, expect, test } from 'vitest';
import type { OutputResult } from '../src';
import { outputResultToValueFunctionDisplayRows } from '../src';

const outputResult: OutputResult = {
  startState: 'position_0',
  expectedReward: 2.25,
  expectedRewardByState: {
    position_0: 2.25,
    position_1: 1.5,
    position_2: 1,
    position_3: 0
  }
};

describe('Android-oriented TeX display rows', () => {
  test('splits value-function output into short rows', () => {
    const rows = outputResultToValueFunctionDisplayRows(outputResult);

    expect(rows).toHaveLength(4);
    expect(rows.map((row) => row.plainText)).toEqual([
      'V(position_0) = 2.25',
      'V(position_1) = 1.5',
      'V(position_2) = 1',
      'V(position_3) = 0'
    ]);
  });

  test('keeps the start state first without duplicating it', () => {
    const rows = outputResultToValueFunctionDisplayRows(outputResult);

    expect(rows[0]!).toMatchObject({
      stateId: 'position_0',
      value: 2.25,
      isStartState: true
    });
    expect(rows.filter((row) => row.stateId === 'position_0')).toHaveLength(1);
  });

  test('keeps row-level TeX compact for narrow displays', () => {
    const rows = outputResultToValueFunctionDisplayRows(outputResult);

    expect(rows[0]!.tex).toBe('V(\\mathrm{position\\_0}) &= 2.25');
    expect(rows.every((row) => !row.tex.includes('\\begin{aligned}'))).toBe(true);
    expect(rows.every((row) => !row.tex.includes('\\end{aligned}'))).toBe(true);
    expect(rows.every((row) => !row.tex.includes('\n'))).toBe(true);
  });

  test('provides CSS class metadata without embedding CSS in core', () => {
    const rows = outputResultToValueFunctionDisplayRows(outputResult);

    expect(rows[0]!.className).toBe('value-function-row value-function-row--start');
    expect(rows.slice(1).every((row) => row.className === 'value-function-row')).toBe(true);
  });
});
