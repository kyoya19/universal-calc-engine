import { describe, expect, test } from 'vitest';
import {
  type ConstantScalarSpec,
  evaluateScalarSpec,
  getScalarSpecKind,
  serializeScalarSpec
} from '../src';

describe('ScalarSpec boundary', () => {
  test('keeps raw number scalar evaluation unchanged', () => {
    expect(getScalarSpecKind(0.25)).toBe('number');
    expect(evaluateScalarSpec(0.25)).toBe(0.25);
    expect(serializeScalarSpec(0.25)).toBe(0.25);
  });

  test('keeps constant scalar evaluation unchanged', () => {
    const constant: ConstantScalarSpec = { type: 'constant', value: 3.5 };

    expect(getScalarSpecKind(constant)).toBe('constant');
    expect(evaluateScalarSpec(constant)).toBe(3.5);
    expect(serializeScalarSpec(constant)).toEqual({ type: 'constant', value: 3.5 });
  });

  test('serializes constant scalar as a copy', () => {
    const constant: ConstantScalarSpec = { type: 'constant', value: 1 };
    const serialized = serializeScalarSpec(constant);

    expect(serialized).toEqual(constant);
    expect(serialized).not.toBe(constant);
  });
});
