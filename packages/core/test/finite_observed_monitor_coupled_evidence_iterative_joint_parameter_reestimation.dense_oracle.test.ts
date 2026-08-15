import { describe, expect, it } from 'vitest';
import { DefinitionModel, StateId, evaluateProbabilitySpec } from '../src/model';
import { HiddenObservationKernelEntry } from '../src/hidden_state_observation';
import {
  FiniteObservedMonitorCoupledEvidenceReestimationRecord
} from '../src/finite_observed_monitor_coupled_evidence_multi_trajectory_joint_parameter_reestimation';
import {
  reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories
} from '../src/finite_observed_monitor_coupled_evidence_iterative_joint_parameter_reestimation';
import {
  iterativeRequest
} from './finite_observed_monitor_coupled_evidence_iterative_joint_parameter_reestimation.test_helpers';
import {
  pairKey,
  standardKernel,
  twoStateModel
} from './finite_observed_monitor_coupled_evidence_multi_trajectory_joint_parameter_reestimation.test_helpers';

type Cell = Map<string, number>;
type Theta = {
  model: DefinitionModel;
  initial: Map<StateId, number>;
  kernel: HiddenObservationKernelEntry[];
};
type DenseStep = {
  event: number;
  gamma: Array<Map<StateId, number>>;
  xi: Map<string, number>;
  emissions: Map<string, number>;
  next: Theta;
};

const STATES: StateId[] = ['a', 'b'];
const SYMBOLS = ['x', 'y'];

function cellKey(stateId: StateId, monitorStateId: string): string {
  return `${stateId}\u0000${monitorStateId}`;
}

function aggregateA(model: DefinitionModel, fromStateId: StateId, toStateId: StateId): number {
  return model.transitions
    .filter((entry) => entry.from === fromStateId && entry.to === toStateId)
    .reduce((sum, entry) => sum + evaluateProbabilitySpec(entry.probability), 0);
}

function denseRecord(): FiniteObservedMonitorCoupledEvidenceReestimationRecord {
  const qs = ['q0', 'q1'];
  const pairs: Array<[StateId, StateId]> = STATES.flatMap((from) => STATES.map((to) => [from, to] as [StateId, StateId]));
  const monitorLayer = qs.flatMap((q) => pairs.map(([fromStateId, toStateId]) => ({
    monitorStateId: q,
    fromStateId,
    toStateId,
    nextMonitorStateId: q === 'q0' ? 'q1' : 'q0'
  })));
  const evidenceLayer = (step: number) => qs.flatMap((q) => pairs.map(([fromStateId, toStateId]) => ({
    monitorStateId: q,
    fromStateId,
    toStateId,
    likelihood: step === 1
      ? (q === 'q0' ? 0.8 : 0.35) * (toStateId === 'a' ? 1 : 0.7)
      : (q === 'q0' ? 0.45 : 0.9) * (fromStateId === toStateId ? 0.8 : 1)
  })));
  return {
    recordId: 'aj-dense-q',
    horizon: 2,
    observations: ['x', 'y', 'x'],
    monitorStates: qs,
    initialMonitorStateByHiddenState: [
      { stateId: 'a', monitorStateId: 'q0' },
      { stateId: 'b', monitorStateId: 'q1' }
    ],
    monitorTransitionByStep: [monitorLayer, monitorLayer.map((entry) => ({ ...entry }))],
    initialEvidenceLikelihoods: [
      { stateId: 'a', likelihood: 0.86 },
      { stateId: 'b', likelihood: 0.52 }
    ],
    monitorCoupledTransitionEvidenceLikelihoodsByStep: [evidenceLayer(1), evidenceLayer(2)],
    targetMonitorStates: qs
  };
}

function kernelProbability(kernel: HiddenObservationKernelEntry[], stateId: StateId, symbol: string): number {
  return kernel.find((entry) => entry.stateId === stateId && entry.symbol === symbol)!.probability;
}

function denseStep(theta: Theta, record: FiniteObservedMonitorCoupledEvidenceReestimationRecord): DenseStep {
  const qs = record.monitorStates;
  const b = (stateId: StateId, symbol: string) => kernelProbability(theta.kernel, stateId, symbol);
  const l0 = (stateId: StateId) => record.initialEvidenceLikelihoods.find((entry) => entry.stateId === stateId)!.likelihood;
  const q0 = (stateId: StateId) => record.initialMonitorStateByHiddenState.find((entry) => entry.stateId === stateId)!.monitorStateId;
  const delta = (step: number, q: string, from: StateId, to: StateId) => record.monitorTransitionByStep[step - 1]!.find(
    (entry) => entry.monitorStateId === q && entry.fromStateId === from && entry.toStateId === to
  )!.nextMonitorStateId;
  const c = (step: number, q: string, from: StateId, to: StateId) => record.monitorCoupledTransitionEvidenceLikelihoodsByStep[step - 1]!.find(
    (entry) => entry.monitorStateId === q && entry.fromStateId === from && entry.toStateId === to
  )!.likelihood;

  const alpha: Cell[] = Array.from({ length: record.horizon + 1 }, () => new Map());
  for (const stateId of STATES) {
    alpha[0]!.set(
      cellKey(stateId, q0(stateId)),
      theta.initial.get(stateId)! * b(stateId, record.observations[0]!) * l0(stateId)
    );
  }
  for (let step = 1; step <= record.horizon; step += 1) {
    for (const from of STATES) for (const q of qs) {
      const previous = alpha[step - 1]!.get(cellKey(from, q)) ?? 0;
      if (previous === 0) continue;
      for (const to of STATES) {
        const a = aggregateA(theta.model, from, to);
        if (a === 0) continue;
        const nextQ = delta(step, q, from, to);
        const key = cellKey(to, nextQ);
        const weight = previous * a * b(to, record.observations[step]!) * c(step, q, from, to);
        alpha[step]!.set(key, (alpha[step]!.get(key) ?? 0) + weight);
      }
    }
  }

  const target = new Set(record.targetMonitorStates ?? qs);
  const beta: Cell[] = Array.from({ length: record.horizon + 1 }, () => new Map());
  for (const stateId of STATES) for (const q of qs) {
    beta[record.horizon]!.set(cellKey(stateId, q), target.has(q) ? 1 : 0);
  }
  for (let step = record.horizon - 1; step >= 0; step -= 1) {
    for (const from of STATES) for (const q of qs) {
      let value = 0;
      for (const to of STATES) {
        const a = aggregateA(theta.model, from, to);
        if (a === 0) continue;
        const nextQ = delta(step + 1, q, from, to);
        value += a * b(to, record.observations[step + 1]!) * c(step + 1, q, from, to)
          * (beta[step + 1]!.get(cellKey(to, nextQ)) ?? 0);
      }
      beta[step]!.set(cellKey(from, q), value);
    }
  }

  let event = 0;
  for (const stateId of STATES) for (const q of qs) {
    if (target.has(q)) event += alpha[record.horizon]!.get(cellKey(stateId, q)) ?? 0;
  }
  if (!(event > 0) || !Number.isFinite(event)) throw new Error('Dense AJ oracle fixture must remain positive and finite');

  const gamma = alpha.map((layer, step) => new Map(STATES.map((stateId) => {
    let value = 0;
    for (const q of qs) {
      value += (layer.get(cellKey(stateId, q)) ?? 0) * (beta[step]!.get(cellKey(stateId, q)) ?? 0);
    }
    return [stateId, value / event] as const;
  })));

  const xi = new Map<string, number>();
  for (let step = 0; step < record.horizon; step += 1) {
    for (const from of STATES) for (const to of STATES) {
      let value = 0;
      for (const q of qs) {
        const a = aggregateA(theta.model, from, to);
        if (a === 0) continue;
        const nextQ = delta(step + 1, q, from, to);
        value += (alpha[step]!.get(cellKey(from, q)) ?? 0) * a
          * b(to, record.observations[step + 1]!) * c(step + 1, q, from, to)
          * (beta[step + 1]!.get(cellKey(to, nextQ)) ?? 0) / event;
      }
      xi.set(pairKey(from, to), (xi.get(pairKey(from, to)) ?? 0) + value);
    }
  }

  const emissions = new Map<string, number>();
  for (let step = 0; step <= record.horizon; step += 1) {
    for (const stateId of STATES) {
      const key = `${stateId}\u0000${record.observations[step]!}`;
      emissions.set(key, (emissions.get(key) ?? 0) + (gamma[step]!.get(stateId) ?? 0));
    }
  }

  const nextInitial = new Map(STATES.map((stateId) => [stateId, gamma[0]!.get(stateId)!] as const));
  const transitions: DefinitionModel['transitions'] = [];
  for (const from of STATES) {
    const rowTotal = STATES.reduce((sum, to) => sum + (xi.get(pairKey(from, to)) ?? 0), 0);
    for (const to of STATES) {
      transitions.push({
        from,
        to,
        probability: rowTotal === 0
          ? aggregateA(theta.model, from, to)
          : (xi.get(pairKey(from, to)) ?? 0) / rowTotal
      });
    }
  }
  const nextKernel: HiddenObservationKernelEntry[] = [];
  for (const stateId of STATES) {
    const rowTotal = SYMBOLS.reduce((sum, symbol) => sum + (emissions.get(`${stateId}\u0000${symbol}`) ?? 0), 0);
    for (const symbol of SYMBOLS) {
      nextKernel.push({
        stateId,
        symbol,
        probability: rowTotal === 0
          ? b(stateId, symbol)
          : (emissions.get(`${stateId}\u0000${symbol}`) ?? 0) / rowTotal
      });
    }
  }

  return {
    event,
    gamma,
    xi,
    emissions,
    next: {
      model: { ...theta.model, transitions },
      initial: nextInitial,
      kernel: nextKernel
    }
  };
}

function parameterVector(theta: Theta): number[] {
  return [
    ...STATES.map((stateId) => theta.initial.get(stateId)!),
    ...STATES.flatMap((from) => STATES.map((to) => aggregateA(theta.model, from, to))),
    ...STATES.flatMap((stateId) => SYMBOLS.map((symbol) => kernelProbability(theta.kernel, stateId, symbol)))
  ];
}

function resultVector(result: ReturnType<typeof reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories>): number[] {
  if (!result.ok || !result.possible) throw new Error('Expected possible AJ result');
  return [
    ...result.finalTheta.initialDistribution.map((entry) => entry.probability),
    ...result.finalTheta.transitionRows.flatMap((row) => row.terminal ? [] : row.row.map((entry) => entry.probability)),
    ...result.finalTheta.observationKernel.map((entry) => entry.probability)
  ];
}

function expectVectorClose(actual: number[], expected: number[], digits = 10): void {
  expect(actual).toHaveLength(expected.length);
  for (let index = 0; index < actual.length; index += 1) expect(actual[index]).toBeCloseTo(expected[index]!, digits);
}

describe('Candidate AJ structurally separate dense raw-probability iterative X-by-Q oracle', () => {
  it('matches dense forward/backward sufficient statistics, likelihood trace, and theta after two fresh iterations', () => {
    const model = twoStateModel();
    const record = denseRecord();
    const initialEntries = [
      { stateId: 'a', probability: 0.61 },
      { stateId: 'b', probability: 0.39 }
    ];
    const request = iterativeRequest({
      initialDistribution: initialEntries,
      alphabet: [...SYMBOLS],
      kernel: standardKernel(),
      evidenceRecords: [record],
      maxIterations: 2,
      parameterConvergenceTolerance: 0,
      logLikelihoodConvergenceTolerance: 0,
      likelihoodNonDecreaseTolerance: 1e-9
    });
    const result = reestimateFiniteHiddenStateParametersIterativelyFromObservedAndMonitorCoupledEvidenceTrajectories(model, request);
    expect(result.ok).toBe(true);
    if (!result.ok || !result.possible) throw new Error('Expected possible Candidate AJ dense fixture');
    expect(result.iterationTrace).toHaveLength(2);

    let theta: Theta = {
      model,
      initial: new Map(initialEntries.map((entry) => [entry.stateId, entry.probability] as const)),
      kernel: standardKernel()
    };
    for (let index = 0; index < 2; index += 1) {
      const oracle = denseStep(theta, record);
      const updatedEvent = denseStep(oracle.next, record).event;
      const trace = result.iterationTrace[index]!;
      expect(trace.currentTotalLogLikelihood).toBeCloseTo(Math.log(oracle.event), 10);
      expect(trace.updatedTotalLogLikelihood).toBeCloseTo(Math.log(updatedEvent), 10);
      expect(trace.logLikelihoodDelta).toBeCloseTo(Math.log(updatedEvent) - Math.log(oracle.event), 10);
      const captured = trace.recordESteps[0]!;
      expect(captured.eventProbability).toBeCloseTo(oracle.event, 10);
      for (const stateId of STATES) {
        expect(captured.posteriorInitialStateProbabilities!.find((entry) => entry.stateId === stateId)!.probability)
          .toBeCloseTo(oracle.gamma[0]!.get(stateId)!, 10);
      }
      for (const [key, expectedCount] of oracle.xi) {
        const [fromStateId, toStateId] = key.split('\u0000');
        const actual = captured.expectedTransitionCounts!.find(
          (entry) => entry.fromStateId === fromStateId && entry.toStateId === toStateId
        )?.expectedCount ?? 0;
        expect(actual).toBeCloseTo(expectedCount, 10);
      }
      for (const [key, expectedCount] of oracle.emissions) {
        const [stateId, symbol] = key.split('\u0000');
        const actual = captured.expectedEmissionCounts!.find(
          (entry) => entry.stateId === stateId && entry.symbol === symbol
        )?.expectedCount ?? 0;
        expect(actual).toBeCloseTo(expectedCount, 10);
      }
      theta = oracle.next;
    }
    expectVectorClose(resultVector(result), parameterVector(theta), 10);
  });
});
