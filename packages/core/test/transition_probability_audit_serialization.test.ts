import { describe, expect, test } from 'vitest';
import {
  serializeTransitionProbabilityAuditResult,
  serializeTransitionProbabilityAuditRow,
  serializeTransitionProbabilityAuditRows,
  transitionProbabilityAuditResultToJson,
  type TransitionProbabilityAuditResult,
  type TransitionProbabilityAuditRow
} from '../src';

describe('transition probability audit serialization boundary', () => {
  test('serializes a row without sharing object identity', () => {
    const row: TransitionProbabilityAuditRow = {
      stateId: 's0',
      transitionCount: 1,
      probabilityTotal: 0.5,
      deviationFromOne: -0.5,
      terminal: false,
      valid: false
    };

    const serialized = serializeTransitionProbabilityAuditRow(row);

    expect(serialized).toEqual(row);
    expect(serialized).not.toBe(row);
  });

  test('serializes rows without sharing array or row identity', () => {
    const rows: TransitionProbabilityAuditRow[] = [
      {
        stateId: 's0',
        transitionCount: 1,
        probabilityTotal: 1,
        deviationFromOne: 0,
        terminal: false,
        valid: true
      }
    ];

    const serialized = serializeTransitionProbabilityAuditRows(rows);

    expect(serialized).toEqual(rows);
    expect(serialized).not.toBe(rows);
    expect(serialized[0]).not.toBe(rows[0]);
  });

  test('serializes audit result through row helpers while preserving JSON shape', () => {
    const result: TransitionProbabilityAuditResult = {
      rows: [
        {
          stateId: 's0',
          transitionCount: 1,
          probabilityTotal: 0.5,
          deviationFromOne: -0.5,
          terminal: false,
          valid: false
        },
        {
          stateId: 's1',
          transitionCount: 0,
          probabilityTotal: 0,
          deviationFromOne: -1,
          terminal: true,
          valid: true
        }
      ],
      invalidRows: [
        {
          stateId: 's0',
          transitionCount: 1,
          probabilityTotal: 0.5,
          deviationFromOne: -0.5,
          terminal: false,
          valid: false
        }
      ],
      valid: false
    };

    const serialized = serializeTransitionProbabilityAuditResult(result);

    expect(serialized).toEqual(result);
    expect(serialized).not.toBe(result);
    expect(serialized.rows).not.toBe(result.rows);
    expect(serialized.invalidRows).not.toBe(result.invalidRows);
    expect(serialized.rows[0]).not.toBe(result.rows[0]);
    expect(serialized.invalidRows[0]).not.toBe(result.invalidRows[0]);
    expect(JSON.parse(transitionProbabilityAuditResultToJson(result))).toEqual(result);
  });
});
