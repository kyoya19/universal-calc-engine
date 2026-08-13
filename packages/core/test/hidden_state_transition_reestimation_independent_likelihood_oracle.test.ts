import { describe, expect, it } from 'vitest';
import { DefinitionModel, StateId } from '../src/model';
import {
  FiniteHiddenStateTransitionReestimationRequest,
  reestimateFiniteHiddenStateTransitionsOneStep
} from '../src/hidden_state_transition_reestimation';

type Matrix = Record<string, Record<string, number>>;

type PathEnumeration = {
  likelihood: number;
  expectedCounts: Record<string, Record<string, number>>;
};

const STATES: StateId[] = ['a', 'b'];

const CURRENT: Matrix = {
  a: { a: 0.8, b: 0.2 },
  b: { a: 0.3, b: 0.7 }
};

const EMISSION: Record<string, Record<string, number>> = {
  a: { red: 0.9, blue: 0.1 },
  b: { red: 0.2, blue: 0.8 }
};

const INITIAL: Record<string, number> = { a: 0.6, b: 0.4 };

function model(): DefinitionModel {
  return {
    startState: 'a',
    states: [{ id: 'a' }, { id: 'b' }],
    transitions: [
      { from: 'a', to: 'a', probability: CURRENT.a.a },
      { from: 'a', to: 'b', probability: CURRENT.a.b },
      { from: 'b', to: 'a', probability: CURRENT.b.a },
      { from: 'b', to: 'b', probability: CURRENT.b.b }
    ]
  };
}

function request(): FiniteHiddenStateTransitionReestimationRequest {
  return {
    initialDistribution: [
      { stateId: 'a', probability: INITIAL.a },
      { stateId: 'b', probability: INITIAL.b }
    ],
    alphabet: ['red', 'blue'],
    kernel: [
      { stateId: 'a', symbol: 'red', probability: EMISSION.a.red },
      { stateId: 'a', symbol: 'blue', probability: EMISSION.a.blue },
      { stateId: 'b', symbol: 'red', probability: EMISSION.b.red },
      { stateId: 'b', symbol: 'blue', probability: EMISSION.b.blue }
    ],
    observations: ['red', 'blue', 'red', 'blue']
  };
}

function enumerate(
  transition: Matrix,
  observations: string[],
  collectCounts: boolean
): PathEnumeration {
  let likelihood = 0;
  const weightedCounts: Record<string, Record<string, number>> = {
    a: { a: 0, b: 0 },
    b: { a: 0, b: 0 }
  };

  const visit = (path: StateId[]): void => {
    if (path.length === observations.length) {
      const first = path[0];
      const firstObservation = observations[0];
      if (first === undefined || firstObservation === undefined) return;
      let mass = (INITIAL[first] ?? 0) * (EMISSION[first]?.[firstObservation] ?? 0);
      for (let t = 1; t < path.length; t += 1) {
        const from = path[t - 1];
        const to = path[t];
        const observation = observations[t];
        if (from === undefined || to === undefined || observation === undefined) return;
        mass *= transition[from]?.[to] ?? 0;
        mass *= EMISSION[to]?.[observation] ?? 0;
      }
      likelihood += mass;
      if (collectCounts) {
        for (let t = 0; t < path.length - 1; t += 1) {
          const from = path[t];
          const to = path[t + 1];
          if (from === undefined || to === undefined) continue;
          const row = weightedCounts[from];
          if (row !== undefined) row[to] = (row[to] ?? 0) + mass;
        }
      }
      return;
    }
    for (const state of STATES) visit([...path, state]);
  };

  visit([]);
  if (likelihood <= 0) throw new Error('Oracle fixture unexpectedly has zero likelihood');

  const expectedCounts: Record<string, Record<string, number>> = {
    a: { a: 0, b: 0 },
    b: { a: 0, b: 0 }
  };
  if (collectCounts) {
    for (const from of STATES) {
      for (const to of STATES) {
        expectedCounts[from]![to] = (weightedCounts[from]?.[to] ?? 0) / likelihood;
      }
    }
  }
  return { likelihood, expectedCounts };
}

function independentlyUpdatedMatrix(expectedCounts: Record<string, Record<string, number>>): Matrix {
  const updated: Matrix = { a: { a: 0, b: 0 }, b: { a: 0, b: 0 } };
  for (const from of STATES) {
    const departure = STATES.reduce((sum, to) => sum + (expectedCounts[from]?.[to] ?? 0), 0);
    if (!(departure > 0)) throw new Error(`Oracle fixture has zero expected departure for ${from}`);
    for (const to of STATES) {
      updated[from]![to] = (expectedCounts[from]?.[to] ?? 0) / departure;
    }
  }
  return updated;
}

describe('Candidate S independent likelihood oracle', () => {
  it('independently verifies current and one-step-updated observation likelihood and non-decrease', () => {
    const req = request();
    const currentOracle = enumerate(CURRENT, req.observations, true);
    const independentlyUpdated = independentlyUpdatedMatrix(currentOracle.expectedCounts);
    const updatedOracle = enumerate(independentlyUpdated, req.observations, false);

    const result = reestimateFiniteHiddenStateTransitionsOneStep(model(), req);
    expect(result.ok).toBe(true);
    if (!result.ok || !result.possible) throw new Error('Production fixture unexpectedly failed');

    expect(result.originalLogLikelihood).toBeCloseTo(Math.log(currentOracle.likelihood), 12);
    expect(result.updatedLogLikelihood).toBeCloseTo(Math.log(updatedOracle.likelihood), 12);
    expect(updatedOracle.likelihood + 1e-15).toBeGreaterThanOrEqual(currentOracle.likelihood);
    expect((result.updatedLogLikelihood ?? 0) - (result.originalLogLikelihood ?? 0)).toBeCloseTo(
      Math.log(updatedOracle.likelihood) - Math.log(currentOracle.likelihood),
      12
    );
  });
});
