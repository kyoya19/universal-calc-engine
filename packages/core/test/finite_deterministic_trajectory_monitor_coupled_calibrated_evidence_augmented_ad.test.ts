import { describe, expect, it } from 'vitest';
import { DefinitionModel, StateId } from '../src/model';
import {
  FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceRequest,
  conditionFiniteDeterministicTrajectoryMonitorOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates
} from '../src/finite_deterministic_trajectory_monitor_coupled_calibrated_evidence';
import {
  FiniteDeterministicTrajectoryMonitorTransitionCalibratedEvidenceRequest,
  conditionFiniteDeterministicTrajectoryMonitorOnTransitionCalibratedEvidenceAndTerminalMonitorStates
} from '../src/finite_deterministic_trajectory_monitor_transition_calibrated_evidence';

const hidden = ['a', 'b'] as StateId[];
const monitor = ['q0', 'q1'];
const hiddenPairs = hidden.flatMap((from) => hidden.map((to) => [from, to] as const));

const baseModel: DefinitionModel = {
  startState: 'a',
  states: hidden.map((id) => ({ id })),
  transitions: [
    { from: 'a', to: 'a', probability: 0.6 },
    { from: 'a', to: 'b', probability: 0.4 },
    { from: 'b', to: 'a', probability: 0.25 },
    { from: 'b', to: 'b', probability: 0.75 }
  ]
};

function nextQ(q: string, _from: StateId, to: StateId): string {
  return to === 'b' ? (q === 'q0' ? 'q1' : 'q0') : q;
}

function aeRequest(): FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceRequest {
  return {
    initialDistribution: [
      { stateId: 'a', probability: 0.65 },
      { stateId: 'b', probability: 0.35 }
    ],
    horizon: 3,
    monitorStates: monitor,
    initialMonitorStateByHiddenState: [
      { stateId: 'a', monitorStateId: 'q0' },
      { stateId: 'b', monitorStateId: 'q1' }
    ],
    monitorTransitionByStep: Array.from({ length: 3 }, () =>
      monitor.flatMap((q) => hiddenPairs.map(([fromStateId, toStateId]) => ({
        monitorStateId: q,
        fromStateId,
        toStateId,
        nextMonitorStateId: nextQ(q, fromStateId, toStateId)
      })))
    ),
    initialEvidenceLikelihoods: [
      { stateId: 'a', likelihood: 0.9 },
      { stateId: 'b', likelihood: 0.45 }
    ],
    monitorCoupledTransitionEvidenceLikelihoodsByStep: Array.from({ length: 3 }, (_, step) =>
      monitor.flatMap((q) => hiddenPairs.map(([fromStateId, toStateId]) => ({
        monitorStateId: q,
        fromStateId,
        toStateId,
        likelihood:
          step === 0
            ? q === 'q0' ? (toStateId === 'b' ? 0.85 : 0.35) : (toStateId === 'a' ? 0.25 : 0.7)
            : step === 1
              ? q === 'q0' ? (fromStateId === 'a' ? 0.8 : 0.3) : (fromStateId === 'a' ? 0.4 : 0.9)
              : q === 'q0' ? (toStateId === 'a' ? 0.55 : 0.75) : (toStateId === 'a' ? 0.95 : 0.2)
      })))
    )
  };
}

function augmentedId(stateId: StateId, monitorStateId: string): StateId {
  return `${stateId}|${monitorStateId}`;
}

function compileToAugmentedAd(
  ae: FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceRequest
): { model: DefinitionModel; request: FiniteDeterministicTrajectoryMonitorTransitionCalibratedEvidenceRequest } {
  const augmentedStates = hidden.flatMap((stateId) =>
    monitor.map((q) => augmentedId(stateId, q))
  );
  const transitions = augmentedStates.flatMap((fromAugmented) => {
    const [fromStateId, q] = fromAugmented.split('|') as [StateId, string];
    return baseModel.transitions
      .filter((edge) => edge.from === fromStateId)
      .map((edge) => ({
        from: fromAugmented,
        to: augmentedId(edge.to, nextQ(q, fromStateId, edge.to)),
        probability: edge.probability
      }));
  });
  const model: DefinitionModel = {
    startState: augmentedId('a', 'q0'),
    states: augmentedStates.map((id) => ({ id })),
    transitions
  };
  const initialQ = new Map(
    ae.initialMonitorStateByHiddenState.map((entry) => [entry.stateId, entry.monitorStateId] as const)
  );
  const initialP = new Map(
    ae.initialDistribution.map((entry) => [entry.stateId, entry.probability] as const)
  );
  const initialEvidence = new Map(
    ae.initialEvidenceLikelihoods.map((entry) => [entry.stateId, entry.likelihood] as const)
  );
  const effectivePairs = transitions.map((edge) => [edge.from, edge.to] as const);

  const request: FiniteDeterministicTrajectoryMonitorTransitionCalibratedEvidenceRequest = {
    initialDistribution: augmentedStates.map((stateId) => {
      const [hiddenStateId, q] = stateId.split('|') as [StateId, string];
      return {
        stateId,
        probability: q === initialQ.get(hiddenStateId) ? initialP.get(hiddenStateId) ?? 0 : 0
      };
    }),
    horizon: ae.horizon,
    monitorStates: ['unit'],
    initialMonitorStateByHiddenState: augmentedStates.map((stateId) => ({
      stateId,
      monitorStateId: 'unit'
    })),
    monitorTransitionByStep: Array.from({ length: ae.horizon }, () =>
      effectivePairs.map(([fromStateId, toStateId]) => ({
        monitorStateId: 'unit',
        fromStateId,
        toStateId,
        nextMonitorStateId: 'unit'
      }))
    ),
    initialEvidenceLikelihoods: augmentedStates.map((stateId) => {
      const [hiddenStateId] = stateId.split('|') as [StateId, string];
      return { stateId, likelihood: initialEvidence.get(hiddenStateId)! };
    }),
    transitionEvidenceLikelihoodsByStep: Array.from({ length: ae.horizon }, (_, step) =>
      augmentedStates.flatMap((fromAugmented) =>
        augmentedStates.map((toAugmented) => {
          const [fromHidden, q] = fromAugmented.split('|') as [StateId, string];
          const [toHidden, toQ] = toAugmented.split('|') as [StateId, string];
          const followsMonitor = toQ === nextQ(q, fromHidden, toHidden);
          const evidence = ae.monitorCoupledTransitionEvidenceLikelihoodsByStep[step]!.find(
            (entry) =>
              entry.monitorStateId === q &&
              entry.fromStateId === fromHidden &&
              entry.toStateId === toHidden
          )!;
          return {
            fromStateId: fromAugmented,
            toStateId: toAugmented,
            likelihood: followsMonitor ? evidence.likelihood : 1
          };
        })
      )
    )
  };
  return { model, request };
}

describe('Candidate AE augmented-state Candidate AD reduction cross-check', () => {
  it('matches evidence mass and hidden smoothing after compiling (X,Q) into the AD hidden state', () => {
    const ae = aeRequest();
    const aeResult = conditionFiniteDeterministicTrajectoryMonitorOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates(
      baseModel,
      { ...ae, targetMonitorStates: ae.monitorStates }
    );
    expect(aeResult.ok).toBe(true);
    if (!aeResult.ok) throw new Error(aeResult.failure.message);

    const compiled = compileToAugmentedAd(ae);
    const adResult = conditionFiniteDeterministicTrajectoryMonitorOnTransitionCalibratedEvidenceAndTerminalMonitorStates(
      compiled.model,
      { ...compiled.request, targetMonitorStates: ['unit'] }
    );
    expect(adResult.ok).toBe(true);
    if (!adResult.ok) throw new Error(adResult.failure.message);
    expect(adResult.evidenceProbability).toBeCloseTo(aeResult.evidenceProbability!, 13);

    for (let step = 0; step <= ae.horizon; step += 1) {
      for (const hiddenStateId of hidden) {
        const expected = aeResult.smoothingSteps![step]!.hiddenStateDistribution.find(
          (entry) => entry.stateId === hiddenStateId
        )!.probability;
        const actual = adResult.smoothingSteps![step]!.hiddenStateDistribution
          .filter((entry) => entry.stateId.startsWith(`${hiddenStateId}|`))
          .reduce((sum, entry) => sum + entry.probability, 0);
        expect(actual).toBeCloseTo(expected, 12);
      }
    }
  });
});
