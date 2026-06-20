import { describe, expect, test } from 'vitest';
import * as core from '../src';

const sampleModel: core.DefinitionModel = {
  startState: 's',
  states: [
    { id: 's' },
    { id: 't', terminal: true }
  ],
  transitions: [
    { from: 's', to: 't', probability: 0.25 }
  ]
};

const validModel: core.DefinitionModel = {
  startState: 's',
  states: [
    { id: 's' },
    { id: 't', terminal: true }
  ],
  transitions: [
    { from: 's', to: 't', probability: 1 }
  ]
};

describe('tpa JSON boundary', () => {
  test('copies rows and writes JSON', () => {
    const result = core.auditTransitionProbabilityTotals(core.expandModel(sampleModel));
    const copied = core.serializeTransitionProbabilityAuditResult(result);

    expect(copied).toEqual(result);
    expect(copied).not.toBe(result);
    expect(copied.rows).not.toBe(result.rows);
    expect(copied.rows[0]).not.toBe(result.rows[0]);
    expect(copied.invalidRows).not.toBe(result.invalidRows);
    expect(copied.invalidRows[0]).not.toBe(result.invalidRows[0]);
    expect(JSON.parse(core.transitionProbabilityAuditResultToJson(result))).toEqual(copied);
  });

  test('exports helpers from the package entrypoint', () => {
    const result = core.auditTransitionProbabilityTotals(core.expandModel(sampleModel));
    const copied = core.serializeTransitionProbabilityAuditResult(result);

    expect(copied.valid).toBe(false);
    expect(copied.invalidRows[0]!.stateId).toBe('s');
    expect(JSON.parse(core.transitionProbabilityAuditResultToJson(result))).toEqual(copied);
  });

  test('keeps valid and terminal rows in JSON output', () => {
    const result = core.auditTransitionProbabilityTotals(core.expandModel(validModel));
    const parsed = JSON.parse(core.transitionProbabilityAuditResultToJson(result));

    expect(parsed).toEqual({
      rows: [
        {
          stateId: 's',
          transitionCount: 1,
          probabilityTotal: 1,
          deviationFromOne: 0,
          terminal: false,
          valid: true
        },
        {
          stateId: 't',
          transitionCount: 0,
          probabilityTotal: 0,
          deviationFromOne: -1,
          terminal: true,
          valid: true
        }
      ],
      invalidRows: [],
      valid: true
    });
  });
});
