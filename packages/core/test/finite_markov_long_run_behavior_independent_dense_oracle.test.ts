import { describe, expect, it } from 'vitest';
import { DefinitionModel, StateId, evaluateProbabilitySpec, isTerminalState } from '../src/model';
import { analyzeFiniteMarkovLongRunBehavior } from '../src/finite_markov_long_run_behavior';

function determinant(matrix: number[][]): number {
  const size = matrix.length;
  if (size === 0) return 1;
  if (matrix.some((row) => row.length !== size)) {
    throw new Error('determinant requires a square matrix');
  }
  if (size === 1) return matrix[0]![0]!;
  if (size === 2) {
    return matrix[0]![0]! * matrix[1]![1]! - matrix[0]![1]! * matrix[1]![0]!;
  }

  let value = 0;
  for (let column = 0; column < size; column += 1) {
    const minor = matrix
      .slice(1)
      .map((row) => row.filter((_, index) => index !== column));
    value += (column % 2 === 0 ? 1 : -1) * matrix[0]![column]! * determinant(minor);
  }
  return value;
}

function solveByCramer(coefficients: number[][], rightHandSide: number[]): number[] {
  const size = coefficients.length;
  if (size === 0 || rightHandSide.length !== size) {
    throw new Error('Cramer oracle requires a non-empty square system');
  }
  if (coefficients.some((row) => row.length !== size)) {
    throw new Error('Cramer oracle requires a square coefficient matrix');
  }

  const denominator = determinant(coefficients);
  if (!Number.isFinite(denominator) || Math.abs(denominator) < 1e-14) {
    throw new Error('Cramer oracle encountered a singular system');
  }

  return Array.from({ length: size }, (_, replacedColumn) => {
    const numeratorMatrix = coefficients.map((row, rowIndex) =>
      row.map((value, columnIndex) =>
        columnIndex === replacedColumn ? rightHandSide[rowIndex]! : value
      )
    );
    return determinant(numeratorMatrix) / denominator;
  });
}

function denseTransitionMatrix(model: DefinitionModel): {
  stateIds: StateId[];
  matrix: number[][];
} {
  const stateIds = model.states
    .map((state) => state.id)
    .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
  const indexByState = new Map(stateIds.map((stateId, index) => [stateId, index]));
  const matrix = stateIds.map(() => stateIds.map(() => 0));

  for (const state of model.states) {
    const from = indexByState.get(state.id);
    if (from === undefined) throw new Error('dense oracle lost a state index');
    if (isTerminalState(state)) {
      matrix[from]![from] = 1;
      continue;
    }
    for (const transition of model.transitions) {
      if (transition.from !== state.id) continue;
      const to = indexByState.get(transition.to);
      if (to === undefined) throw new Error('dense oracle found an unknown transition target');
      matrix[from]![to] = matrix[from]![to]! + evaluateProbabilitySpec(transition.probability);
    }
  }

  return { stateIds, matrix };
}

function stationaryByCramer(
  classStateIds: StateId[],
  stateIds: StateId[],
  matrix: number[][]
): Record<StateId, number> {
  const indexByState = new Map(stateIds.map((stateId, index) => [stateId, index]));
  const classIndices = classStateIds.map((stateId) => {
    const index = indexByState.get(stateId);
    if (index === undefined) throw new Error(`unknown class state ${stateId}`);
    return index;
  });
  const size = classIndices.length;
  const coefficients = Array.from({ length: size }, () => Array(size).fill(0) as number[]);
  const rightHandSide = Array(size).fill(0) as number[];

  for (let equation = 0; equation < size - 1; equation += 1) {
    for (let source = 0; source < size; source += 1) {
      coefficients[equation]![source] =
        matrix[classIndices[source]!]![classIndices[equation]!]! -
        (source === equation ? 1 : 0);
    }
  }
  for (let source = 0; source < size; source += 1) coefficients[size - 1]![source] = 1;
  rightHandSide[size - 1] = 1;

  const solution = solveByCramer(coefficients, rightHandSide);
  return Object.fromEntries(classStateIds.map((stateId, index) => [stateId, solution[index]!])) as Record<
    StateId,
    number
  >;
}

function classEntryByCramer(
  transientStateIds: StateId[],
  targetClassStateIds: StateId[],
  stateIds: StateId[],
  matrix: number[][]
): Record<StateId, number> {
  const indexByState = new Map(stateIds.map((stateId, index) => [stateId, index]));
  const transientIndices = transientStateIds.map((stateId) => {
    const index = indexByState.get(stateId);
    if (index === undefined) throw new Error(`unknown transient state ${stateId}`);
    return index;
  });
  const targetIndices = targetClassStateIds.map((stateId) => {
    const index = indexByState.get(stateId);
    if (index === undefined) throw new Error(`unknown target class state ${stateId}`);
    return index;
  });

  const coefficients = transientIndices.map((from, row) =>
    transientIndices.map((to, column) => (row === column ? 1 : 0) - matrix[from]![to]!)
  );
  const rightHandSide = transientIndices.map((from) =>
    targetIndices.reduce((sum, target) => sum + matrix[from]![target]!, 0)
  );
  const solution = solveByCramer(coefficients, rightHandSide);

  return Object.fromEntries(
    transientStateIds.map((stateId, index) => [stateId, solution[index]!])
  ) as Record<StateId, number>;
}

function expectRecordClose(
  actual: Record<StateId, number>,
  expected: Record<StateId, number>,
  digits = 12
): void {
  expect(Object.keys(actual).sort()).toEqual(Object.keys(expected).sort());
  for (const [stateId, probability] of Object.entries(expected)) {
    expect(actual[stateId]).toBeCloseTo(probability, digits);
  }
}

const denseOracleFixture: DefinitionModel = {
  startState: 't1',
  states: [
    { id: 't1' },
    { id: 't2' },
    { id: 'a' },
    { id: 'b' },
    { id: 'c', terminal: true }
  ],
  transitions: [
    { from: 't1', to: 't2', probability: 0.5 },
    { from: 't1', to: 'a', probability: 0.25 },
    { from: 't1', to: 'c', probability: 0.25 },
    { from: 't2', to: 't1', probability: 0.2 },
    { from: 't2', to: 'a', probability: 0.4 },
    { from: 't2', to: 'c', probability: 0.4 },
    { from: 'a', to: 'a', probability: 0.7 },
    { from: 'a', to: 'b', probability: 0.3 },
    { from: 'b', to: 'a', probability: 0.2 },
    { from: 'b', to: 'b', probability: 0.8 }
  ]
};

describe('Candidate J independent dense linear-algebra qualification oracle', () => {
  it('independently solves stationary, class-entry, and Cesaro equations using Cramer rule', () => {
    const { stateIds, matrix } = denseTransitionMatrix(denseOracleFixture);
    const stationaryAB = stationaryByCramer(['a', 'b'], stateIds, matrix);
    const stationaryC = stationaryByCramer(['c'], stateIds, matrix);
    const entryAB = classEntryByCramer(['t1', 't2'], ['a', 'b'], stateIds, matrix);
    const entryC = classEntryByCramer(['t1', 't2'], ['c'], stateIds, matrix);

    expectRecordClose(stationaryAB, { a: 0.4, b: 0.6 });
    expectRecordClose(stationaryC, { c: 1 });
    expectRecordClose(entryAB, { t1: 0.5, t2: 0.5 });
    expectRecordClose(entryC, { t1: 0.5, t2: 0.5 });

    const alphaAB = entryAB.t1!;
    const alphaC = entryC.t1!;
    const oracleCesaro: Record<StateId, number> = {
      a: alphaAB * stationaryAB.a!,
      b: alphaAB * stationaryAB.b!,
      c: alphaC * stationaryC.c!,
      t1: 0,
      t2: 0
    };
    expectRecordClose(oracleCesaro, { a: 0.2, b: 0.3, c: 0.5, t1: 0, t2: 0 });

    const production = analyzeFiniteMarkovLongRunBehavior(denseOracleFixture, {
      initialDistribution: [{ stateId: 't1', probability: 1 }]
    });
    expect(production.ok).toBe(true);
    if (!production.ok) throw new Error(`${production.failure.code}: ${production.failure.message}`);

    expect(production.transientStateIds).toEqual(['t1', 't2']);
    expect(production.recurrentClasses.map((entry) => entry.stateIds)).toEqual([['a', 'b'], ['c']]);
    expectRecordClose(
      Object.fromEntries(production.recurrentClasses[0]!.stationaryDistribution.map((entry) => [entry.stateId, entry.probability])),
      stationaryAB
    );
    expectRecordClose(
      Object.fromEntries(production.recurrentClasses[1]!.stationaryDistribution.map((entry) => [entry.stateId, entry.probability])),
      stationaryC
    );
    expect(production.recurrentClasses[0]!.entryProbability).toBeCloseTo(alphaAB, 12);
    expect(production.recurrentClasses[1]!.entryProbability).toBeCloseTo(alphaC, 12);
    expectRecordClose(
      Object.fromEntries(production.cesaroLongRunOccupancy.map((entry) => [entry.stateId, entry.probability])),
      oracleCesaro
    );
  });
});
