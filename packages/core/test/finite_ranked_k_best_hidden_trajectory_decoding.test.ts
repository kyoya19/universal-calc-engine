import { describe, expect, it } from 'vitest';
import { DefinitionModel } from '../src/model';
import {
  FiniteRankedKBestHiddenTrajectoryDecodingRequest,
  decodeFiniteRankedKBestHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence,
  decodeFiniteRankedKBestHiddenTrajectoriesOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates
} from '../src/finite_monitor_coupled_evidence_ambiguity_preserving_ranked_k_best_hidden_trajectory_decoding';
import { hiddenRanks, oneMonitorRequest } from './finite_ranked_k_best_hidden_trajectory_decoding_fixture';

function requireRanked(
  result: ReturnType<typeof decodeFiniteRankedKBestHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence>
) {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.failure.message);
  return result;
}

function requireConditioned(
  result: ReturnType<typeof decodeFiniteRankedKBestHiddenTrajectoriesOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates>
) {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.failure.message);
  return result;
}

const fourPathModel: DefinitionModel = {
  startState: 'a',
  states: [{ id: 'a' }, { id: 'b' }],
  transitions: [
    { from: 'a', to: 'a', probability: 4 / 7 },
    { from: 'a', to: 'b', probability: 3 / 7 },
    { from: 'b', to: 'a', probability: 2 / 3 },
    { from: 'b', to: 'b', probability: 1 / 3 }
  ]
};

describe('Candidate AG core ranked K-best contract', () => {
  it('returns the exact first three score strata for the canonical insufficiency witness', () => {
    const request = oneMonitorRequest(
      fourPathModel,
      [
        { stateId: 'a', probability: 0.7 },
        { stateId: 'b', probability: 0.3 }
      ],
      1,
      3
    );
    const result = requireRanked(
      decodeFiniteRankedKBestHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(
        fourPathModel,
        request
      )
    );
    expect(hiddenRanks(result)).toEqual([[['a', 'a']], [['a', 'b']], [['b', 'a']]]);
    const anchors = result.rankStrata!.map((entry) => entry.anchorJointProbability);
    expect(anchors[0]).toBeCloseTo(0.4, 14);
    expect(anchors[1]).toBeCloseTo(0.3, 14);
    expect(anchors[2]).toBeCloseTo(0.2, 14);
    expect(result.allRankedTrajectoriesExhausted).toBe(false);
  });

  it('treats rankDepth as score-stratum depth and preserves every boundary tie', () => {
    const model: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }, { id: 'b' }],
      transitions: [
        { from: 'a', to: 'a', probability: 4 / 7 },
        { from: 'a', to: 'b', probability: 3 / 7 },
        { from: 'b', to: 'a', probability: 3 / 5 },
        { from: 'b', to: 'b', probability: 2 / 5 }
      ]
    };
    const request = oneMonitorRequest(
      model,
      [
        { stateId: 'a', probability: 7 / 12 },
        { stateId: 'b', probability: 5 / 12 }
      ],
      1,
      2
    );
    const result = requireRanked(
      decodeFiniteRankedKBestHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(
        model,
        request
      )
    );
    expect(hiddenRanks(result)).toEqual([[['a', 'a']], [['a', 'b'], ['b', 'a']]]);
    expect(result.returnedTrajectoryCount).toBe(3);
    expect(result.diagnostics.tieStratumTruncated).toBe(false);
  });

  it('places a strict near-tie outside tolerance into a lower rank', () => {
    const model: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a', terminal: true }, { id: 'b', terminal: true }],
      transitions: []
    };
    const request = oneMonitorRequest(
      model,
      [
        { stateId: 'a', probability: 0.500001 },
        { stateId: 'b', probability: 0.499999 }
      ],
      0,
      2
    );
    request.kBestScoreTolerance = 1e-8;
    const result = requireRanked(
      decodeFiniteRankedKBestHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(
        model,
        request
      )
    );
    expect(hiddenRanks(result)).toEqual([[['a']], [['b']]]);
  });

  it('uses an anchor score so pairwise near-equality cannot chain transitively', () => {
    const weights = [1, Math.exp(-0.09), Math.exp(-0.18)];
    const z = weights.reduce((sum, value) => sum + value, 0);
    const model: DefinitionModel = {
      startState: 'a',
      states: [
        { id: 'a', terminal: true },
        { id: 'b', terminal: true },
        { id: 'c', terminal: true }
      ],
      transitions: []
    };
    const request = oneMonitorRequest(
      model,
      [
        { stateId: 'a', probability: weights[0]! / z },
        { stateId: 'b', probability: weights[1]! / z },
        { stateId: 'c', probability: weights[2]! / z }
      ],
      0,
      3
    );
    request.kBestScoreTolerance = 0.1;
    const result = requireRanked(
      decodeFiniteRankedKBestHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(
        model,
        request
      )
    );
    expect(hiddenRanks(result)).toEqual([[['a'], ['b']], [['c']]]);
  });

  it('reports analytical exhaustion when rankDepth exceeds all available strata', () => {
    const request = oneMonitorRequest(
      fourPathModel,
      [
        { stateId: 'a', probability: 0.7 },
        { stateId: 'b', probability: 0.3 }
      ],
      1,
      10
    );
    const result = requireRanked(
      decodeFiniteRankedKBestHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(
        fourPathModel,
        request
      )
    );
    expect(result.returnedRankStrataCount).toBe(4);
    expect(result.allRankedTrajectoriesExhausted).toBe(true);
  });

  it('supports terminal-monitor restriction and all-target neutrality', () => {
    const model: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a', terminal: true }, { id: 'b', terminal: true }],
      transitions: []
    };
    const request: FiniteRankedKBestHiddenTrajectoryDecodingRequest = {
      ...oneMonitorRequest(
        model,
        [
          { stateId: 'a', probability: 0.6 },
          { stateId: 'b', probability: 0.4 }
        ],
        0,
        2
      ),
      monitorStates: ['qa', 'qb'],
      initialMonitorStateByHiddenState: [
        { stateId: 'a', monitorStateId: 'qa' },
        { stateId: 'b', monitorStateId: 'qb' }
      ]
    };
    const base = requireRanked(
      decodeFiniteRankedKBestHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(
        model,
        request
      )
    );
    const all = requireConditioned(
      decodeFiniteRankedKBestHiddenTrajectoriesOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates(
        model,
        { ...request, targetMonitorStates: ['qb', 'qa'] }
      )
    );
    const restricted = requireConditioned(
      decodeFiniteRankedKBestHiddenTrajectoriesOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates(
        model,
        { ...request, targetMonitorStates: ['qb'] }
      )
    );
    expect(hiddenRanks(all)).toEqual(hiddenRanks(base));
    expect(hiddenRanks(restricted)).toEqual([[['b']]]);
  });

  it('separates evidence, monitor-event and joint-event impossibility', () => {
    const model: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a', terminal: true }, { id: 'b', terminal: true }],
      transitions: []
    };
    const evidence = oneMonitorRequest(
      model,
      [
        { stateId: 'a', probability: 0.5 },
        { stateId: 'b', probability: 0.5 }
      ],
      0,
      2
    );
    evidence.initialEvidenceLikelihoods = [
      { stateId: 'a', likelihood: 0 },
      { stateId: 'b', likelihood: 0 }
    ];
    const e = requireRanked(
      decodeFiniteRankedKBestHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(
        model,
        evidence
      )
    );
    expect(e.impossibility).toBe('evidence');
    expect(e.rankStrata).toBeNull();

    const base: FiniteRankedKBestHiddenTrajectoryDecodingRequest = {
      ...oneMonitorRequest(
        model,
        [
          { stateId: 'a', probability: 0.5 },
          { stateId: 'b', probability: 0.5 }
        ],
        0,
        2
      ),
      monitorStates: ['qa', 'qb'],
      initialMonitorStateByHiddenState: [
        { stateId: 'a', monitorStateId: 'qa' },
        { stateId: 'b', monitorStateId: 'qb' }
      ]
    };
    const m = requireConditioned(
      decodeFiniteRankedKBestHiddenTrajectoriesOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates(
        model,
        { ...base, targetMonitorStates: [] }
      )
    );
    expect(m.impossibility).toBe('monitor_event');
    base.initialEvidenceLikelihoods = [
      { stateId: 'a', likelihood: 1 },
      { stateId: 'b', likelihood: 0 }
    ];
    const j = requireConditioned(
      decodeFiniteRankedKBestHiddenTrajectoriesOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates(
        model,
        { ...base, targetMonitorStates: ['qb'] }
      )
    );
    expect(j.impossibility).toBe('joint');
  });

  it('ranks zero-horizon initial paths directly', () => {
    const model: DefinitionModel = {
      startState: 'a',
      states: [
        { id: 'a', terminal: true },
        { id: 'b', terminal: true },
        { id: 'c', terminal: true }
      ],
      transitions: []
    };
    const request = oneMonitorRequest(
      model,
      [
        { stateId: 'a', probability: 0.5 },
        { stateId: 'b', probability: 0.3 },
        { stateId: 'c', probability: 0.2 }
      ],
      0,
      3
    );
    const result = requireRanked(
      decodeFiniteRankedKBestHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(
        model,
        request
      )
    );
    expect(hiddenRanks(result)).toEqual([[['a']], [['b']], [['c']]]);
    expect(result.allRankedTrajectoriesExhausted).toBe(true);
  });
});
