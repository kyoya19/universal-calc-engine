import { describe, expect, it } from 'vitest';
import { DefinitionModel } from '../src/model';
import {
  FiniteMapHiddenTrajectoryDecodingRequest,
  decodeFiniteMapHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence,
  decodeFiniteMapHiddenTrajectoriesOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates
} from '../src/finite_monitor_coupled_evidence_ambiguity_preserving_map_hidden_trajectory_decoding';
import {
  FiniteRankedKBestHiddenTrajectoryDecodingRequest,
  decodeFiniteRankedKBestHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence,
  decodeFiniteRankedKBestHiddenTrajectoriesOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates
} from '../src/finite_monitor_coupled_evidence_ambiguity_preserving_ranked_k_best_hidden_trajectory_decoding';
import {
  coupledRows,
  monitorRows,
  oneMonitorRequest
} from './finite_ranked_k_best_hidden_trajectory_decoding_fixture';

function afRequest(
  request: FiniteRankedKBestHiddenTrajectoryDecodingRequest
): FiniteMapHiddenTrajectoryDecodingRequest {
  return {
    ...request,
    mapScoreTolerance: request.kBestScoreTolerance,
    maxReturnedMapTrajectories: request.maxReturnedKBestTrajectories
  };
}

function agMaps(result: {
  rankStrata: Array<{ trajectories: Array<{ hiddenStateIds: string[] }> }> | null;
}) {
  return result.rankStrata?.[0]?.trajectories.map((entry) => entry.hiddenStateIds) ?? [];
}

function afMaps(result: {
  mapTrajectories: Array<{ hiddenStateIds: string[] }> | null;
}) {
  return result.mapTrajectories?.map((entry) => entry.hiddenStateIds) ?? [];
}

const model: DefinitionModel = {
  startState: 'a',
  states: [{ id: 'a' }, { id: 'b' }],
  transitions: [
    { from: 'a', to: 'a', probability: 0.6 },
    { from: 'a', to: 'b', probability: 0.4 },
    { from: 'b', to: 'a', probability: 0.3 },
    { from: 'b', to: 'b', probability: 0.7 }
  ]
};

describe('Candidate AG rankDepth=1 exact Candidate AF reduction', () => {
  it('matches Candidate AF for a unique MAP path', () => {
    const request = oneMonitorRequest(
      model,
      [
        { stateId: 'a', probability: 0.7 },
        { stateId: 'b', probability: 0.3 }
      ],
      2,
      1
    );
    const ag = decodeFiniteRankedKBestHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(
      model,
      request
    );
    const af = decodeFiniteMapHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(
      model,
      afRequest(request)
    );
    expect(ag.ok).toBe(true);
    expect(af.ok).toBe(true);
    if (!ag.ok || !ag.possible || !af.ok || !af.possible) {
      throw new Error('AF reduction fixture must be possible');
    }
    expect(agMaps(ag)).toEqual(afMaps(af));
    expect(ag.rankStrata![0]!.anchorLogJointProbability).toBeCloseTo(
      af.maximumLogJointPathProbability!,
      14
    );
  });

  it('matches Candidate AF complete co-MAP ambiguity', () => {
    const tiedModel: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a', terminal: true }, { id: 'b', terminal: true }],
      transitions: []
    };
    const request = oneMonitorRequest(
      tiedModel,
      [
        { stateId: 'a', probability: 0.5 },
        { stateId: 'b', probability: 0.5 }
      ],
      0,
      1
    );
    const ag = decodeFiniteRankedKBestHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(
      tiedModel,
      request
    );
    const af = decodeFiniteMapHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(
      tiedModel,
      afRequest(request)
    );
    expect(ag.ok).toBe(true);
    expect(af.ok).toBe(true);
    if (!ag.ok || !ag.possible || !af.ok || !af.possible) {
      throw new Error('tie reduction fixture must be possible');
    }
    expect(agMaps(ag)).toEqual(afMaps(af));
    expect(ag.returnedTrajectoryCount).toBe(af.returnedMapTrajectoryCount);
  });

  it('matches Candidate AF conditioned ranking and impossible target classification', () => {
    const conditionedModel: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a', terminal: true }, { id: 'b', terminal: true }],
      transitions: []
    };
    const request: FiniteRankedKBestHiddenTrajectoryDecodingRequest = {
      ...oneMonitorRequest(
        conditionedModel,
        [
          { stateId: 'a', probability: 0.6 },
          { stateId: 'b', probability: 0.4 }
        ],
        0,
        1
      ),
      monitorStates: ['qa', 'qb'],
      initialMonitorStateByHiddenState: [
        { stateId: 'a', monitorStateId: 'qa' },
        { stateId: 'b', monitorStateId: 'qb' }
      ]
    };
    const ag =
      decodeFiniteRankedKBestHiddenTrajectoriesOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates(
        conditionedModel,
        { ...request, targetMonitorStates: ['qb'] }
      );
    const af =
      decodeFiniteMapHiddenTrajectoriesOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates(
        conditionedModel,
        { ...afRequest(request), targetMonitorStates: ['qb'] }
      );
    expect(ag.ok).toBe(true);
    expect(af.ok).toBe(true);
    if (!ag.ok || !ag.possible || !af.ok || !af.possible) {
      throw new Error('conditioned reduction fixture must be possible');
    }
    expect(agMaps(ag)).toEqual(afMaps(af));

    const agImpossible =
      decodeFiniteRankedKBestHiddenTrajectoriesOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates(
        conditionedModel,
        { ...request, targetMonitorStates: [] }
      );
    const afImpossible =
      decodeFiniteMapHiddenTrajectoriesOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates(
        conditionedModel,
        { ...afRequest(request), targetMonitorStates: [] }
      );
    expect(agImpossible.ok).toBe(true);
    expect(afImpossible.ok).toBe(true);
    if (!agImpossible.ok || !afImpossible.ok) throw new Error('impossibility must be analytical');
    expect(agImpossible.impossibility).toBe(afImpossible.impossibility);
  });

  it('matches Candidate AF best-path identity under positive direct-probability underflow', () => {
    const underflowModel: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a', terminal: true }, { id: 'b', terminal: true }],
      transitions: []
    };
    const horizon = 400;
    const request: FiniteRankedKBestHiddenTrajectoryDecodingRequest = {
      ...oneMonitorRequest(
        underflowModel,
        [
          { stateId: 'a', probability: 0.6 },
          { stateId: 'b', probability: 0.4 }
        ],
        horizon,
        1
      ),
      monitorStates: ['q'],
      initialMonitorStateByHiddenState: [
        { stateId: 'a', monitorStateId: 'q' },
        { stateId: 'b', monitorStateId: 'q' }
      ],
      monitorTransitionByStep: monitorRows(underflowModel, horizon, ['q'], () => 'q'),
      initialEvidenceLikelihoods: [
        { stateId: 'a', likelihood: 0.1 },
        { stateId: 'b', likelihood: 0.1 }
      ],
      monitorCoupledTransitionEvidenceLikelihoodsByStep: Array.from(
        { length: horizon },
        (_, step) => coupledRows(['a', 'b'], ['q'], () => 0.1, step)
      )
    };
    const ag = decodeFiniteRankedKBestHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(
      underflowModel,
      request
    );
    const af = decodeFiniteMapHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(
      underflowModel,
      afRequest(request)
    );
    expect(ag.ok).toBe(true);
    expect(af.ok).toBe(true);
    if (!ag.ok || !ag.possible || !af.ok || !af.possible) {
      throw new Error('underflow reduction fixture must be possible');
    }
    expect(agMaps(ag)).toEqual(afMaps(af));
    expect(ag.rankStrata![0]!.anchorJointProbability).toBeNull();
    expect(af.maximumJointPathProbability).toBeNull();
  });
});
