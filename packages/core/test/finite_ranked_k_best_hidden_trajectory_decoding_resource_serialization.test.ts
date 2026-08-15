import { describe, expect, it } from 'vitest';
import { DefinitionModel } from '../src/model';
import { analyzeFiniteDeterministicTrajectoryMonitorUnderMonitorCoupledCalibratedEvidence } from '../src/finite_deterministic_trajectory_monitor_coupled_calibrated_evidence';
import {
  FiniteRankedKBestHiddenTrajectoryDecodingRequest,
  decodeFiniteRankedKBestHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence,
  decodeFiniteRankedKBestHiddenTrajectoriesOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates,
  finiteRankedKBestHiddenTrajectoryDecodingResultToJson,
  finiteRankedKBestHiddenTrajectoryConditionedDecodingResultToJson
} from '../src/finite_monitor_coupled_evidence_ambiguity_preserving_ranked_k_best_hidden_trajectory_decoding';
import {
  coupledRows,
  monitorRows,
  oneMonitorRequest
} from './finite_ranked_k_best_hidden_trajectory_decoding_fixture';

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

function baseRequest(rankDepth = 4) {
  return oneMonitorRequest(
    model,
    [
      { stateId: 'a', probability: 0.6 },
      { stateId: 'b', probability: 0.4 }
    ],
    2,
    rankDepth
  );
}

describe('Candidate AG resource, underflow, consistency and serialization qualification', () => {
  it('hard-fails every invalid ranked option class', () => {
    const rank = baseRequest();
    rank.rankDepth = 0;
    const badRank = decodeFiniteRankedKBestHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(
      model,
      rank
    );
    expect(badRank.ok).toBe(false);
    if (!badRank.ok) expect(badRank.failure.code).toBe('invalid_k_best_rank_depth');

    const tolerance = baseRequest();
    tolerance.kBestScoreTolerance = -1;
    const badTolerance =
      decodeFiniteRankedKBestHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(
        model,
        tolerance
      );
    expect(badTolerance.ok).toBe(false);
    if (!badTolerance.ok) {
      expect(badTolerance.failure.code).toBe('invalid_k_best_score_tolerance');
    }

    const limit = baseRequest();
    limit.maxReturnedKBestTrajectories = 0;
    const badLimit = decodeFiniteRankedKBestHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(
      model,
      limit
    );
    expect(badLimit.ok).toBe(false);
    if (!badLimit.ok) expect(badLimit.failure.code).toBe('invalid_k_best_trajectory_limit');

    const badPredecessor =
      decodeFiniteRankedKBestHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(
        model,
        baseRequest(),
        { maxRankedPredecessors: 0 }
      );
    expect(badPredecessor.ok).toBe(false);
    if (!badPredecessor.ok) {
      expect(badPredecessor.failure.code).toBe('invalid_ranked_predecessor_limit');
    }
  });

  it('fails an oversized selected tie stratum instead of truncating it', () => {
    const tiedModel: DefinitionModel = {
      startState: 'a',
      states: [
        { id: 'a', terminal: true },
        { id: 'b', terminal: true },
        { id: 'c', terminal: true }
      ],
      transitions: []
    };
    const request = oneMonitorRequest(
      tiedModel,
      [
        { stateId: 'a', probability: 1 / 3 },
        { stateId: 'b', probability: 1 / 3 },
        { stateId: 'c', probability: 1 / 3 }
      ],
      0,
      1
    );
    request.maxReturnedKBestTrajectories = 2;
    const result = decodeFiniteRankedKBestHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(
      tiedModel,
      request
    );
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.failure.code).toBe('k_best_tie_stratum_limit_exceeded');
  });

  it('fails ranked-predecessor resource exhaustion without approximate fallback', () => {
    const result = decodeFiniteRankedKBestHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(
      model,
      baseRequest(),
      { maxRankedPredecessors: 1 }
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.failure.code).toBe('k_best_ranked_predecessor_limit_exceeded');
    }
  });

  it('keeps two distinct positive rank strata ordered after direct Float64 underflow', () => {
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
        2
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
    const result = decodeFiniteRankedKBestHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(
      underflowModel,
      request
    );
    expect(result.ok).toBe(true);
    if (!result.ok || !result.possible) throw new Error('underflow fixture must be possible');
    expect(result.rankStrata).toHaveLength(2);
    expect(result.rankStrata![0]!.anchorJointProbability).toBeNull();
    expect(result.rankStrata![1]!.anchorJointProbability).toBeNull();
    expect(result.rankStrata![0]!.anchorLogJointProbability).toBeGreaterThan(
      result.rankStrata![1]!.anchorLogJointProbability
    );
    expect(result.rankStrata![0]!.anchorJointProbabilityUnderflowed).toBe(true);
    expect(result.rankStrata![1]!.anchorJointProbabilityUnderflowed).toBe(true);
  });

  it('matches Candidate AE denominator and exhaustive posterior trajectory mass sums to one', () => {
    const request = baseRequest(20);
    request.initialEvidenceLikelihoods = [
      { stateId: 'a', likelihood: 0.8 },
      { stateId: 'b', likelihood: 0.5 }
    ];
    const ae = analyzeFiniteDeterministicTrajectoryMonitorUnderMonitorCoupledCalibratedEvidence(
      model,
      request
    );
    const result = decodeFiniteRankedKBestHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(
      model,
      request
    );
    expect(ae.ok).toBe(true);
    expect(result.ok).toBe(true);
    if (!ae.ok || !ae.possible || !result.ok || !result.possible) {
      throw new Error('AE denominator fixture must be possible');
    }
    expect(result.logEvidenceProbability).toBeCloseTo(ae.logEvidenceProbability!, 14);
    expect(result.allRankedTrajectoriesExhausted).toBe(true);
    const posteriorMass = result.rankStrata!
      .flatMap((stratum) => stratum.trajectories)
      .reduce((sum, atom) => sum + atom.posteriorProbability!, 0);
    expect(posteriorMass).toBeCloseTo(1, 14);
  });

  it('enforces monotone unique ranking and checked deterministic serialization', () => {
    const request = baseRequest(20);
    const result = decodeFiniteRankedKBestHiddenTrajectoriesUnderMonitorCoupledCalibratedEvidence(
      model,
      request
    );
    expect(result.ok).toBe(true);
    if (!result.ok || !result.possible) throw new Error('serialization fixture must be possible');
    expect(finiteRankedKBestHiddenTrajectoryDecodingResultToJson(result)).toBe(
      JSON.stringify(result)
    );
    const keys = new Set<string>();
    for (let index = 0; index < result.rankStrata!.length; index += 1) {
      const stratum = result.rankStrata![index]!;
      expect(stratum.rank).toBe(index + 1);
      if (index > 0) {
        expect(result.rankStrata![index - 1]!.anchorLogJointProbability).toBeGreaterThan(
          stratum.anchorLogJointProbability + request.kBestScoreTolerance
        );
      }
      for (const atom of stratum.trajectories) {
        const key = atom.hiddenStateIds.join('\u0000');
        expect(keys.has(key)).toBe(false);
        keys.add(key);
      }
    }

    const conditioned =
      decodeFiniteRankedKBestHiddenTrajectoriesOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates(
        model,
        { ...request, targetMonitorStates: ['q'] }
      );
    expect(conditioned.ok).toBe(true);
    if (!conditioned.ok) throw new Error(conditioned.failure.message);
    expect(finiteRankedKBestHiddenTrajectoryConditionedDecodingResultToJson(conditioned)).toBe(
      JSON.stringify(conditioned)
    );

    const forged = structuredClone(result);
    forged.rankStrata![0]!.anchorLogJointProbability = Number.POSITIVE_INFINITY;
    expect(() => finiteRankedKBestHiddenTrajectoryDecodingResultToJson(forged)).toThrow(
      /non-finite/
    );
  });
});
