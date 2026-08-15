import { describe, expect, it } from 'vitest';
import { DefinitionModel, StateId } from '../src/model';
import {
  FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceRequest,
  analyzeFiniteDeterministicTrajectoryMonitorUnderMonitorCoupledCalibratedEvidence,
  conditionFiniteDeterministicTrajectoryMonitorOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates
} from '../src/finite_deterministic_trajectory_monitor_coupled_calibrated_evidence';

const model: DefinitionModel = {
  startState: 'x',
  states: [{ id: 'x' }, { id: 'y' }],
  transitions: [
    { from: 'x', to: 'x', probability: 0.4 },
    { from: 'x', to: 'y', probability: 0.6 },
    { from: 'y', to: 'x', probability: 0.25 },
    { from: 'y', to: 'y', probability: 0.75 }
  ]
};

const pairs = [['x', 'x'], ['x', 'y'], ['y', 'x'], ['y', 'y']] as const;

function request(): FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceRequest {
  const monitorStates = ['q0', 'q1', 'q2'];
  return {
    initialDistribution: [
      { stateId: 'x', probability: 0.55 },
      { stateId: 'y', probability: 0.45 }
    ],
    horizon: 3,
    monitorStates,
    initialMonitorStateByHiddenState: [
      { stateId: 'x', monitorStateId: 'q0' },
      { stateId: 'y', monitorStateId: 'q1' }
    ],
    monitorTransitionByStep: Array.from({ length: 3 }, (_, step) =>
      monitorStates.flatMap((q) =>
        pairs.map(([fromStateId, toStateId]) => {
          const qIndex = monitorStates.indexOf(q);
          const advance = toStateId === 'y' ? 1 : step === 1 && fromStateId === 'y' ? 2 : 0;
          return {
            monitorStateId: q,
            fromStateId,
            toStateId,
            nextMonitorStateId: monitorStates[(qIndex + advance) % monitorStates.length]!
          };
        })
      )
    ),
    initialEvidenceLikelihoods: [
      { stateId: 'x', likelihood: 0.9 },
      { stateId: 'y', likelihood: 0.5 }
    ],
    monitorCoupledTransitionEvidenceLikelihoodsByStep: Array.from(
      { length: 3 },
      (_, step) =>
        monitorStates.flatMap((q) =>
          pairs.map(([fromStateId, toStateId]) => {
            const base =
              step === 0
                ? fromStateId === 'x' && toStateId === 'x'
                  ? 0.2
                  : fromStateId === 'x' && toStateId === 'y'
                    ? 0.8
                    : fromStateId === 'y' && toStateId === 'x'
                      ? 0.65
                      : 0.3
                : step === 1
                  ? fromStateId === 'x' && toStateId === 'x'
                    ? 0.75
                    : fromStateId === 'x' && toStateId === 'y'
                      ? 0.35
                      : fromStateId === 'y' && toStateId === 'x'
                        ? 0.4
                        : 0.95
                  : fromStateId === 'x' && toStateId === 'x'
                    ? 0.6
                    : fromStateId === 'x' && toStateId === 'y'
                      ? 0.9
                      : fromStateId === 'y' && toStateId === 'x'
                        ? 0.25
                        : 0.7;
            const qFactor = q === 'q0' ? 1 : q === 'q1' ? 0.8 : 0.55;
            return { monitorStateId: q, fromStateId, toStateId, likelihood: base * qFactor };
          })
        )
    )
  };
}

function requireAnalysis(
  result: ReturnType<typeof analyzeFiniteDeterministicTrajectoryMonitorUnderMonitorCoupledCalibratedEvidence>
) {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.failure.message);
  return result;
}

function requireCondition(
  result: ReturnType<typeof conditionFiniteDeterministicTrajectoryMonitorOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates>
) {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.failure.message);
  return result;
}

function denseOracle(req: FiniteDeterministicTrajectoryMonitorCoupledCalibratedEvidenceRequest) {
  const hidden = ['x', 'y'] as StateId[];
  const monitor = [...req.monitorStates];
  const hIndex = new Map(hidden.map((id, index) => [id, index] as const));
  const qIndex = new Map(monitor.map((id, index) => [id, index] as const));
  const initialQ = new Map(
    req.initialMonitorStateByHiddenState.map((entry) => [entry.stateId, entry.monitorStateId] as const)
  );
  const initialP = new Map(
    req.initialDistribution.map((entry) => [entry.stateId, entry.probability] as const)
  );
  const initialEvidence = new Map(
    req.initialEvidenceLikelihoods.map((entry) => [entry.stateId, entry.likelihood] as const)
  );
  const coupledEvidence = req.monitorCoupledTransitionEvidenceLikelihoodsByStep.map(
    (row) =>
      new Map(
        row.map((entry) => [
          `${entry.monitorStateId}:${entry.fromStateId}:${entry.toStateId}`,
          entry.likelihood
        ] as const)
      )
  );
  const transition = model.transitions.map((entry) => ({
    from: entry.from,
    to: entry.to,
    probability: Number(entry.probability)
  }));
  const delta = req.monitorTransitionByStep.map(
    (row) =>
      new Map(
        row.map((entry) => [
          `${entry.monitorStateId}:${entry.fromStateId}:${entry.toStateId}`,
          entry.nextMonitorStateId
        ] as const)
      )
  );

  const forward: number[][][] = [];
  const first = Array.from(
    { length: hidden.length },
    () => Array(monitor.length).fill(0) as number[]
  );
  for (const stateId of hidden) {
    first[hIndex.get(stateId)!]![qIndex.get(initialQ.get(stateId)!)!] =
      (initialP.get(stateId) ?? 0) * (initialEvidence.get(stateId) ?? 0);
  }
  forward.push(first);

  for (let step = 0; step < req.horizon; step += 1) {
    const next = Array.from(
      { length: hidden.length },
      () => Array(monitor.length).fill(0) as number[]
    );
    for (const fromStateId of hidden) {
      for (const q of monitor) {
        const mass = forward[step]![hIndex.get(fromStateId)!]![qIndex.get(q)!]!;
        if (mass === 0) continue;
        for (const edge of transition.filter((entry) => entry.from === fromStateId)) {
          const qNext = delta[step]!.get(`${q}:${fromStateId}:${edge.to}`)!;
          const target = next[hIndex.get(edge.to)!]!;
          const qi = qIndex.get(qNext)!;
          target[qi] =
            (target[qi] ?? 0) +
            mass *
              edge.probability *
              (coupledEvidence[step]!.get(`${q}:${fromStateId}:${edge.to}`) ?? 0);
        }
      }
    }
    forward.push(next);
  }

  return {
    hidden,
    monitor,
    hIndex,
    qIndex,
    coupledEvidence,
    transition,
    delta,
    forward
  };
}

describe('Candidate AE independent raw-probability dense X-by-Q oracle', () => {
  it('matches dense forward evidence and monitor joint masses', () => {
    const req = request();
    const dense = denseOracle(req);
    const final = dense.forward[req.horizon]!;
    const total = final.flat().reduce((sum, value) => sum + value, 0);
    const analysis = requireAnalysis(
      analyzeFiniteDeterministicTrajectoryMonitorUnderMonitorCoupledCalibratedEvidence(model, req)
    );
    expect(analysis.evidenceProbability).toBeCloseTo(total, 14);
    for (const q of dense.monitor) {
      const qi = dense.qIndex.get(q)!;
      const mass = dense.hidden.reduce(
        (sum, stateId) => sum + final[dense.hIndex.get(stateId)!]![qi]!,
        0
      );
      const actual =
        analysis.jointEvidenceMonitorDistribution?.find((entry) => entry.monitorStateId === q)
          ?.jointProbability ?? 0;
      expect(actual).toBeCloseTo(mass, 14);
    }
  });

  it('uses an independent dense backward array to reproduce combined smoothing', () => {
    const req = request();
    const target = new Set(['q1', 'q2']);
    const dense = denseOracle(req);
    const beta: number[][][] = Array.from({ length: req.horizon + 1 }, () =>
      Array.from(
        { length: dense.hidden.length },
        () => Array(dense.monitor.length).fill(0) as number[]
      )
    );
    for (const stateId of dense.hidden) {
      for (const q of dense.monitor) {
        beta[req.horizon]![dense.hIndex.get(stateId)!]![dense.qIndex.get(q)!] = target.has(q)
          ? 1
          : 0;
      }
    }

    for (let step = req.horizon - 1; step >= 0; step -= 1) {
      for (const fromStateId of dense.hidden) {
        for (const q of dense.monitor) {
          let value = 0;
          for (const edge of dense.transition.filter((entry) => entry.from === fromStateId)) {
            const qNext = dense.delta[step]!.get(`${q}:${fromStateId}:${edge.to}`)!;
            value +=
              edge.probability *
              (dense.coupledEvidence[step]!.get(`${q}:${fromStateId}:${edge.to}`) ?? 0) *
              beta[step + 1]![dense.hIndex.get(edge.to)!]![dense.qIndex.get(qNext)!]!;
          }
          beta[step]![dense.hIndex.get(fromStateId)!]![dense.qIndex.get(q)!] = value;
        }
      }
    }

    const final = dense.forward[req.horizon]!;
    let joint = 0;
    for (const stateId of dense.hidden) {
      for (const q of dense.monitor) {
        if (target.has(q)) {
          joint += final[dense.hIndex.get(stateId)!]![dense.qIndex.get(q)!]!;
        }
      }
    }

    const conditioned = requireCondition(
      conditionFiniteDeterministicTrajectoryMonitorOnMonitorCoupledCalibratedEvidenceAndTerminalMonitorStates(
        model,
        { ...req, targetMonitorStates: [...target] }
      )
    );
    expect(conditioned.jointEventProbability).toBeCloseTo(joint, 14);
    for (let step = 0; step <= req.horizon; step += 1) {
      for (const stateId of dense.hidden) {
        for (const q of dense.monitor) {
          const expected =
            (dense.forward[step]![dense.hIndex.get(stateId)!]![dense.qIndex.get(q)!]! *
              beta[step]![dense.hIndex.get(stateId)!]![dense.qIndex.get(q)!]!) /
            joint;
          const actual = conditioned.smoothingSteps![step]!.jointHiddenMonitorDistribution.find(
            (entry) => entry.stateId === stateId && entry.monitorStateId === q
          )!.probability;
          expect(actual).toBeCloseTo(expected, 12);
        }
      }
    }
  });
});
