import { describe, expect, it } from 'vitest';
import { DefinitionModel, StateId } from '../src/model';
import {
  FiniteFirstPassageResult,
  FiniteFirstPassageStep,
  FiniteFirstPassageSuccess,
  analyzeFiniteHorizonFirstPassage,
  finiteFirstPassageResultToJson
} from '../src/first_passage';
import { propagateFiniteHorizonStateDistribution } from '../src/state_distribution';

function requireSuccess(result: FiniteFirstPassageResult): FiniteFirstPassageSuccess {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(`${result.failure.code}: ${result.failure.message}`);
  return result;
}

function scalarProbability(value: DefinitionModel['transitions'][number]['probability']): number {
  return typeof value === 'number' ? value : value.value;
}

function sortedStateIds(model: DefinitionModel): StateId[] {
  return model.states
    .map((state) => state.id)
    .sort((left, right) => (left < right ? -1 : left > right ? 1 : 0));
}

type OracleStep = {
  step: number;
  firstHitProbability: number;
  cumulativeHitProbability: number;
  notYetHitProbability: number;
  firstHitByTarget: Record<StateId, number>;
};

function emptyTargetRecord(targetStates: StateId[]): Record<StateId, number> {
  return Object.fromEntries([...targetStates].sort().map((stateId) => [stateId, 0]));
}

function pathEnumerationOracle(
  model: DefinitionModel,
  initialDistribution: Array<{ stateId: StateId; probability: number }>,
  targetStates: StateId[],
  horizon: number
): OracleStep[] {
  const targets = new Set(targetStates);
  const sortedTargets = [...targets].sort();
  const terminal = new Set(
    model.states.filter((state) => state.terminal === true).map((state) => state.id)
  );
  let active: Array<{ stateId: StateId; probability: number }> = [];
  let cumulative = 0;
  const steps: OracleStep[] = [];

  for (let step = 0; step <= horizon; step += 1) {
    const hits = emptyTargetRecord(sortedTargets);

    if (step === 0) {
      for (const entry of initialDistribution) {
        if (targets.has(entry.stateId)) {
          hits[entry.stateId] = (hits[entry.stateId] ?? 0) + entry.probability;
        } else {
          active.push({ ...entry });
        }
      }
    } else {
      const next: Array<{ stateId: StateId; probability: number }> = [];
      for (const path of active) {
        if (terminal.has(path.stateId)) {
          next.push(path);
          continue;
        }
        for (const edge of model.transitions.filter((candidate) => candidate.from === path.stateId)) {
          const probability = path.probability * scalarProbability(edge.probability);
          if (targets.has(edge.to)) {
            hits[edge.to] = (hits[edge.to] ?? 0) + probability;
          } else {
            next.push({ stateId: edge.to, probability });
          }
        }
      }
      active = next;
    }

    const firstHitProbability = Object.values(hits).reduce((sum, value) => sum + value, 0);
    cumulative += firstHitProbability;
    const notYetHitProbability = active.reduce((sum, path) => sum + path.probability, 0);
    steps.push({
      step,
      firstHitProbability,
      cumulativeHitProbability: cumulative,
      notYetHitProbability,
      firstHitByTarget: hits
    });
  }

  return steps;
}

function denseAbsorbingOracle(
  model: DefinitionModel,
  initialDistribution: Array<{ stateId: StateId; probability: number }>,
  targetStates: StateId[],
  horizon: number
): OracleStep[] {
  const stateIds = sortedStateIds(model);
  const targets = new Set(targetStates);
  const sortedTargets = [...targets].sort();
  const indexByState = new Map(stateIds.map((stateId, index) => [stateId, index]));
  const matrix = stateIds.map(() => stateIds.map(() => 0));

  for (const state of model.states) {
    const from = indexByState.get(state.id);
    if (from === undefined) throw new Error('oracle state index missing');
    if (targets.has(state.id) || state.terminal === true) {
      matrix[from]![from] = 1;
      continue;
    }
    for (const edge of model.transitions.filter((candidate) => candidate.from === state.id)) {
      const to = indexByState.get(edge.to);
      if (to === undefined) throw new Error('oracle transition target missing');
      matrix[from]![to] = matrix[from]![to]! + scalarProbability(edge.probability);
    }
  }

  let vector = stateIds.map(
    (stateId) => initialDistribution.find((entry) => entry.stateId === stateId)?.probability ?? 0
  );
  let previousTargetMass = Object.fromEntries(
    sortedTargets.map((stateId) => [stateId, vector[indexByState.get(stateId)!]!])
  ) as Record<StateId, number>;
  const steps: OracleStep[] = [];

  for (let step = 0; step <= horizon; step += 1) {
    if (step > 0) {
      const next = stateIds.map(() => 0);
      for (let from = 0; from < stateIds.length; from += 1) {
        for (let to = 0; to < stateIds.length; to += 1) {
          next[to] = next[to]! + vector[from]! * matrix[from]![to]!;
        }
      }
      vector = next;
    }

    const currentTargetMass = Object.fromEntries(
      sortedTargets.map((stateId) => [stateId, vector[indexByState.get(stateId)!]!])
    ) as Record<StateId, number>;
    const hits = Object.fromEntries(
      sortedTargets.map((stateId) => [
        stateId,
        step === 0
          ? currentTargetMass[stateId]!
          : currentTargetMass[stateId]! - previousTargetMass[stateId]!
      ])
    ) as Record<StateId, number>;
    const cumulativeHitProbability = Object.values(currentTargetMass).reduce(
      (sum, value) => sum + value,
      0
    );
    const firstHitProbability = Object.values(hits).reduce((sum, value) => sum + value, 0);
    const notYetHitProbability = stateIds
      .filter((stateId) => !targets.has(stateId))
      .reduce((sum, stateId) => sum + vector[indexByState.get(stateId)!]!, 0);

    steps.push({
      step,
      firstHitProbability,
      cumulativeHitProbability,
      notYetHitProbability,
      firstHitByTarget: hits
    });
    previousTargetMass = currentTargetMass;
  }

  return steps;
}

function targetRecord(step: FiniteFirstPassageStep): Record<StateId, number> {
  return Object.fromEntries(step.firstHitByTarget.map((entry) => [entry.stateId, entry.probability]));
}

function expectStepsClose(actual: FiniteFirstPassageStep[], expected: OracleStep[]): void {
  expect(actual).toHaveLength(expected.length);
  for (let index = 0; index < expected.length; index += 1) {
    const actualStep = actual[index]!;
    const expectedStep = expected[index]!;
    expect(actualStep.step).toBe(expectedStep.step);
    expect(actualStep.firstHitProbability).toBeCloseTo(expectedStep.firstHitProbability, 12);
    expect(actualStep.cumulativeHitProbability).toBeCloseTo(
      expectedStep.cumulativeHitProbability,
      12
    );
    expect(actualStep.notYetHitProbability).toBeCloseTo(expectedStep.notYetHitProbability, 12);
    const actualTargets = targetRecord(actualStep);
    expect(Object.keys(actualTargets)).toEqual(Object.keys(expectedStep.firstHitByTarget));
    for (const [stateId, probability] of Object.entries(expectedStep.firstHitByTarget)) {
      expect(actualTargets[stateId]).toBeCloseTo(probability, 12);
    }
  }
}

const recurrentMultiTargetModel: DefinitionModel = {
  startState: 's',
  states: [
    { id: 's' },
    { id: 'a' },
    { id: 'b', terminal: true },
    { id: 'dead', terminal: true }
  ],
  transitions: [
    { from: 's', to: 's', probability: 0.4 },
    { from: 's', to: 'a', probability: 0.3 },
    { from: 's', to: 'b', probability: 0.2 },
    { from: 's', to: 'dead', probability: 0.1 },
    { from: 'a', to: 's', probability: 1 }
  ]
};

describe('Candidate B finite first-passage / absorption-time foundation', () => {
  it('matches complete finite path enumeration on a recurrent multi-target graph', () => {
    const initialDistribution = [{ stateId: 's', probability: 1 }];
    const actual = requireSuccess(
      analyzeFiniteHorizonFirstPassage(recurrentMultiTargetModel, {
        initialDistribution,
        targetStates: ['a', 'b'],
        horizon: 4
      })
    );
    const oracle = pathEnumerationOracle(
      recurrentMultiTargetModel,
      initialDistribution,
      ['a', 'b'],
      4
    );

    expectStepsClose(actual.steps, oracle);
    expect(actual.diagnostics.method).toBe('sparse_survivor_boundary_flux');
    expect(actual.diagnostics.simulationUsed).toBe(false);
    expect(actual.diagnostics.infiniteHorizonClaimed).toBe(false);
  });

  it('matches an independently constructed dense absorbing-transform matrix oracle', () => {
    const model: DefinitionModel = {
      startState: 'x',
      states: [{ id: 'x' }, { id: 'y' }, { id: 'z' }],
      transitions: [
        { from: 'x', to: 'x', probability: 0.25 },
        { from: 'x', to: 'y', probability: 0.5 },
        { from: 'x', to: 'z', probability: 0.25 },
        { from: 'y', to: 'x', probability: 1 },
        { from: 'z', to: 'x', probability: 1 }
      ]
    };
    const initialDistribution = [
      { stateId: 'x', probability: 0.8 },
      { stateId: 'y', probability: 0.2 }
    ];
    const actual = requireSuccess(
      analyzeFiniteHorizonFirstPassage(model, {
        initialDistribution,
        targetStates: ['z', 'y'],
        horizon: 5
      })
    );
    const oracle = denseAbsorbingOracle(model, initialDistribution, ['z', 'y'], 5);

    expectStepsClose(actual.steps, oracle);
    expect(actual.targetStates).toEqual(['y', 'z']);
  });

  it('produces the analytically known geometric first-hit distribution', () => {
    const model: DefinitionModel = {
      startState: 'loop',
      states: [{ id: 'loop' }, { id: 'hit', terminal: true }],
      transitions: [
        { from: 'loop', to: 'loop', probability: 0.5 },
        { from: 'loop', to: 'hit', probability: 0.5 }
      ]
    };
    const result = requireSuccess(
      analyzeFiniteHorizonFirstPassage(model, {
        initialDistribution: [{ stateId: 'loop', probability: 1 }],
        targetStates: ['hit'],
        horizon: 4
      })
    );

    expect(result.steps.map((step) => step.firstHitProbability)).toEqual([
      0,
      0.5,
      0.25,
      0.125,
      0.0625
    ]);
    expect(result.hitProbabilityByHorizon).toBe(0.9375);
    expect(result.notHitProbabilityByHorizon).toBe(0.0625);
  });

  it('counts initial target mass as first passage at step zero', () => {
    const model: DefinitionModel = {
      startState: 's',
      states: [{ id: 's' }, { id: 'hit', terminal: true }],
      transitions: [{ from: 's', to: 'hit', probability: 1 }]
    };
    const result = requireSuccess(
      analyzeFiniteHorizonFirstPassage(model, {
        initialDistribution: [
          { stateId: 's', probability: 0.25 },
          { stateId: 'hit', probability: 0.75 }
        ],
        targetStates: ['hit'],
        horizon: 0
      })
    );

    expect(result.steps).toHaveLength(1);
    expect(result.steps[0]).toMatchObject({
      step: 0,
      firstHitProbability: 0.75,
      cumulativeHitProbability: 0.75,
      notYetHitProbability: 0.25
    });
    expect(result.diagnostics.firstPassageConvention).toBe('first_entry_includes_step_0');
  });

  it('keeps all later first-hit mass at zero when all initial mass is already in the target set', () => {
    const model: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }, { id: 'b' }],
      transitions: [
        { from: 'a', to: 'b', probability: 1 },
        { from: 'b', to: 'a', probability: 1 }
      ]
    };
    const result = requireSuccess(
      analyzeFiniteHorizonFirstPassage(model, {
        initialDistribution: [
          { stateId: 'a', probability: 0.4 },
          { stateId: 'b', probability: 0.6 }
        ],
        targetStates: ['a', 'b'],
        horizon: 3
      })
    );

    expect(result.steps.map((step) => step.firstHitProbability)).toEqual([1, 0, 0, 0]);
    expect(result.steps.map((step) => step.notYetHitProbability)).toEqual([0, 0, 0, 0]);
  });

  it('reports zero hit probability for an unreachable target and retains terminal non-target mass', () => {
    const model: DefinitionModel = {
      startState: 'dead',
      states: [{ id: 'dead', terminal: true }, { id: 'target', terminal: true }],
      transitions: []
    };
    const result = requireSuccess(
      analyzeFiniteHorizonFirstPassage(model, {
        initialDistribution: [{ stateId: 'dead', probability: 1 }],
        targetStates: ['target'],
        horizon: 5
      })
    );

    expect(result.steps.every((step) => step.firstHitProbability === 0)).toBe(true);
    expect(result.steps.every((step) => step.cumulativeHitProbability === 0)).toBe(true);
    expect(result.steps.every((step) => step.notYetHitProbability === 1)).toBe(true);
  });

  it('produces a point mass at the known first-entry step on a deterministic chain', () => {
    const model: DefinitionModel = {
      startState: 's0',
      states: [{ id: 's0' }, { id: 's1' }, { id: 's2', terminal: true }],
      transitions: [
        { from: 's0', to: 's1', probability: 1 },
        { from: 's1', to: 's2', probability: 1 }
      ]
    };
    const result = requireSuccess(
      analyzeFiniteHorizonFirstPassage(model, {
        initialDistribution: [{ stateId: 's0', probability: 1 }],
        targetStates: ['s2'],
        horizon: 3
      })
    );

    expect(result.steps.map((step) => step.firstHitProbability)).toEqual([0, 0, 1, 0]);
    expect(result.hitProbabilityByHorizon).toBe(1);
  });

  it('does not confuse later target occupancy or revisits with additional first hits', () => {
    const model: DefinitionModel = {
      startState: 'outside',
      states: [{ id: 'outside' }, { id: 'target' }],
      transitions: [
        { from: 'outside', to: 'target', probability: 1 },
        { from: 'target', to: 'outside', probability: 1 }
      ]
    };
    const result = requireSuccess(
      analyzeFiniteHorizonFirstPassage(model, {
        initialDistribution: [{ stateId: 'outside', probability: 1 }],
        targetStates: ['target'],
        horizon: 4
      })
    );

    expect(result.steps.map((step) => step.firstHitProbability)).toEqual([0, 1, 0, 0, 0]);
    expect(result.steps.map((step) => step.cumulativeHitProbability)).toEqual([0, 1, 1, 1, 1]);
  });

  it('preserves target-specific first-entry mass for multiple targets', () => {
    const model: DefinitionModel = {
      startState: 's',
      states: [{ id: 's' }, { id: 'mid' }, { id: 'a', terminal: true }, { id: 'b' }],
      transitions: [
        { from: 's', to: 'a', probability: 0.25 },
        { from: 's', to: 'mid', probability: 0.75 },
        { from: 'mid', to: 'b', probability: 1 },
        { from: 'b', to: 's', probability: 1 }
      ]
    };
    const result = requireSuccess(
      analyzeFiniteHorizonFirstPassage(model, {
        initialDistribution: [{ stateId: 's', probability: 1 }],
        targetStates: ['b', 'a'],
        horizon: 3
      })
    );

    expect(targetRecord(result.steps[1]!)).toEqual({ a: 0.25, b: 0 });
    expect(targetRecord(result.steps[2]!)).toEqual({ a: 0, b: 0.75 });
    expect(Object.fromEntries(result.firstHitByTargetTotals.map((entry) => [entry.stateId, entry.probability])))
      .toEqual({ a: 0.25, b: 0.75 });
  });

  it('treats a non-terminal target as first-entry absorbing only inside the analysis and does not mutate the model', () => {
    const model: DefinitionModel = {
      startState: 's',
      states: [{ id: 's' }, { id: 'target' }, { id: 'after', terminal: true }],
      transitions: [
        { from: 's', to: 'target', probability: 1 },
        { from: 'target', to: 'after', probability: 1 }
      ]
    };
    const snapshot = JSON.stringify(model);
    const result = requireSuccess(
      analyzeFiniteHorizonFirstPassage(model, {
        initialDistribution: [{ stateId: 's', probability: 1 }],
        targetStates: ['target'],
        horizon: 3
      })
    );

    expect(result.steps.map((step) => step.firstHitProbability)).toEqual([0, 1, 0, 0]);
    expect(JSON.stringify(model)).toBe(snapshot);
    expect(model.states.find((state) => state.id === 'target')?.terminal).not.toBe(true);
  });

  it('is invariant to state, transition, and target-list ordering', () => {
    const model: DefinitionModel = {
      startState: 's',
      states: [{ id: 's' }, { id: 'x' }, { id: 'a', terminal: true }, { id: 'b', terminal: true }],
      transitions: [
        { from: 's', to: 'x', probability: 0.5 },
        { from: 's', to: 'a', probability: 0.5 },
        { from: 'x', to: 'a', probability: 0.25 },
        { from: 'x', to: 'b', probability: 0.75 }
      ]
    };
    const reversed: DefinitionModel = {
      ...model,
      states: [...model.states].reverse(),
      transitions: [...model.transitions].reverse()
    };
    const request = {
      initialDistribution: [{ stateId: 's', probability: 1 }],
      targetStates: ['b', 'a'],
      horizon: 3
    };
    const left = requireSuccess(analyzeFiniteHorizonFirstPassage(model, request));
    const right = requireSuccess(
      analyzeFiniteHorizonFirstPassage(reversed, { ...request, targetStates: ['a', 'b'] })
    );

    expect(finiteFirstPassageResultToJson(left)).toBe(finiteFirstPassageResultToJson(right));
  });

  it('is invariant to splitting a transition into parallel transitions with the same aggregate probability', () => {
    const base: DefinitionModel = {
      startState: 's',
      states: [{ id: 's' }, { id: 'target', terminal: true }, { id: 'other', terminal: true }],
      transitions: [
        { from: 's', to: 'target', probability: 0.6 },
        { from: 's', to: 'other', probability: 0.4 }
      ]
    };
    const split: DefinitionModel = {
      ...base,
      transitions: [
        { from: 's', to: 'target', probability: 0.2 },
        { from: 's', to: 'target', probability: 0.4 },
        { from: 's', to: 'other', probability: 0.4 }
      ]
    };
    const request = {
      initialDistribution: [{ stateId: 's', probability: 1 }],
      targetStates: ['target'],
      horizon: 2
    };

    expect(finiteFirstPassageResultToJson(requireSuccess(analyzeFiniteHorizonFirstPassage(base, request))))
      .toBe(finiteFirstPassageResultToJson(requireSuccess(analyzeFiniteHorizonFirstPassage(split, request))));
  });

  it('agrees with Candidate A occupancy after an independently constructed absorbing transform', () => {
    const model: DefinitionModel = {
      startState: 's',
      states: [{ id: 's' }, { id: 'target' }],
      transitions: [
        { from: 's', to: 's', probability: 0.7 },
        { from: 's', to: 'target', probability: 0.3 },
        { from: 'target', to: 's', probability: 1 }
      ]
    };
    const firstPassage = requireSuccess(
      analyzeFiniteHorizonFirstPassage(model, {
        initialDistribution: [{ stateId: 's', probability: 1 }],
        targetStates: ['target'],
        horizon: 4
      })
    );
    const transformed: DefinitionModel = {
      startState: 's',
      states: [{ id: 's' }, { id: 'target', terminal: true }],
      transitions: [
        { from: 's', to: 's', probability: 0.7 },
        { from: 's', to: 'target', probability: 0.3 }
      ]
    };
    const occupancy = propagateFiniteHorizonStateDistribution(transformed, {
      initialDistribution: [{ stateId: 's', probability: 1 }],
      horizon: 4
    });
    expect(occupancy.ok).toBe(true);
    if (!occupancy.ok) throw new Error(occupancy.failure.message);

    for (let step = 0; step <= 4; step += 1) {
      const targetOccupancy = occupancy.trajectory[step]!.distribution.find(
        (entry) => entry.stateId === 'target'
      )!.probability;
      expect(firstPassage.steps[step]!.cumulativeHitProbability).toBeCloseTo(targetOccupancy, 12);
    }
  });

  it('rejects malformed, empty, unknown, and duplicate target-state declarations explicitly', () => {
    const model: DefinitionModel = {
      startState: 's',
      states: [{ id: 's' }, { id: 'target', terminal: true }],
      transitions: [{ from: 's', to: 'target', probability: 1 }]
    };
    const base = {
      initialDistribution: [{ stateId: 's', probability: 1 }],
      horizon: 1
    };

    const malformed = analyzeFiniteHorizonFirstPassage(model, {
      ...base,
      targetStates: null as unknown as StateId[]
    });
    const empty = analyzeFiniteHorizonFirstPassage(model, { ...base, targetStates: [] });
    const unknown = analyzeFiniteHorizonFirstPassage(model, { ...base, targetStates: ['missing'] });
    const duplicate = analyzeFiniteHorizonFirstPassage(model, {
      ...base,
      targetStates: ['target', 'target']
    });

    expect(malformed.ok ? null : malformed.failure.code).toBe('invalid_target_states');
    expect(empty.ok ? null : empty.failure.code).toBe('empty_target_states');
    expect(unknown.ok ? null : unknown.failure.code).toBe('unknown_target_state');
    expect(duplicate.ok ? null : duplicate.failure.code).toBe('duplicate_target_state');
  });

  it('preserves Candidate A initial-distribution validation semantics without silent normalization', () => {
    const model: DefinitionModel = {
      startState: 's',
      states: [{ id: 's' }, { id: 'target', terminal: true }],
      transitions: [{ from: 's', to: 'target', probability: 1 }]
    };
    const duplicate = analyzeFiniteHorizonFirstPassage(model, {
      initialDistribution: [
        { stateId: 's', probability: 0.5 },
        { stateId: 's', probability: 0.5 }
      ],
      targetStates: ['target'],
      horizon: 1
    });
    const unknown = analyzeFiniteHorizonFirstPassage(model, {
      initialDistribution: [{ stateId: 'missing', probability: 1 }],
      targetStates: ['target'],
      horizon: 1
    });
    const invalidProbability = analyzeFiniteHorizonFirstPassage(model, {
      initialDistribution: [{ stateId: 's', probability: 1.1 }],
      targetStates: ['target'],
      horizon: 1
    });
    const total = analyzeFiniteHorizonFirstPassage(model, {
      initialDistribution: [{ stateId: 's', probability: 0.9 }],
      targetStates: ['target'],
      horizon: 1
    });

    expect(duplicate.ok ? null : duplicate.failure.code).toBe('duplicate_initial_state');
    expect(unknown.ok ? null : unknown.failure.code).toBe('unknown_initial_state');
    expect(invalidProbability.ok ? null : invalidProbability.failure.code).toBe(
      'invalid_initial_probability'
    );
    expect(total.ok ? null : total.failure.code).toBe('initial_probability_total');
  });

  it('rejects invalid horizon/options and enforces the finite resource limit', () => {
    const model: DefinitionModel = {
      startState: 's',
      states: [{ id: 's' }, { id: 'target', terminal: true }],
      transitions: [{ from: 's', to: 'target', probability: 1 }]
    };
    const base = {
      initialDistribution: [{ stateId: 's', probability: 1 }],
      targetStates: ['target']
    };

    const negative = analyzeFiniteHorizonFirstPassage(model, { ...base, horizon: -1 });
    const fractional = analyzeFiniteHorizonFirstPassage(model, { ...base, horizon: 1.5 });
    const tooLarge = analyzeFiniteHorizonFirstPassage(
      model,
      { ...base, horizon: 3 },
      { maxHorizon: 2 }
    );
    const badTolerance = analyzeFiniteHorizonFirstPassage(
      model,
      { ...base, horizon: 1 },
      { probabilityTolerance: 0 }
    );

    expect(negative.ok ? null : negative.failure.code).toBe('invalid_horizon');
    expect(fractional.ok ? null : fractional.failure.code).toBe('invalid_horizon');
    expect(tooLarge.ok ? null : tooLarge.failure.code).toBe('horizon_exceeds_limit');
    expect(badTolerance.ok ? null : badTolerance.failure.code).toBe('invalid_options');
  });

  it('rejects an invalid DefinitionModel before analytical propagation', () => {
    const invalid: DefinitionModel = {
      startState: 's',
      states: [{ id: 's' }, { id: 'target', terminal: true }],
      transitions: [{ from: 's', to: 'target', probability: 0.5 }]
    };
    const result = analyzeFiniteHorizonFirstPassage(invalid, {
      initialDistribution: [{ stateId: 's', probability: 1 }],
      targetStates: ['target'],
      horizon: 1
    });

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error('expected failure');
    expect(result.failure.code).toBe('invalid_model');
    expect(result.validation?.valid).toBe(false);
  });

  it('ignores zero-probability target edges while retaining deterministic finite output', () => {
    const model: DefinitionModel = {
      startState: 's',
      states: [{ id: 's' }, { id: 'target', terminal: true }, { id: 'other', terminal: true }],
      transitions: [
        { from: 's', to: 'target', probability: 0 },
        { from: 's', to: 'other', probability: 1 }
      ]
    };
    const result = requireSuccess(
      analyzeFiniteHorizonFirstPassage(model, {
        initialDistribution: [{ stateId: 's', probability: 1 }],
        targetStates: ['target'],
        horizon: 2
      })
    );

    expect(result.hitProbabilityByHorizon).toBe(0);
    expect(result.notHitProbabilityByHorizon).toBe(1);
  });

  it('serializes deterministically with target IDs in string order', () => {
    const model: DefinitionModel = {
      startState: 's',
      states: [{ id: 's' }, { id: 'z', terminal: true }, { id: 'a', terminal: true }],
      transitions: [
        { from: 's', to: 'z', probability: 0.5 },
        { from: 's', to: 'a', probability: 0.5 }
      ]
    };
    const result = requireSuccess(
      analyzeFiniteHorizonFirstPassage(model, {
        initialDistribution: [{ stateId: 's', probability: 1 }],
        targetStates: ['z', 'a'],
        horizon: 1
      })
    );
    const serialized = finiteFirstPassageResultToJson(result);

    expect(result.targetStates).toEqual(['a', 'z']);
    expect(result.steps[0]!.firstHitByTarget.map((entry) => entry.stateId)).toEqual(['a', 'z']);
    expect(serialized).toBe(JSON.stringify(result));
  });

  it('rejects forged non-finite analytical results during serialization', () => {
    const forged = {
      ok: true,
      horizon: 0,
      targetStates: ['target'],
      steps: [{
        step: 0,
        firstHitProbability: Number.NaN,
        cumulativeHitProbability: 0,
        notYetHitProbability: 1,
        firstHitByTarget: [{ stateId: 'target', probability: 0 }]
      }],
      hitProbabilityByHorizon: 0,
      notHitProbabilityByHorizon: 1,
      firstHitByTargetTotals: [{ stateId: 'target', probability: 0 }],
      diagnostics: {
        method: 'sparse_survivor_boundary_flux',
        simulationUsed: false,
        numericRepresentation: 'javascript_number_float64',
        inputNormalizationApplied: false,
        firstPassageConvention: 'first_entry_includes_step_0',
        terminalSemantics: 'implicit_self_retention_for_non_target_terminals',
        targetSemantics: 'first_entry_stops_target_mass_without_mutating_source_model',
        probabilityTolerance: 1e-9,
        maxHorizon: 10000,
        horizon: 0,
        stepsReported: 1,
        transitionStepsEvaluated: 0,
        massChecks: 1,
        maxMassDeviation: 0,
        infiniteHorizonClaimed: false
      }
    } as FiniteFirstPassageResult;

    expect(() => finiteFirstPassageResultToJson(forged)).toThrow(/non-finite numeric value/);
  });
});
