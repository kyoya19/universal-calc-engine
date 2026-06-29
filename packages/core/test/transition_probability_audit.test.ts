import { describe, expect, it } from 'vitest';
import {
  auditTransitionProbabilityTotals,
  DefinitionModel,
  expandModel
} from '../src/model';

function auditModel(model: DefinitionModel) {
  return auditTransitionProbabilityTotals(expandModel(model));
}

describe('auditTransitionProbabilityTotals', () => {
  it('reports valid probability totals without changing solver validation behavior', () => {
    const audit = auditModel({
      startState: 'start',
      states: [
        { id: 'start' },
        { id: 'win', terminal: true },
        { id: 'lose', terminal: true }
      ],
      transitions: [
        { from: 'start', to: 'win', probability: 0.25 },
        { from: 'start', to: 'lose', probability: { type: 'constant', value: 0.75 } }
      ]
    });

    expect(audit.valid).toBe(true);
    expect(audit.invalidRows).toEqual([]);
    expect(audit.rows).toContainEqual(
      expect.objectContaining({
        stateId: 'start',
        transitionCount: 2,
        probabilityTotal: 1,
        deviationFromOne: 0,
        terminal: false,
        valid: true
      })
    );
    expect(audit.rows).toContainEqual(
      expect.objectContaining({
        stateId: 'win',
        transitionCount: 0,
        terminal: true,
        valid: true
      })
    );
  });

  it('reports single deterministic transition totals as valid', () => {
    const audit = auditModel({
      startState: 'start',
      states: [{ id: 'start' }, { id: 'done', terminal: true }],
      transitions: [{ from: 'start', to: 'done', probability: 1 }]
    });

    expect(audit.valid).toBe(true);
    expect(audit.invalidRows).toEqual([]);
    expect(audit.rows).toContainEqual(
      expect.objectContaining({
        stateId: 'start',
        transitionCount: 1,
        probabilityTotal: 1,
        deviationFromOne: 0,
        terminal: false,
        valid: true
      })
    );
  });

  it('keeps valid audit JSON copied', () => {
    const audit = auditModel({
      startState: 'start',
      states: [
        { id: 'start' },
        { id: 'win', terminal: true },
        { id: 'lose', terminal: true }
      ],
      transitions: [
        { from: 'start', to: 'win', probability: 0.25 },
        { from: 'start', to: 'lose', probability: { type: 'constant', value: 0.75 } }
      ]
    });
    const serializedAudit = JSON.parse(JSON.stringify(audit)) as typeof audit;

    expect(serializedAudit.valid).toBe(true);
    expect(serializedAudit.invalidRows).toEqual([]);
    expect(serializedAudit.invalidRows).not.toBe(audit.invalidRows);
    expect(serializedAudit.rows).toEqual(audit.rows);
    expect(serializedAudit.rows).not.toBe(audit.rows);
  });

  it('keeps terminal audit rows stable after JSON serialization', () => {
    const audit = auditModel({
      startState: 'start',
      states: [
        { id: 'start' },
        { id: 'win', terminal: true },
        { id: 'lose', terminal: true }
      ],
      transitions: [
        { from: 'start', to: 'win', probability: 0.25 },
        { from: 'start', to: 'lose', probability: { type: 'constant', value: 0.75 } }
      ]
    });
    const serializedAudit = JSON.parse(JSON.stringify(audit)) as typeof audit;

    expect(serializedAudit.rows.find((row) => row.stateId === 'win')).toEqual(
      expect.objectContaining({
        stateId: 'win',
        transitionCount: 0,
        terminal: true,
        valid: true
      })
    );
  });

  it('reports invalid non-terminal totals without throwing', () => {
    const audit = auditModel({
      startState: 'start',
      states: [
        { id: 'start' },
        { id: 'win', terminal: true },
        { id: 'lose', terminal: true }
      ],
      transitions: [
        { from: 'start', to: 'win', probability: 0.4 },
        { from: 'start', to: 'lose', probability: 0.4 }
      ]
    });

    expect(audit.valid).toBe(false);
    expect(audit.invalidRows).toHaveLength(1);
    expect(audit.invalidRows).toEqual([
      expect.objectContaining({
        stateId: 'start',
        transitionCount: 2,
        probabilityTotal: 0.8,
        deviationFromOne: -0.19999999999999996,
        terminal: false,
        valid: false
      })
    ]);
  });

  it('reports invalid totals above one without throwing', () => {
    const audit = auditModel({
      startState: 'start',
      states: [
        { id: 'start' },
        { id: 'win', terminal: true },
        { id: 'lose', terminal: true }
      ],
      transitions: [
        { from: 'start', to: 'win', probability: 0.6 },
        { from: 'start', to: 'lose', probability: 0.6 }
      ]
    });

    expect(audit.valid).toBe(false);
    expect(audit.invalidRows).toEqual([
      expect.objectContaining({
        stateId: 'start',
        transitionCount: 2,
        probabilityTotal: 1.2,
        deviationFromOne: 0.19999999999999996,
        terminal: false,
        valid: false
      })
    ]);
  });

  it('keeps invalid totals above one stable after JSON serialization', () => {
    const audit = auditModel({
      startState: 'start',
      states: [
        { id: 'start' },
        { id: 'win', terminal: true },
        { id: 'lose', terminal: true }
      ],
      transitions: [
        { from: 'start', to: 'win', probability: 0.6 },
        { from: 'start', to: 'lose', probability: 0.6 }
      ]
    });
    const serializedAudit = JSON.parse(JSON.stringify(audit));

    expect(serializedAudit.invalidRows).toEqual([
      expect.objectContaining({
        stateId: 'start',
        probabilityTotal: 1.2,
        valid: false
      })
    ]);
  });

  it('keeps invalid audit rows stable after JSON serialization', () => {
    const audit = auditModel({
      startState: 'start',
      states: [
        { id: 'start' },
        { id: 'win', terminal: true },
        { id: 'lose', terminal: true }
      ],
      transitions: [
        { from: 'start', to: 'win', probability: 0.4 },
        { from: 'start', to: 'lose', probability: 0.4 }
      ]
    });
    const serializedAudit = JSON.parse(JSON.stringify(audit));

    expect(serializedAudit.invalidRows).toEqual([
      expect.objectContaining({
        stateId: 'start',
        probabilityTotal: 0.8,
        valid: false
      })
    ]);
  });

  it('copies invalid audit rows through JSON serialization', () => {
    const audit = auditModel({
      startState: 'start',
      states: [
        { id: 'start' },
        { id: 'win', terminal: true },
        { id: 'lose', terminal: true }
      ],
      transitions: [
        { from: 'start', to: 'win', probability: 0.4 },
        { from: 'start', to: 'lose', probability: 0.4 }
      ]
    });
    const serializedAudit = JSON.parse(JSON.stringify(audit)) as typeof audit;

    expect(serializedAudit.invalidRows).toEqual(audit.invalidRows);
    expect(serializedAudit.invalidRows).not.toBe(audit.invalidRows);
    expect(serializedAudit.invalidRows[0]).not.toBe(audit.invalidRows[0]);
  });

  it('copies audit rows through JSON serialization', () => {
    const audit = auditModel({
      startState: 'start',
      states: [
        { id: 'start' },
        { id: 'win', terminal: true },
        { id: 'lose', terminal: true }
      ],
      transitions: [
        { from: 'start', to: 'win', probability: 0.4 },
        { from: 'start', to: 'lose', probability: 0.4 }
      ]
    });
    const serializedAudit = JSON.parse(JSON.stringify(audit)) as typeof audit;

    expect(serializedAudit.rows).toEqual(audit.rows);
    expect(serializedAudit.rows).not.toBe(audit.rows);
    expect(serializedAudit.rows).toHaveLength(audit.rows.length);
  });

  it('copies audit row objects through JSON serialization', () => {
    const audit = auditModel({
      startState: 'start',
      states: [
        { id: 'start' },
        { id: 'win', terminal: true },
        { id: 'lose', terminal: true }
      ],
      transitions: [
        { from: 'start', to: 'win', probability: 0.4 },
        { from: 'start', to: 'lose', probability: 0.4 }
      ]
    });
    const serializedAudit = JSON.parse(JSON.stringify(audit)) as typeof audit;

    expect(serializedAudit.rows[0]).toEqual(audit.rows[0]);
    expect(serializedAudit.rows[0]).not.toBe(audit.rows[0]);
    expect(serializedAudit.rows.at(-1)).toEqual(audit.rows.at(-1));
    expect(serializedAudit.rows.at(-1)).not.toBe(audit.rows.at(-1));
  });
});
