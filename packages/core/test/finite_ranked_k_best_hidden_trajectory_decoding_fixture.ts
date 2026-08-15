import { DefinitionModel, StateId } from '../src/model';
import { FiniteRankedKBestHiddenTrajectoryDecodingRequest } from '../src/finite_monitor_coupled_evidence_ambiguity_preserving_ranked_k_best_hidden_trajectory_decoding';

export function effectivePairs(model: DefinitionModel): Array<[StateId, StateId]> {
  const pairs = new Set<string>();
  for (const state of model.states) {
    if (state.terminal === true) {
      pairs.add(`${state.id}\u0000${state.id}`);
      continue;
    }
    for (const transition of model.transitions) {
      if (transition.from === state.id && Number(transition.probability) > 0) {
        pairs.add(`${transition.from}\u0000${transition.to}`);
      }
    }
  }
  return [...pairs].sort().map((entry) => entry.split('\u0000') as [StateId, StateId]);
}

export function monitorRows(
  model: DefinitionModel,
  horizon: number,
  monitorStates: string[],
  rule: (q: string, from: StateId, to: StateId, step: number) => string
) {
  const pairs = effectivePairs(model);
  return Array.from({ length: horizon }, (_, step) =>
    monitorStates.flatMap((monitorStateId) =>
      pairs.map(([fromStateId, toStateId]) => ({
        monitorStateId,
        fromStateId,
        toStateId,
        nextMonitorStateId: rule(monitorStateId, fromStateId, toStateId, step)
      }))
    )
  );
}

export function coupledRows(
  stateIds: StateId[],
  monitorStates: string[],
  rule: (q: string, from: StateId, to: StateId, step: number) => number,
  step = 0
) {
  return monitorStates.flatMap((monitorStateId) =>
    stateIds.flatMap((fromStateId) =>
      stateIds.map((toStateId) => ({
        monitorStateId,
        fromStateId,
        toStateId,
        likelihood: rule(monitorStateId, fromStateId, toStateId, step)
      }))
    )
  );
}

export function oneMonitorRequest(
  model: DefinitionModel,
  initial: Array<{ stateId: StateId; probability: number }>,
  horizon = 1,
  rankDepth = 4
): FiniteRankedKBestHiddenTrajectoryDecodingRequest {
  const stateIds = model.states.map((state) => state.id);
  return {
    initialDistribution: initial,
    horizon,
    monitorStates: ['q'],
    initialMonitorStateByHiddenState: stateIds.map((stateId) => ({
      stateId,
      monitorStateId: 'q'
    })),
    monitorTransitionByStep: monitorRows(model, horizon, ['q'], () => 'q'),
    initialEvidenceLikelihoods: stateIds.map((stateId) => ({ stateId, likelihood: 1 })),
    monitorCoupledTransitionEvidenceLikelihoodsByStep: Array.from(
      { length: horizon },
      (_, step) => coupledRows(stateIds, ['q'], () => 1, step)
    ),
    rankDepth,
    kBestScoreTolerance: 1e-12,
    maxReturnedKBestTrajectories: 1000
  };
}

export function hiddenRanks(result: {
  rankStrata: Array<{ trajectories: Array<{ hiddenStateIds: StateId[] }> }> | null;
}) {
  return (
    result.rankStrata?.map((stratum) =>
      stratum.trajectories.map((entry) => entry.hiddenStateIds)
    ) ?? []
  );
}
