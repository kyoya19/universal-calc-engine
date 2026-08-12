import { describe, expect, it } from 'vitest';
import { DefinitionModel, StateId, evaluateProbabilitySpec, isTerminalState } from '../src/model';
import {
  FiniteHiddenStateObservationRequest,
  FiniteHiddenStateObservationResult,
  FiniteHiddenStateObservationSuccess,
  HiddenObservationKernelEntry,
  filterFiniteHiddenStateObservationSequence,
  finiteHiddenStateObservationResultToJson
} from '../src/hidden_state_observation';

function twoStateModel(): DefinitionModel {
  return {
    startState: 'a',
    states: [{ id: 'a' }, { id: 'b' }],
    transitions: [
      { from: 'a', to: 'a', probability: 0.8 },
      { from: 'a', to: 'b', probability: 0.2 },
      { from: 'b', to: 'a', probability: 0.3 },
      { from: 'b', to: 'b', probability: 0.7 }
    ]
  };
}

function splitTwoStateModel(): DefinitionModel {
  return {
    startState: 'a',
    states: [{ id: 'a' }, { id: 'b' }],
    transitions: [
      { from: 'a', to: 'a', probability: 0.4 },
      { from: 'a', to: 'a', probability: 0.4 },
      { from: 'a', to: 'b', probability: 0.2 },
      { from: 'b', to: 'a', probability: 0.3 },
      { from: 'b', to: 'b', probability: 0.7 }
    ]
  };
}

function kernel(): HiddenObservationKernelEntry[] {
  return [
    { stateId: 'a', symbol: 'red', probability: 0.9 },
    { stateId: 'a', symbol: 'blue', probability: 0.1 },
    { stateId: 'b', symbol: 'red', probability: 0.2 },
    { stateId: 'b', symbol: 'blue', probability: 0.8 }
  ];
}

function request(
  observations: string[] = ['red', 'blue', 'red']
): FiniteHiddenStateObservationRequest {
  return {
    initialDistribution: [
      { stateId: 'a', probability: 0.6 },
      { stateId: 'b', probability: 0.4 }
    ],
    alphabet: ['red', 'blue'],
    kernel: kernel(),
    observations
  };
}

function requireSuccess(
  result: FiniteHiddenStateObservationResult
): FiniteHiddenStateObservationSuccess {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(`${result.failure.code}: ${result.failure.message}`);
  return result;
}

function probabilityFromInitial(
  requestValue: FiniteHiddenStateObservationRequest,
  stateId: StateId
): number {
  return requestValue.initialDistribution.find((entry) => entry.stateId === stateId)?.probability ?? 0;
}

function emissionProbability(
  requestValue: FiniteHiddenStateObservationRequest,
  stateId: StateId,
  symbol: string
): number {
  return requestValue.kernel.find(
    (entry) => entry.stateId === stateId && entry.symbol === symbol
  )?.probability ?? 0;
}

function independentTransitionProbability(
  model: DefinitionModel,
  from: StateId,
  to: StateId
): number {
  const source = model.states.find((state) => state.id === from);
  if (source !== undefined && isTerminalState(source)) return from === to ? 1 : 0;
  return model.transitions
    .filter((transition) => transition.from === from && transition.to === to)
    .reduce((sum, transition) => sum + evaluateProbabilitySpec(transition.probability), 0);
}

type EnumerationPrefix = {
  prefixProbability: number;
  filteredByState: Map<StateId, number>;
  evidenceProbability: number;
};

function enumerateHiddenPathsForPrefix(
  model: DefinitionModel,
  requestValue: FiniteHiddenStateObservationRequest,
  prefixLength: number,
  previousPrefixProbability: number
): EnumerationPrefix {
  const stateIds = model.states.map((state) => state.id);
  const endMass = new Map<StateId, number>();
  for (const stateId of stateIds) endMass.set(stateId, 0);
  let prefixProbability = 0;

  const visit = (path: StateId[]): void => {
    if (path.length === prefixLength) {
      let probability = probabilityFromInitial(requestValue, path[0]!);
      probability *= emissionProbability(requestValue, path[0]!, requestValue.observations[0]!);
      for (let step = 1; step < path.length; step += 1) {
        probability *= independentTransitionProbability(model, path[step - 1]!, path[step]!);
        probability *= emissionProbability(
          requestValue,
          path[step]!,
          requestValue.observations[step]!
        );
      }
      prefixProbability += probability;
      const last = path[path.length - 1]!;
      endMass.set(last, (endMass.get(last) ?? 0) + probability);
      return;
    }
    for (const stateId of stateIds) visit([...path, stateId]);
  };

  visit([]);
  const filteredByState = new Map<StateId, number>();
  for (const stateId of stateIds) {
    filteredByState.set(
      stateId,
      prefixProbability === 0 ? 0 : (endMass.get(stateId) ?? 0) / prefixProbability
    );
  }
  return {
    prefixProbability,
    filteredByState,
    evidenceProbability: previousPrefixProbability === 0
      ? 0
      : prefixProbability / previousPrefixProbability
  };
}

function pathEnumerationOracle(
  model: DefinitionModel,
  requestValue: FiniteHiddenStateObservationRequest
): EnumerationPrefix[] {
  const prefixes: EnumerationPrefix[] = [];
  let previousPrefixProbability = 1;
  for (let length = 1; length <= requestValue.observations.length; length += 1) {
    const prefix = enumerateHiddenPathsForPrefix(
      model,
      requestValue,
      length,
      previousPrefixProbability
    );
    prefixes.push(prefix);
    previousPrefixProbability = prefix.prefixProbability;
  }
  return prefixes;
}

type DenseOracleStep = {
  predictive: Map<StateId, number>;
  filtered: Map<StateId, number>;
  evidenceProbability: number;
};

function denseForwardOracle(
  model: DefinitionModel,
  requestValue: FiniteHiddenStateObservationRequest
): DenseOracleStep[] {
  const stateIds = model.states.map((state) => state.id).sort();
  const index = new Map(stateIds.map((stateId, stateIndex) => [stateId, stateIndex]));
  const transition = stateIds.map(() => stateIds.map(() => 0));

  for (const fromState of model.states) {
    const from = index.get(fromState.id)!;
    if (isTerminalState(fromState)) {
      transition[from]![from] = 1;
      continue;
    }
    for (const edge of model.transitions.filter((candidate) => candidate.from === fromState.id)) {
      const to = index.get(edge.to)!;
      transition[from]![to] = transition[from]![to]! + evaluateProbabilitySpec(edge.probability);
    }
  }

  let filtered = stateIds.map((stateId) => probabilityFromInitial(requestValue, stateId));
  const steps: DenseOracleStep[] = [];
  for (let step = 0; step < requestValue.observations.length; step += 1) {
    let predictive = [...filtered];
    if (step > 0) {
      predictive = stateIds.map(() => 0);
      for (let from = 0; from < stateIds.length; from += 1) {
        for (let to = 0; to < stateIds.length; to += 1) {
          predictive[to] = predictive[to]! + filtered[from]! * transition[from]![to]!;
        }
      }
    }

    const symbol = requestValue.observations[step]!;
    const weighted = stateIds.map(
      (stateId, stateIndex) => predictive[stateIndex]! * emissionProbability(requestValue, stateId, symbol)
    );
    const evidenceProbability = weighted.reduce((sum, value) => sum + value, 0);
    filtered = evidenceProbability === 0
      ? stateIds.map(() => 0)
      : weighted.map((value) => value / evidenceProbability);

    steps.push({
      predictive: new Map(stateIds.map((stateId, stateIndex) => [stateId, predictive[stateIndex]!])),
      filtered: new Map(stateIds.map((stateId, stateIndex) => [stateId, filtered[stateIndex]!])),
      evidenceProbability
    });
  }
  return steps;
}

function expectDistributionClose(
  actual: Array<{ stateId: string; probability: number }> | null,
  expected: Map<string, number>,
  digits = 12
): void {
  expect(actual).not.toBeNull();
  for (const entry of actual ?? []) {
    expect(entry.probability).toBeCloseTo(expected.get(entry.stateId) ?? 0, digits);
  }
}

function numericalView(result: FiniteHiddenStateObservationSuccess): unknown {
  return {
    possible: result.possible,
    steps: result.steps.map((step) => ({
      predictiveDistribution: step.predictiveDistribution,
      evidenceProbability: step.evidenceProbability,
      filteredDistribution: step.filteredDistribution
    })),
    finalFilteredDistribution: result.finalFilteredDistribution,
    logLikelihood: result.logLikelihood,
    sequenceProbability: result.sequenceProbability
  };
}

describe('Candidate C finite hidden-state observation foundation', () => {
  it('matches an independently enumerated hidden-path oracle for likelihood and filtered state mass', () => {
    const model = twoStateModel();
    const input = request();
    const oracle = pathEnumerationOracle(model, input);
    const result = requireSuccess(filterFiniteHiddenStateObservationSequence(model, input));

    expect(result.possible).toBe(true);
    expect(result.steps).toHaveLength(input.observations.length);
    for (let step = 0; step < oracle.length; step += 1) {
      expect(result.steps[step]!.evidenceProbability).toBeCloseTo(
        oracle[step]!.evidenceProbability,
        12
      );
      expectDistributionClose(
        result.steps[step]!.filteredDistribution,
        oracle[step]!.filteredByState
      );
    }
    const fullProbability = oracle[oracle.length - 1]!.prefixProbability;
    expect(result.logLikelihood).toBeCloseTo(Math.log(fullProbability), 12);
    expect(result.sequenceProbability).toBeCloseTo(fullProbability, 12);
  });

  it('matches an independently built dense transition/emission forward oracle', () => {
    const model = twoStateModel();
    const input = request();
    const oracle = denseForwardOracle(model, input);
    const result = requireSuccess(filterFiniteHiddenStateObservationSequence(model, input));

    for (let step = 0; step < oracle.length; step += 1) {
      expectDistributionClose(
        result.steps[step]!.predictiveDistribution,
        oracle[step]!.predictive
      );
      expectDistributionClose(
        result.steps[step]!.filteredDistribution,
        oracle[step]!.filtered
      );
      expect(result.steps[step]!.evidenceProbability).toBeCloseTo(
        oracle[step]!.evidenceProbability,
        12
      );
    }
  });

  it('emits from X0 before the first transition and then transitions before later emissions', () => {
    const model: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }, { id: 'b' }],
      transitions: [
        { from: 'a', to: 'b', probability: 1 },
        { from: 'b', to: 'b', probability: 1 }
      ]
    };
    const result = requireSuccess(
      filterFiniteHiddenStateObservationSequence(model, {
        initialDistribution: [{ stateId: 'a', probability: 1 }],
        alphabet: ['red', 'blue'],
        kernel: [
          { stateId: 'a', symbol: 'red', probability: 1 },
          { stateId: 'b', symbol: 'blue', probability: 1 }
        ],
        observations: ['red', 'blue']
      })
    );

    expect(result.possible).toBe(true);
    expect(result.steps[0]!.filteredDistribution).toEqual([
      { stateId: 'a', probability: 1 },
      { stateId: 'b', probability: 0 }
    ]);
    expect(result.steps[1]!.predictiveDistribution).toEqual([
      { stateId: 'a', probability: 0 },
      { stateId: 'b', probability: 1 }
    ]);
    expect(result.steps[1]!.filteredDistribution).toEqual([
      { stateId: 'a', probability: 0 },
      { stateId: 'b', probability: 1 }
    ]);
  });

  it('supports partial/coarsened observations and leaves belief at the predictive distribution when emissions are uninformative', () => {
    const input: FiniteHiddenStateObservationRequest = {
      initialDistribution: [
        { stateId: 'a', probability: 0.6 },
        { stateId: 'b', probability: 0.4 }
      ],
      alphabet: ['seen', 'other'],
      kernel: [
        { stateId: 'a', symbol: 'seen', probability: 0.5 },
        { stateId: 'a', symbol: 'other', probability: 0.5 },
        { stateId: 'b', symbol: 'seen', probability: 0.5 },
        { stateId: 'b', symbol: 'other', probability: 0.5 }
      ],
      observations: ['seen', 'other']
    };
    const result = requireSuccess(filterFiniteHiddenStateObservationSequence(twoStateModel(), input));
    for (const step of result.steps) {
      expect(step.filteredDistribution).toEqual(step.predictiveDistribution);
    }
  });

  it('supports a known noisy observation kernel without claiming parameter posterior inference', () => {
    const result = requireSuccess(filterFiniteHiddenStateObservationSequence(twoStateModel(), request()));
    expect(result.diagnostics.method).toBe('scaled_forward_filtering_known_observation_kernel');
    expect(result.diagnostics.simulationUsed).toBe(false);
    expect(result.diagnostics.inputNormalizationApplied).toBe(false);
    expect(result.diagnostics.posteriorNormalizationApplied).toBe(true);
    expect(result.diagnostics.globalModelIdentificationClaimed).toBe(false);
    expect(result.diagnostics.parameterPosteriorComputed).toBe(false);
  });

  it('classifies a mathematically impossible observation prefix as a successful analytical result, not request failure', () => {
    const result = requireSuccess(
      filterFiniteHiddenStateObservationSequence(twoStateModel(), {
        initialDistribution: [{ stateId: 'a', probability: 1 }],
        alphabet: ['red', 'blue'],
        kernel: [
          { stateId: 'a', symbol: 'red', probability: 1 },
          { stateId: 'b', symbol: 'red', probability: 1 }
        ],
        observations: ['blue', 'red']
      })
    );

    expect(result.possible).toBe(false);
    expect(result.steps).toHaveLength(1);
    expect(result.steps[0]!.filteredDistribution).toBeNull();
    expect(result.logLikelihood).toBeNull();
    expect(result.sequenceProbability).toBe(0);
    expect(result.finalFilteredDistribution).toBeNull();
    expect(result.diagnostics.impossibleAtStep).toBe(0);
    expect(result.diagnostics.observationsProcessed).toBe(1);
  });

  it('distinguishes representational probability underflow from mathematical impossibility', () => {
    const model: DefinitionModel = {
      startState: 's',
      states: [{ id: 's' }],
      transitions: [{ from: 's', to: 's', probability: 1 }]
    };
    const result = requireSuccess(
      filterFiniteHiddenStateObservationSequence(model, {
        initialDistribution: [{ stateId: 's', probability: 1 }],
        alphabet: ['rare', 'common'],
        kernel: [
          { stateId: 's', symbol: 'rare', probability: 0.5 },
          { stateId: 's', symbol: 'common', probability: 0.5 }
        ],
        observations: Array.from({ length: 2000 }, () => 'rare')
      })
    );

    expect(result.possible).toBe(true);
    expect(result.logLikelihood).not.toBeNull();
    expect(result.logLikelihood!).toBeLessThan(-1000);
    expect(result.sequenceProbability).toBeNull();
    expect(result.diagnostics.sequenceProbabilityUnderflowed).toBe(true);
    expect(result.diagnostics.impossibleAtStep).toBeNull();
  });

  it('uses implicit terminal self-retention during prediction', () => {
    const model: DefinitionModel = {
      startState: 'n',
      states: [{ id: 'n' }, { id: 't', terminal: true }],
      transitions: [{ from: 'n', to: 't', probability: 1 }]
    };
    const result = requireSuccess(
      filterFiniteHiddenStateObservationSequence(model, {
        initialDistribution: [
          { stateId: 'n', probability: 0.5 },
          { stateId: 't', probability: 0.5 }
        ],
        alphabet: ['x'],
        kernel: [
          { stateId: 'n', symbol: 'x', probability: 1 },
          { stateId: 't', symbol: 'x', probability: 1 }
        ],
        observations: ['x', 'x', 'x']
      })
    );

    expect(result.steps[1]!.predictiveDistribution).toEqual([
      { stateId: 'n', probability: 0 },
      { stateId: 't', probability: 1 }
    ]);
    expect(result.steps[2]!.predictiveDistribution).toEqual([
      { stateId: 'n', probability: 0 },
      { stateId: 't', probability: 1 }
    ]);
  });

  it('is invariant to state, transition, alphabet and kernel entry ordering', () => {
    const base = requireSuccess(filterFiniteHiddenStateObservationSequence(twoStateModel(), request()));
    const source = twoStateModel();
    const permutedModel: DefinitionModel = {
      ...source,
      states: [...source.states].reverse(),
      transitions: [...source.transitions].reverse()
    };
    const permutedRequest = request();
    permutedRequest.alphabet = [...permutedRequest.alphabet].reverse();
    permutedRequest.kernel = [...permutedRequest.kernel].reverse();
    permutedRequest.initialDistribution = [...permutedRequest.initialDistribution].reverse();
    const permuted = requireSuccess(
      filterFiniteHiddenStateObservationSequence(permutedModel, permutedRequest)
    );

    expect(numericalView(permuted)).toEqual(numericalView(base));
  });

  it('is invariant under a bijective observation-symbol renaming', () => {
    const base = requireSuccess(filterFiniteHiddenStateObservationSequence(twoStateModel(), request()));
    const renamed = request(['R', 'B', 'R']);
    renamed.alphabet = ['R', 'B'];
    renamed.kernel = kernel().map((entry) => ({
      ...entry,
      symbol: entry.symbol === 'red' ? 'R' : 'B'
    }));
    const result = requireSuccess(
      filterFiniteHiddenStateObservationSequence(twoStateModel(), renamed)
    );

    expect(numericalView(result)).toEqual(numericalView(base));
  });

  it('treats split parallel transitions as equivalent to their aggregate probability', () => {
    const aggregate = requireSuccess(
      filterFiniteHiddenStateObservationSequence(twoStateModel(), request())
    );
    const split = requireSuccess(
      filterFiniteHiddenStateObservationSequence(splitTwoStateModel(), request())
    );
    expect(numericalView(split)).toEqual(numericalView(aggregate));
  });

  it('rejects malformed initial distributions, alphabets, kernels and observation sequences without silent normalization', () => {
    const model = twoStateModel();

    const initial = filterFiniteHiddenStateObservationSequence(model, {
      ...request(),
      initialDistribution: [{ stateId: 'a', probability: 0.9 }]
    });
    expect(initial.ok).toBe(false);
    if (!initial.ok) expect(initial.failure.code).toBe('initial_probability_total');

    const duplicateAlphabet = filterFiniteHiddenStateObservationSequence(model, {
      ...request(),
      alphabet: ['red', 'red']
    });
    expect(duplicateAlphabet.ok).toBe(false);
    if (!duplicateAlphabet.ok) expect(duplicateAlphabet.failure.code).toBe('duplicate_observation_symbol');

    const badKernelTotal = filterFiniteHiddenStateObservationSequence(model, {
      ...request(),
      kernel: [
        { stateId: 'a', symbol: 'red', probability: 0.8 },
        { stateId: 'a', symbol: 'blue', probability: 0.1 },
        { stateId: 'b', symbol: 'red', probability: 0.2 },
        { stateId: 'b', symbol: 'blue', probability: 0.8 }
      ]
    });
    expect(badKernelTotal.ok).toBe(false);
    if (!badKernelTotal.ok) expect(badKernelTotal.failure.code).toBe('kernel_row_total');

    const duplicateKernel = filterFiniteHiddenStateObservationSequence(model, {
      ...request(),
      kernel: [...kernel(), { stateId: 'a', symbol: 'red', probability: 0 }]
    });
    expect(duplicateKernel.ok).toBe(false);
    if (!duplicateKernel.ok) expect(duplicateKernel.failure.code).toBe('duplicate_kernel_entry');

    const unknownSymbol = filterFiniteHiddenStateObservationSequence(model, {
      ...request(),
      observations: ['green']
    });
    expect(unknownSymbol.ok).toBe(false);
    if (!unknownSymbol.ok) expect(unknownSymbol.failure.code).toBe('unknown_observation_symbol');

    const emptySequence = filterFiniteHiddenStateObservationSequence(model, {
      ...request(),
      observations: []
    });
    expect(emptySequence.ok).toBe(false);
    if (!emptySequence.ok) expect(emptySequence.failure.code).toBe('invalid_observation_sequence');
  });

  it('rejects unknown kernel states/symbols, invalid probabilities and invalid models explicitly', () => {
    const unknownState = filterFiniteHiddenStateObservationSequence(twoStateModel(), {
      ...request(),
      kernel: [...kernel(), { stateId: 'missing', symbol: 'red', probability: 0 }]
    });
    expect(unknownState.ok).toBe(false);
    if (!unknownState.ok) expect(unknownState.failure.code).toBe('unknown_kernel_state');

    const unknownKernelSymbol = filterFiniteHiddenStateObservationSequence(twoStateModel(), {
      ...request(),
      kernel: [...kernel(), { stateId: 'a', symbol: 'green', probability: 0 }]
    });
    expect(unknownKernelSymbol.ok).toBe(false);
    if (!unknownKernelSymbol.ok) expect(unknownKernelSymbol.failure.code).toBe('unknown_kernel_symbol');

    const invalidProbability = filterFiniteHiddenStateObservationSequence(twoStateModel(), {
      ...request(),
      kernel: kernel().map((entry, index) => index === 0 ? { ...entry, probability: Number.NaN } : entry)
    });
    expect(invalidProbability.ok).toBe(false);
    if (!invalidProbability.ok) expect(invalidProbability.failure.code).toBe('invalid_kernel_probability');

    const invalidModel: DefinitionModel = {
      startState: 'a',
      states: [{ id: 'a' }],
      transitions: []
    };
    const modelResult = filterFiniteHiddenStateObservationSequence(invalidModel, {
      initialDistribution: [{ stateId: 'a', probability: 1 }],
      alphabet: ['x'],
      kernel: [{ stateId: 'a', symbol: 'x', probability: 1 }],
      observations: ['x']
    });
    expect(modelResult.ok).toBe(false);
    if (!modelResult.ok) expect(modelResult.failure.code).toBe('invalid_model');
  });

  it('enforces explicit observation resource limits and option validation', () => {
    const limited = filterFiniteHiddenStateObservationSequence(
      twoStateModel(),
      request(),
      { maxObservations: 2 }
    );
    expect(limited.ok).toBe(false);
    if (!limited.ok) expect(limited.failure.code).toBe('observation_sequence_exceeds_limit');

    const badTolerance = filterFiniteHiddenStateObservationSequence(
      twoStateModel(),
      request(),
      { probabilityTolerance: 0 }
    );
    expect(badTolerance.ok).toBe(false);
    if (!badTolerance.ok) expect(badTolerance.failure.code).toBe('invalid_options');
  });

  it('serializes deterministically and rejects forged non-finite analytical results', () => {
    const result = requireSuccess(filterFiniteHiddenStateObservationSequence(twoStateModel(), request()));
    expect(finiteHiddenStateObservationResultToJson(result)).toBe(
      finiteHiddenStateObservationResultToJson(result)
    );

    const forged = structuredClone(result) as FiniteHiddenStateObservationSuccess;
    forged.steps[0]!.evidenceProbability = Number.POSITIVE_INFINITY;
    expect(() => finiteHiddenStateObservationResultToJson(forged)).toThrow(/non-finite numeric value/);
  });
});
