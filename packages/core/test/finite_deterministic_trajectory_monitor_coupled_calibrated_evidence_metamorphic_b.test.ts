import { describe, expect, it } from 'vitest';
import { DefinitionModel, StateId } from '../src/model';
import {
  FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceRequest,
  analyzeFiniteDeterministicTrajectoryMonitorUnderMonitorCoupledCalibratedEvidence
} from '../src/finite_deterministic_trajectory_monitor_coupled_calibrated_evidence';

const states = ['a', 'b'] as StateId[];

function requireAnalysis(
  model: DefinitionModel,
  request: FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceRequest
) {
  const result = analyzeFiniteDeterministicTrajectoryMonitorUnderMonitorCoupledCalibratedEvidence(model, request);
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.failure.message);
  return result;
}

describe('Candidate AE authority metamorphics B', () => {
  it('treats unreachable-monitor rows and zero-model-mass ordered-pair rows as analytically inert', () => {
    const model: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }, { id: 'b', terminal: true }],
      transitions: [{ from: 'a', to: 'b', probability: 1 }]
    };
    const monitorStates = ['live', 'unreachable'];
    const base: FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceRequest = {
      initialDistribution: [
        { stateId: 'a', probability: 1 },
        { stateId: 'b', probability: 0 }
      ],
      horizon: 1,
      monitorStates,
      initialMonitorStateByHiddenState: [
        { stateId: 'a', monitorStateId: 'live' },
        { stateId: 'b', monitorStateId: 'live' }
      ],
      monitorTransitionByStep: [monitorStates.flatMap((monitorStateId) => [
        { monitorStateId, fromStateId: 'a', toStateId: 'b', nextMonitorStateId: 'live' },
        { monitorStateId, fromStateId: 'b', toStateId: 'b', nextMonitorStateId: 'live' }
      ])],
      initialEvidenceLikelihoods: states.map((stateId) => ({ stateId, likelihood: 1 })),
      monitorCoupledTransitionEvidenceLikelihoodsByStep: [monitorStates.flatMap((monitorStateId) =>
        states.flatMap((fromStateId) => states.map((toStateId) => ({
          monitorStateId,
          fromStateId,
          toStateId,
          likelihood:
            monitorStateId === 'unreachable'
              ? 0.13
              : fromStateId === 'a' && toStateId === 'b'
                ? 0.6
                : 0.2
        })))
      )]
    };
    const changed = structuredClone(base);
    changed.monitorCoupledTransitionEvidenceLikelihoodsByStep[0] =
      changed.monitorCoupledTransitionEvidenceLikelihoodsByStep[0]!.map((entry) => ({
        ...entry,
        likelihood:
          entry.monitorStateId === 'unreachable' ||
          (entry.monitorStateId === 'live' && entry.fromStateId === 'a' && entry.toStateId === 'a')
            ? 0.99
            : entry.likelihood
      }));

    const a = requireAnalysis(model, base);
    const b = requireAnalysis(model, changed);
    expect(b.evidenceProbability).toBe(a.evidenceProbability);
    expect(b.logEvidenceProbability).toBe(a.logEvidenceProbability);
    expect(b.trajectory).toEqual(a.trajectory);
    expect(b.jointEvidenceMonitorDistribution).toEqual(a.jointEvidenceMonitorDistribution);
  });

  it('is invariant to splitting or merging equivalent parallel hidden transitions', () => {
    const merged: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }, { id: 'b' }],
      transitions: [
        { from: 'a', to: 'a', probability: 0.4 },
        { from: 'a', to: 'b', probability: 0.6 },
        { from: 'b', to: 'b', probability: 1 }
      ]
    };
    const split: DefinitionModel = {
      ...merged,
      transitions: [
        { from: 'a', to: 'a', probability: 0.4 },
        { from: 'a', to: 'b', probability: 0.2 },
        { from: 'a', to: 'b', probability: 0.4 },
        { from: 'b', to: 'b', probability: 1 }
      ]
    };
    const request: FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceRequest = {
      initialDistribution: [
        { stateId: 'a', probability: 1 },
        { stateId: 'b', probability: 0 }
      ],
      horizon: 1,
      monitorStates: ['q'],
      initialMonitorStateByHiddenState: states.map((stateId) => ({ stateId, monitorStateId: 'q' })),
      monitorTransitionByStep: [[
        { monitorStateId: 'q', fromStateId: 'a', toStateId: 'a', nextMonitorStateId: 'q' },
        { monitorStateId: 'q', fromStateId: 'a', toStateId: 'b', nextMonitorStateId: 'q' },
        { monitorStateId: 'q', fromStateId: 'b', toStateId: 'b', nextMonitorStateId: 'q' }
      ]],
      initialEvidenceLikelihoods: states.map((stateId) => ({ stateId, likelihood: 1 })),
      monitorCoupledTransitionEvidenceLikelihoodsByStep: [[
        { monitorStateId: 'q', fromStateId: 'a', toStateId: 'a', likelihood: 0.4 },
        { monitorStateId: 'q', fromStateId: 'a', toStateId: 'b', likelihood: 0.7 },
        { monitorStateId: 'q', fromStateId: 'b', toStateId: 'a', likelihood: 0.2 },
        { monitorStateId: 'q', fromStateId: 'b', toStateId: 'b', likelihood: 0.8 }
      ]]
    };

    const a = requireAnalysis(merged, request);
    const b = requireAnalysis(split, request);
    expect(b.evidenceProbability).toBeCloseTo(a.evidenceProbability!, 14);
    expect(b.trajectory).toEqual(a.trajectory);
    expect(b.jointEvidenceMonitorDistribution).toEqual(a.jointEvidenceMonitorDistribution);
  });

  it('uses q-specific c_t(q,i,i) and monitor updates on terminal implicit self-retention', () => {
    const model: DefinitionModel = {
      startState: 't',
      states: [{ id: 't', terminal: true }],
      transitions: []
    };
    const request: FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceRequest = {
      initialDistribution: [{ stateId: 't', probability: 1 }],
      horizon: 2,
      monitorStates: ['q0', 'q1'],
      initialMonitorStateByHiddenState: [{ stateId: 't', monitorStateId: 'q0' }],
      monitorTransitionByStep: [
        [
          { monitorStateId: 'q0', fromStateId: 't', toStateId: 't', nextMonitorStateId: 'q1' },
          { monitorStateId: 'q1', fromStateId: 't', toStateId: 't', nextMonitorStateId: 'q1' }
        ],
        [
          { monitorStateId: 'q0', fromStateId: 't', toStateId: 't', nextMonitorStateId: 'q0' },
          { monitorStateId: 'q1', fromStateId: 't', toStateId: 't', nextMonitorStateId: 'q1' }
        ]
      ],
      initialEvidenceLikelihoods: [{ stateId: 't', likelihood: 0.5 }],
      monitorCoupledTransitionEvidenceLikelihoodsByStep: [
        [
          { monitorStateId: 'q0', fromStateId: 't', toStateId: 't', likelihood: 0.4 },
          { monitorStateId: 'q1', fromStateId: 't', toStateId: 't', likelihood: 0.9 }
        ],
        [
          { monitorStateId: 'q0', fromStateId: 't', toStateId: 't', likelihood: 0.2 },
          { monitorStateId: 'q1', fromStateId: 't', toStateId: 't', likelihood: 0.8 }
        ]
      ]
    };

    const analysis = requireAnalysis(model, request);
    expect(analysis.evidenceProbability).toBeCloseTo(0.5 * 0.4 * 0.8, 14);
    expect(analysis.finalEvidenceConditionedMonitorDistribution).toHaveLength(1);
    expect(analysis.finalEvidenceConditionedMonitorDistribution![0]!.monitorStateId).toBe('q1');
    expect(analysis.finalEvidenceConditionedMonitorDistribution![0]!.probability).toBeCloseTo(1, 14);
  });
});
