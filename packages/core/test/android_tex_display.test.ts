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

  test('uses the top-level expected reward for the start row', () => {
    const rows = outputResultToValueFunctionDisplayRows({
      startState: 'position_0',
      expectedReward: 9.5,
      expectedRewardByState: {
        position_0: 2.25,
        position_1: 1.5
      }
    });

    expect(rows.map((row) => row.stateId)).toEqual(['position_0', 'position_1']);
    expect(rows[0]!).toMatchObject({
      stateId: 'position_0',
      value: 9.5,
      plainText: 'V(position_0) = 9.5',
      tex: 'V(\\mathrm{position\\_0}) &= 9.5',
      isStartState: true
    });
  });

  test('uses state rewards for non-start rows', () => {
    const rows = outputResultToValueFunctionDisplayRows({
      startState: 'position_0',
      expectedReward: 9.5,
      expectedRewardByState: {
        position_0: 2.25,
        position_1: 1.5
      }
    });

    expect(rows[1]!).toMatchObject({
      stateId: 'position_1',
      value: 1.5,
      plainText: 'V(position_1) = 1.5',
      tex: 'V(\\mathrm{position\\_1}) &= 1.5',
      isStartState: false,
      className: 'value-function-row'
    });
  });

  test('keeps non-start rows sorted after the start state', () => {
    const rows = outputResultToValueFunctionDisplayRows({
      startState: 'position_2',
      expectedReward: 1,
      expectedRewardByState: {
        position_3: 0,
        position_1: 1.5,
        position_2: 1,
        position_0: 2.25
      }
    });

    expect(rows.map((row) => row.stateId)).toEqual(['position_2', 'position_0', 'position_1', 'position_3']);
    expect(rows[0]!.isStartState).toBe(true);
    expect(rows.slice(1).every((row) => !row.isStartState)).toBe(true);
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