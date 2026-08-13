import { describe, expect, it } from 'vitest';
import { DefinitionModel } from '../src/model';
import {
  FiniteHiddenStateTransitionReestimationRequest,
  reestimateFiniteHiddenStateTransitionsOneStep
} from '../src/hidden_state_transition_reestimation';

type HiddenState = 'a' | 'b';
type ObservationSymbol = 'red' | 'blue';
type Matrix = Record<HiddenState, Record<HiddenState, number>>;
type CountMatrix = Record<HiddenState, Record<HiddenState, number>>;
type EmissionMatrix = Record<HiddenState, Record<ObservationSymbol, number>>;

type PathEnumeration = {
  likelihood: number;
  expectedCounts: CountMatrix;
};

const STATES: HiddenState[] = ['a', 'b'];
const OBSERVATIONS: ObservationSymbol[] = ['red', 'blue', 'red', 'blue'];

const CURRENT: Matrix = {
  a: { a: 0.8, b: 0.2 },
  b: { a: 0.3, b: 0.7 }
};

const EMISSION: EmissionMatrix = {
  a: { red: 0.9, blue: 0.1 },
  b: { red: 0.2, blue: 0.8 }
};

const INITIAL: Record<HiddenState, number> = { a: 0.6, b: 0.4 };

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
    observations: [...OBSERVATIONS]
  };
}

function emptyCountMatrix(): CountMatrix {
  return { a: { a: 0, b: 0 }, b: { a: 0, b: 0 } };
}

function enumerate(
  transition: Matrix,
  observations: ObservationSymbol[],
  collectCounts: boolean
): PathEnumeration {
  let likelihood = 0;
  const weightedCounts = emptyCountMatrix();

  const visit = (path: HiddenState[]): void => {
    if (path.length === observations.length) {
      const first = path[0];
      const firstObservation = observations[0];
      if (first === undefined || firstObservation === undefined) return;
      let mass = INITIAL[first] * EMISSION[first][firstObservation];
      for (let t = 1; t < path.length; t += 1) {
        const from = path[t - 1];
        const to = path[t];
        const observation = observations[t];
        if (from === undefined || to === undefined || observation === undefined) return;
        mass *= transition[from][to];
        mass *= EMISSION[to][observation];
      }
      likelihood += mass;
      if (collectCounts) {
        for (let t = 0; t < path.length - 1; t += 1) {
          const from = path[t];
          const to = path[t + 1];
          if (from === undefined || to === undefined) continue;
          weightedCounts[from][to] += mass;
        }
      }
      return;
    }
    for (const state of STATES) visit([...path, state]);
  };

  visit([]);
  if (likelihood <= 0) throw new Error('Oracle fixture unexpectedly has zero likelihood');

  const expectedCounts = emptyCountMatrix();
  if (collectCounts) {
    for (const from of STATES) {
      for (const to of STATES) {
        expectedCounts[from][to] = weightedCounts[from][to] / likelihood;
      }
    }
  }
  return { likelihood, expectedCounts };
}

function independentlyUpdatedMatrix(expectedCounts: CountMatrix): Matrix {
  const updated: Matrix = { a: { a: 0, b: 0 }, b: { a: 0, b: 0 } };
  for (const from of STATES) {
    const departure = STATES.reduce((sum, to) => sum + expectedCounts[from][to], 0);
    if (!(departure > 0)) throw new Error(`Oracle fixture has zero expected departure for ${from}`);
    for (const to of STATES) {
      updated[from][to] = expectedCounts[from][to] / departure;
    }
  }
  return updated;
}

describe('Candidate S independent likelihood oracle', () => {
  it('independently verifies current and one-step-updated observation likelihood and non-decrease', () => {
    const req = request();
    const currentOracle = enumerate(CURRENT, OBSERVATIONS, true);
    const independentlyUpdated = independentlyUpdatedMatrix(currentOracle.expectedCounts);
    const updatedOracle = enumerate(independentlyUpdated, OBSERVATIONS, false);

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
