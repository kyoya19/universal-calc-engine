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

const baseModel: DefinitionModel = {
  startState: 'a',
  states: [{ id: 'a' }, { id: 'b' }],
  transitions: [
    { from: 'a', to: 'a', probability: 0.6 },
    { from: 'a', to: 'b', probability: 0.4 },
    { from: 'b', to: 'a', probability: 0.25 },
    { from: 'b', to: 'b', probability: 0.75 }
  ]
};
const hidden = ['a', 'b'] as StateId[];
const monitor = ['q0', 'q1'];
const pairs = hidden.flatMap((from) => hidden.map((to) => [from, to] as const));

function aeRequest(): FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceRequest {
  return {
    initialDistribution: [
      { stateId: 'a', probability: 0.65 },
      { stateId: 'b', probability: 0.35 }
    ],
    horizon: 2,
    monitorStates: monitor,
    initialMonitorStateByHiddenState: [
      { stateId: 'a', monitorStateId: 'q0' },
      { stateId: 'b', monitorStateId: 'q1' }
    ],
    monitorTransitionByStep: Array.from({ length: 2 }, (_, step) =>
      monitor.flatMap((q) => pairs.map(([fromStateId, toStateId]) => ({
        monitorStateId: q,
        fromStateId,
        toStateId,
        nextMonitorStateId:
          step === 0
            ? (q === 'q1' || toStateId === 'b' ? 'q1' : 'q0')
            : (fromStateId === 'b' ? (q === 'q0' ? 'q1' : 'q0') : q)
      })))
    ),
    initialEvidenceLikelihoods: [
      { stateId: 'a', likelihood: 0.9 },
      { stateId: 'b', likelihood: 0.45 }
    ],
    monitorCoupledTransitionEvidenceLikelihoodsByStep: Array.from({ length: 2 }, (_, step) =>
      monitor.flatMap((q) => pairs.map(([fromStateId, toStateId]) => ({
        monitorStateId: q,
        fromStateId,
        toStateId,
        likelihood:
          step === 0
            ? (q === 'q0' ? (toStateId === 'b' ? 0.85 : 0.35) : (toStateId === 'a' ? 0.25 : 0.7))
            : (q === 'q0' ? (fromStateId === 'a' ? 0.8 : 0.3) : (fromStateId === 'a' ? 0.4 : 0.9))
      })))
    )
  };
}

function delta(
  req: FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceRequest,
  step: number,
  q: string,
  from: StateId,
  to: StateId
): string {
  return req.monitorTransitionByStep[step]!.find(
    (entry) => entry.monitorStateId === q && entry.fromStateId === from && entry.toStateId === to
  )!.nextMonitorStateId;
}

function augmentedId(stateId: StateId, monitorStateId: string): StateId {
  return `${stateId}|${monitorStateId}`;
}

function compileToAugmentedAd(
  req: FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceRequest
): { model: DefinitionModel; request: FiniteDeterministicTrajectoryMonitorTransitionCalibratedEvidenceRequest } {
  const augmentedStates = hidden.flatMap((stateId) =>
    monitor.map((monitorStateId) => augmentedId(stateId, monitorStateId))
  );
  const transitions = augmentedStates.flatMap((fromAugmented) => {
    const [fromStateId, q] = fromAugmented.split('|') as [StateId, string];
    return baseModel.transitions
      .filter((edge) => edge.from === fromStateId)
      .map((edge) => ({
        from: fromAugmented,
        to: augmentedId(edge.to, delta(req, 0, q, fromStateId, edge.to)),
        probability: edge.probability
      }));
  });
  // The monitor transition is time-dependent, so use a time-expanded hidden state to make the AD model homogeneous.
  const timeStates = Array.from({ length: req.horizon + 1 }, (_, t) =>
    augmentedStates.map((id) => `${t}:${id}`)
  ).flat();
  const timeTransitions = Array.from({ length: req.horizon }, (_, step) =>
    augmentedStates.flatMap((fromAugmented) => {
      const [fromStateId, q] = fromAugmented.split('|') as [StateId, string];
      return baseModel.transitions
        .filter((edge) => edge.from === fromStateId)
        .map((edge) => ({
          from: `${step}:${fromAugmented}`,
          to: `${step + 1}:${augmentedId(edge.to, delta(req, step, q, fromStateId, edge.to))}`,
          probability: edge.probability
        }));
    })
  ).flat();
  const model: DefinitionModel = {
    startState: `0:${augmentedId('a', 'q0')}`,
    states: timeStates.map((id, index) => ({ id, ...(index >= req.horizon * augmentedStates.length ? { terminal: true } : {}) })),
    transitions: timeTransitions
  };
  const initialQ = new Map(req.initialMonitorStateByHiddenState.map((entry) => [entry.stateId, entry.monitorStateId] as const));
  const initialEvidence = new Map(req.initialEvidenceLikelihoods.map((entry) => [entry.stateId, entry.likelihood] as const));
  const initialProbability = new Map(req.initialDistribution.map((entry) => [entry.stateId, entry.probability] as const));
  const stateIds = model.states.map((state) => state.id);
  const request: FiniteDeterministicTrajectoryMonitorTransitionCalibratedEvidenceRequest = {
    initialDistribution: stateIds.map((stateId) => {
      const [timeText, hiddenText, q] = stateId.split(':').length === 2
        ? [stateId.split(':')[0]!, ...stateId.split(':')[1]!.split('|')]
        : ['-1', '', ''];
      const hiddenStateId = hiddenText as StateId;
      return {
        stateId,
        probability:
          timeText === '0' && q === initialQ.get(hiddenStateId)
            ? initialProbability.get(hiddenStateId) ?? 0
            : 0
      };
    }),
    horizon: req.horizon,
    monitorStates: ['unit'],
    initialMonitorStateByHiddenState: stateIds.map((stateId) => ({ stateId, monitorStateId: 'unit' })),
    monitorTransitionByStep: Array.from({ length: req.horizon }, (_, step) => {
      const effectivePairs = timeTransitions
        .filter((edge) => edge.from.startsWith(`${step}:`))
        .map((edge) => [edge.from, edge.to] as const);
      // AD also applies implicit self-retention to final terminal time states at later steps; include those effective pairs.
      const terminalPairs = stateIds
        .filter((id) => id.startsWith(`${req.horizon}:`))
        .map((id) => [id, id] as const);
      return [...effectivePairs, ...terminalPairs].map(([fromStateId, toStateId]) => ({
        monitorStateId: 'unit', fromStateId, toStateId, nextMonitorStateId: 'unit'
      }));
    }),
    initialEvidenceLikelihoods: stateIds.map((stateId) => {
      const parts = stateId.split(':');
      const [hiddenStateId] = parts[1]!.split('|') as [StateId, string];
      return {
        stateId,
        likelihood: parts[0] === '0' ? initialEvidence.get(hiddenStateId) ?? 1 : 1
      };
    }),
    transitionEvidenceLikelihoodsByStep: Array.from({ length: req.horizon }, (_, step) =>
      stateIds.flatMap((fromStateId) => stateIds.map((toStateId) => {
        let likelihood = 1;
        if (fromStateId.startsWith(`${step}:`) && toStateId.startsWith(`${step + 1}:`)) {
          const [, fromAugmented] = fromStateId.split(':');
          const [, toAugmented] = toStateId.split(':');
          const [fromHidden, q] = fromAugmented!.split('|') as [StateId, string];
          const [toHidden] = toAugmented!.split('|') as [StateId, string];
          const requiredNextQ = delta(req, step, q, fromHidden, toHidden);
          if (toAugmented === augmentedId(toHidden, requiredNextQ)) {
            likelihood = req.monitorCoupledTransitionEvidenceLikelihoodsByStep[step]!.find(
              (entry) => entry.monitorStateId === q && entry.fromStateId === fromHidden && entry.toStateId === toHidden
            )!.likelihood;
          }
        }
        return { fromStateId, toStateId, likelihood };
      }))
    )
  };
  void transitions;
  return { model, request };
}

describe('Candidate AE augmented-state Candidate AD reduction cross-check', () => {
  it('matches evidence mass and hidden smoothing after finite deterministic monitor compilation', () => {
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
          .filter((entry) => entry.stateId.startsWith(`${step}:${hiddenStateId}|`))
          .reduce((sum, entry) => sum + entry.probability, 0);
        expect(actual).toBeCloseTo(expected, 12);
      }
    }
  });
});
