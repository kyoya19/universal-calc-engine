import { describe, expect, it } from 'vitest';
import { DefinitionModel, StateId, evaluateProbabilitySpec } from '../src/model';
import {
  FiniteDeterministicTrajectoryMonitorCalibratedEvidenceConditioningResult,
  FiniteDeterministicTrajectoryMonitorCalibratedEvidenceRequest,
  FiniteDeterministicTrajectoryMonitorCalibratedEvidenceResult,
  analyzeFiniteDeterministicTrajectoryMonitorUnderCalibratedEvidence,
  conditionFiniteDeterministicTrajectoryMonitorOnCalibratedEvidenceAndTerminalMonitorStates
} from '../src/finite_deterministic_trajectory_monitor_calibrated_evidence';

type Analysis = Extract<FiniteDeterministicTrajectoryMonitorCalibratedEvidenceResult, { ok: true }>;
type Conditioned = Extract<FiniteDeterministicTrajectoryMonitorCalibratedEvidenceConditioningResult, { ok: true }>;
type EnumeratedPath = {
  states: StateId[];
  monitors: string[];
  baseProbability: number;
  evidenceWeight: number;
};

const model: DefinitionModel = {
  startState: 'a',
  states: [{ id: 'a' }, { id: 'b' }],
  transitions: [
    { from: 'a', to: 'a', probability: 0.2 },
    { from: 'a', to: 'b', probability: 0.8 },
    { from: 'b', to: 'a', probability: 0.65 },
    { from: 'b', to: 'b', probability: 0.35 }
  ]
};

function request(): FiniteDeterministicTrajectoryMonitorCalibratedEvidenceRequest {
  const monitorStates = ['even_b', 'odd_b'];
  const pairs = [['a', 'a'], ['a', 'b'], ['b', 'a'], ['b', 'b']] as const;
  return {
    initialDistribution: [{ stateId: 'a', probability: 0.7 }, { stateId: 'b', probability: 0.3 }],
    horizon: 3,
    monitorStates,
    initialMonitorStateByHiddenState: [
      { stateId: 'a', monitorStateId: 'even_b' },
      { stateId: 'b', monitorStateId: 'odd_b' }
    ],
    monitorTransitionByStep: Array.from({ length: 3 }, () => monitorStates.flatMap((monitorStateId) =>
      pairs.map(([fromStateId, toStateId]) => ({
        monitorStateId,
        fromStateId,
        toStateId,
        nextMonitorStateId: toStateId === 'b'
          ? monitorStateId === 'even_b' ? 'odd_b' : 'even_b'
          : monitorStateId
      }))
    )),
    evidenceLikelihoods: [
      [{ stateId: 'a', likelihood: 0.9 }, { stateId: 'b', likelihood: 0.4 }],
      [{ stateId: 'a', likelihood: 0.3 }, { stateId: 'b', likelihood: 0.8 }],
      [{ stateId: 'a', likelihood: 0.7 }, { stateId: 'b', likelihood: 0.2 }],
      [{ stateId: 'a', likelihood: 0.6 }, { stateId: 'b', likelihood: 0.95 }]
    ]
  };
}

function requireAnalysis(result: FiniteDeterministicTrajectoryMonitorCalibratedEvidenceResult): Analysis {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.failure.message);
  return result;
}

function requireCondition(result: FiniteDeterministicTrajectoryMonitorCalibratedEvidenceConditioningResult): Conditioned {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.failure.message);
  return result;
}

function evidenceAt(req: FiniteDeterministicTrajectoryMonitorCalibratedEvidenceRequest, step: number, stateId: StateId): number {
  return req.evidenceLikelihoods[step]!.find((entry) => entry.stateId === stateId)!.likelihood;
}

function nextMonitor(
  req: FiniteDeterministicTrajectoryMonitorCalibratedEvidenceRequest,
  step: number,
  monitorStateId: string,
  fromStateId: StateId,
  toStateId: StateId
): string {
  return req.monitorTransitionByStep[step - 1]!.find((entry) =>
    entry.monitorStateId === monitorStateId && entry.fromStateId === fromStateId && entry.toStateId === toStateId
  )!.nextMonitorStateId;
}

function enumerateComplete(req: FiniteDeterministicTrajectoryMonitorCalibratedEvidenceRequest): EnumeratedPath[] {
  const result: EnumeratedPath[] = [];
  const initialMonitor = new Map(req.initialMonitorStateByHiddenState.map((entry) => [entry.stateId, entry.monitorStateId] as const));
  const visit = (
    states: StateId[],
    monitors: string[],
    baseProbability: number,
    evidenceWeight: number,
    nextStep: number
  ): void => {
    if (nextStep > req.horizon) {
      result.push({ states, monitors, baseProbability, evidenceWeight });
      return;
    }
    const fromStateId = states[states.length - 1]!;
    const monitorStateId = monitors[monitors.length - 1]!;
    for (const transition of model.transitions.filter((entry) => entry.from === fromStateId)) {
      const probability = evaluateProbabilitySpec(transition.probability);
      if (probability <= 0) continue;
      visit(
        [...states, transition.to],
        [...monitors, nextMonitor(req, nextStep, monitorStateId, fromStateId, transition.to)],
        baseProbability * probability,
        evidenceWeight * evidenceAt(req, nextStep, transition.to),
        nextStep + 1
      );
    }
  };
  for (const initial of req.initialDistribution) {
    visit(
      [initial.stateId],
      [initialMonitor.get(initial.stateId)!],
      initial.probability,
      evidenceAt(req, 0, initial.stateId),
      1
    );
  }
  return result;
}

function enumeratePrefix(
  req: FiniteDeterministicTrajectoryMonitorCalibratedEvidenceRequest,
  endStep: number
): EnumeratedPath[] {
  const truncated: FiniteDeterministicTrajectoryMonitorCalibratedEvidenceRequest = {
    ...req,
    horizon: endStep,
    monitorTransitionByStep: req.monitorTransitionByStep.slice(0, endStep),
    evidenceLikelihoods: req.evidenceLikelihoods.slice(0, endStep + 1)
  };
  return enumerateComplete(truncated);
}

function weighted(paths: EnumeratedPath[]): number {
  return paths.reduce((sum, path) => sum + path.baseProbability * path.evidenceWeight, 0);
}

describe('Candidate AC independent complete-path and prefix enumeration oracles', () => {
  it('matches P(E), P(E,Q_T) and P(Q_T|E) from complete concrete-transition enumeration', () => {
    const req = request();
    const paths = enumerateComplete(req);
    const total = weighted(paths);
    const byMonitor = new Map<string, number>();
    for (const path of paths) {
      const monitorStateId = path.monitors[path.monitors.length - 1]!;
      byMonitor.set(monitorStateId, (byMonitor.get(monitorStateId) ?? 0) + path.baseProbability * path.evidenceWeight);
    }
    const analysis = requireAnalysis(analyzeFiniteDeterministicTrajectoryMonitorUnderCalibratedEvidence(model, req));
    expect(analysis.evidenceProbability).toBeCloseTo(total, 14);
    for (const [monitorStateId, mass] of byMonitor) {
      const atom = analysis.jointEvidenceMonitorDistribution!.find((entry) => entry.monitorStateId === monitorStateId)!;
      expect(atom.jointProbability).toBeCloseTo(mass, 14);
      expect(atom.conditionalProbability).toBeCloseTo(mass / total, 14);
    }
  });

  it('matches combined-event augmented smoothing, hidden pairwise and expected counts', () => {
    const req = request();
    const target = 'odd_b';
    const selected = enumerateComplete(req).filter((path) => path.monitors[path.monitors.length - 1] === target);
    const selectedMass = weighted(selected);
    const conditioned = requireCondition(
      conditionFiniteDeterministicTrajectoryMonitorOnCalibratedEvidenceAndTerminalMonitorStates(
        model,
        { ...req, targetMonitorStates: [target] }
      )
    );
    expect(conditioned.jointEventProbability).toBeCloseTo(selectedMass, 14);
    for (let step = 0; step <= req.horizon; step += 1) {
      for (const stateId of ['a', 'b']) {
        for (const monitorStateId of req.monitorStates) {
          const expected = selected
            .filter((path) => path.states[step] === stateId && path.monitors[step] === monitorStateId)
            .reduce((sum, path) => sum + path.baseProbability * path.evidenceWeight, 0) / selectedMass;
          const actual = conditioned.smoothingSteps![step]!.jointHiddenMonitorDistribution.find((entry) =>
            entry.stateId === stateId && entry.monitorStateId === monitorStateId
          )!.probability;
          expect(actual).toBeCloseTo(expected, 13);
        }
      }
    }
    const expectedCounts = new Map<string, number>();
    for (const path of selected) {
      const normalizedWeight = path.baseProbability * path.evidenceWeight / selectedMass;
      for (let step = 0; step < req.horizon; step += 1) {
        const key = `${path.states[step]}:${path.states[step + 1]}`;
        expectedCounts.set(key, (expectedCounts.get(key) ?? 0) + normalizedWeight);
      }
    }
    for (const entry of conditioned.expectedTransitionCounts!) {
      expect(entry.expectedCount).toBeCloseTo(expectedCounts.get(`${entry.fromStateId}:${entry.toStateId}`) ?? 0, 12);
    }
  });

  it('matches a genuinely prefix-only enumeration at every prefix step', () => {
    const req = request();
    const analysis = requireAnalysis(analyzeFiniteDeterministicTrajectoryMonitorUnderCalibratedEvidence(model, req));
    for (let step = 0; step <= req.horizon; step += 1) {
      const prefixes = enumeratePrefix(req, step);
      const total = weighted(prefixes);
      expect(analysis.trajectory[step]!.prefixEvidenceProbability).toBeCloseTo(total, 14);
      for (const monitorStateId of req.monitorStates) {
        const expected = prefixes
          .filter((path) => path.monitors[path.monitors.length - 1] === monitorStateId)
          .reduce((sum, path) => sum + path.baseProbability * path.evidenceWeight, 0) / total;
        const actual = analysis.trajectory[step]!.monitorDistribution?.find((entry) => entry.monitorStateId === monitorStateId)?.probability ?? 0;
        expect(actual).toBeCloseTo(expected, 13);
      }
    }
  });
});
