import {
  DefinitionModel,
  StateId,
  evaluateProbabilitySpec,
  isTerminalState
} from './model';
import { ModelValidationResult, validateDefinitionModel } from './validation';

export type FiniteMarkovLongRunBehaviorRequest = {
  initialDistribution: Array<{
    stateId: StateId;
    probability: number;
  }>;
};

export type FiniteMarkovLongRunBehaviorOptions = {
  probabilityTolerance?: number;
  linearSolveTolerance?: number;
};

export type FiniteMarkovLongRunBehaviorFailureCode =
  | 'invalid_options'
  | 'invalid_model'
  | 'invalid_initial_distribution'
  | 'unknown_initial_state'
  | 'duplicate_initial_state'
  | 'invalid_initial_probability'
  | 'initial_probability_total'
  | 'structural_inconsistency'
  | 'stationary_solve_failure'
  | 'class_entry_solve_failure'
  | 'non_finite_analytical_result';

export type FiniteMarkovLongRunBehaviorFailure = {
  code: FiniteMarkovLongRunBehaviorFailureCode;
  message: string;
  path?: string;
  stateId?: StateId;
  actualTotal?: number;
  tolerance?: number;
};

export type FiniteMarkovLongRunBehaviorDiagnostics = {
  solverMethod: 'finite_scc_stationary_absorption_cesaro';
  simulationUsed: false;
  numericRepresentation: 'javascript_number_float64';
  normalizationApplied: false;
  roundoffClampingApplied: boolean;
  terminalSemantics: 'implicit_self_retention';
  graphEdgeConvention: 'strictly_positive_transition_probability';
  ordinaryPointwiseLimitComputed: false;
  probabilityTolerance: number;
  linearSolveTolerance: number;
  stateCount: number;
  communicatingClassCount: number;
  recurrentClassCount: number;
  transientStateCount: number;
  periodicRecurrentClassCount: number;
  maxTransitionRowDeviation: number;
  maxStationaryResidual: number;
  maxClassEntryResidual: number;
};

export type FiniteMarkovLongRunBehaviorSuccess = {
  ok: true;
  stateIds: StateId[];
  communicatingClasses: Array<{
    stateIds: StateId[];
    classification: 'closed_recurrent' | 'transient';
  }>;
  transientStateIds: StateId[];
  recurrentClasses: Array<{
    stateIds: StateId[];
    period: number;
    stationaryDistribution: Array<{
      stateId: StateId;
      probability: number;
    }>;
    entryProbability: number;
  }>;
  globalStationaryDistribution: {
    unique: boolean;
    basis: Array<{
      stateIds: StateId[];
      distribution: Array<{
        stateId: StateId;
        probability: number;
      }>;
    }>;
    distribution: Array<{
      stateId: StateId;
      probability: number;
    }> | null;
  };
  cesaroLongRunOccupancy: Array<{
    stateId: StateId;
    probability: number;
  }>;
  diagnostics: FiniteMarkovLongRunBehaviorDiagnostics;
};

export type FiniteMarkovLongRunBehaviorFailureResult = {
  ok: false;
  failure: FiniteMarkovLongRunBehaviorFailure;
  validation?: ModelValidationResult;
};

export type FiniteMarkovLongRunBehaviorResult =
  | FiniteMarkovLongRunBehaviorSuccess
  | FiniteMarkovLongRunBehaviorFailureResult;

const DEFAULT_PROBABILITY_TOLERANCE = 1e-9;
const DEFAULT_LINEAR_SOLVE_TOLERANCE = 1e-9;

type ResolvedOptions = {
  probabilityTolerance: number;
  linearSolveTolerance: number;
};

type TransitionMatrix = number[][];

type LinearSolution = {
  solution: number[];
  residual: number;
};

type StationarySolution = {
  probabilities: number[];
  residual: number;
  roundoffClamped: boolean;
};

type ClassEntrySolution = {
  probabilitiesByClass: number[][];
  maxResidual: number;
  roundoffClamped: boolean;
};

function compareStateIds(left: StateId, right: StateId): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function compareStateIdArrays(left: StateId[], right: StateId[]): number {
  const commonLength = Math.min(left.length, right.length);
  for (let index = 0; index < commonLength; index += 1) {
    const order = compareStateIds(left[index]!, right[index]!);
    if (order !== 0) return order;
  }
  return left.length - right.length;
}

function failure(
  code: FiniteMarkovLongRunBehaviorFailureCode,
  message: string,
  details: Omit<FiniteMarkovLongRunBehaviorFailure, 'code' | 'message'> = {}
): FiniteMarkovLongRunBehaviorFailureResult {
  return { ok: false, failure: { code, message, ...details } };
}

function resolveOptions(
  options: FiniteMarkovLongRunBehaviorOptions
): ResolvedOptions | FiniteMarkovLongRunBehaviorFailureResult {
  const probabilityTolerance = options.probabilityTolerance ?? DEFAULT_PROBABILITY_TOLERANCE;
  if (!Number.isFinite(probabilityTolerance) || probabilityTolerance <= 0) {
    return failure(
      'invalid_options',
      'probabilityTolerance must be a finite positive number',
      { path: 'options.probabilityTolerance' }
    );
  }

  const linearSolveTolerance = options.linearSolveTolerance ?? DEFAULT_LINEAR_SOLVE_TOLERANCE;
  if (!Number.isFinite(linearSolveTolerance) || linearSolveTolerance <= 0) {
    return failure(
      'invalid_options',
      'linearSolveTolerance must be a finite positive number',
      { path: 'options.linearSolveTolerance' }
    );
  }

  return { probabilityTolerance, linearSolveTolerance };
}

function isFailure(
  value: ResolvedOptions | FiniteMarkovLongRunBehaviorFailureResult
): value is FiniteMarkovLongRunBehaviorFailureResult {
  return 'ok' in value && value.ok === false;
}

function validateInitialDistribution(
  request: FiniteMarkovLongRunBehaviorRequest,
  stateIds: StateId[],
  tolerance: number
): number[] | FiniteMarkovLongRunBehaviorFailureResult {
  if (!Array.isArray(request.initialDistribution)) {
    return failure(
      'invalid_initial_distribution',
      'initialDistribution must be an array',
      { path: 'request.initialDistribution' }
    );
  }

  const indexByState = new Map(stateIds.map((stateId, index) => [stateId, index]));
  const seen = new Set<StateId>();
  const probabilities = stateIds.map(() => 0);
  let total = 0;

  for (let index = 0; index < request.initialDistribution.length; index += 1) {
    const entry = request.initialDistribution[index];
    if (entry === undefined || typeof entry.stateId !== 'string') {
      return failure(
        'invalid_initial_distribution',
        `initialDistribution[${index}].stateId must be a string`,
        { path: `request.initialDistribution[${index}].stateId` }
      );
    }
    const stateIndex = indexByState.get(entry.stateId);
    if (stateIndex === undefined) {
      return failure(
        'unknown_initial_state',
        `Unknown state in initialDistribution: ${entry.stateId}`,
        { path: `request.initialDistribution[${index}].stateId`, stateId: entry.stateId }
      );
    }
    if (seen.has(entry.stateId)) {
      return failure(
        'duplicate_initial_state',
        `Duplicate state in initialDistribution: ${entry.stateId}`,
        { path: `request.initialDistribution[${index}].stateId`, stateId: entry.stateId }
      );
    }
    seen.add(entry.stateId);

    const probability = entry.probability;
    if (!Number.isFinite(probability) || probability < 0 || probability > 1) {
      return failure(
        'invalid_initial_probability',
        `Initial probability must be a finite number from 0 to 1: ${String(probability)}`,
        { path: `request.initialDistribution[${index}].probability`, stateId: entry.stateId }
      );
    }
    probabilities[stateIndex] = probability;
    total += probability;
  }

  if (!Number.isFinite(total) || Math.abs(total - 1) > tolerance) {
    return failure(
      'initial_probability_total',
      `Initial probabilities sum to ${String(total)}, outside tolerance ${tolerance}`,
      { path: 'request.initialDistribution', actualTotal: total, tolerance }
    );
  }

  return probabilities;
}

function isInitialDistributionFailure(
  value: number[] | FiniteMarkovLongRunBehaviorFailureResult
): value is FiniteMarkovLongRunBehaviorFailureResult {
  return !Array.isArray(value);
}

function buildTransitionMatrix(
  model: DefinitionModel,
  stateIds: StateId[],
  probabilityTolerance: number
): { matrix: TransitionMatrix; maxRowDeviation: number } | FiniteMarkovLongRunBehaviorFailureResult {
  const indexByState = new Map(stateIds.map((stateId, index) => [stateId, index]));
  const matrix = stateIds.map(() => stateIds.map(() => 0));
  const terminalStateIds = new Set(
    model.states.filter((state) => isTerminalState(state)).map((state) => state.id)
  );

  for (const stateId of terminalStateIds) {
    const index = indexByState.get(stateId);
    if (index === undefined) {
      return failure('structural_inconsistency', `Terminal state index missing: ${stateId}`, {
        stateId
      });
    }
    matrix[index]![index] = 1;
  }

  for (const transition of model.transitions) {
    if (terminalStateIds.has(transition.from)) {
      continue;
    }
    const from = indexByState.get(transition.from);
    const to = indexByState.get(transition.to);
    if (from === undefined || to === undefined) {
      return failure(
        'structural_inconsistency',
        `Validated transition index missing: ${transition.from} -> ${transition.to}`
      );
    }
    const probability = evaluateProbabilitySpec(transition.probability);
    const next = matrix[from]![to]! + probability;
    if (!Number.isFinite(next)) {
      return failure(
        'non_finite_analytical_result',
        `Transition matrix entry became non-finite: ${transition.from} -> ${transition.to}`
      );
    }
    matrix[from]![to] = next;
  }

  let maxRowDeviation = 0;
  for (let row = 0; row < matrix.length; row += 1) {
    const stateId = stateIds[row]!;
    const total = matrix[row]!.reduce((sum, value) => sum + value, 0);
    if (!Number.isFinite(total)) {
      return failure(
        'non_finite_analytical_result',
        `Transition row total became non-finite for state ${stateId}`,
        { stateId }
      );
    }
    const deviation = Math.abs(total - 1);
    maxRowDeviation = Math.max(maxRowDeviation, deviation);
    if (deviation > probabilityTolerance) {
      return failure(
        'structural_inconsistency',
        `Materialized transition row for ${stateId} sums to ${total}, outside tolerance ${probabilityTolerance}`,
        { stateId, actualTotal: total, tolerance: probabilityTolerance }
      );
    }
  }

  return { matrix, maxRowDeviation };
}

function isMatrixFailure(
  value:
    | { matrix: TransitionMatrix; maxRowDeviation: number }
    | FiniteMarkovLongRunBehaviorFailureResult
): value is FiniteMarkovLongRunBehaviorFailureResult {
  return 'ok' in value && value.ok === false;
}

function stronglyConnectedComponents(matrix: TransitionMatrix, stateIds: StateId[]): number[][] {
  const index = stateIds.map(() => -1);
  const lowLink = stateIds.map(() => -1);
  const onStack = stateIds.map(() => false);
  const stack: number[] = [];
  const components: number[][] = [];
  let nextIndex = 0;

  const adjacency = matrix.map((row) =>
    row
      .map((probability, target) => ({ probability, target }))
      .filter((entry) => entry.probability > 0)
      .map((entry) => entry.target)
  );

  function strongConnect(vertex: number): void {
    index[vertex] = nextIndex;
    lowLink[vertex] = nextIndex;
    nextIndex += 1;
    stack.push(vertex);
    onStack[vertex] = true;

    for (const target of adjacency[vertex] ?? []) {
      if (index[target] === -1) {
        strongConnect(target);
        lowLink[vertex] = Math.min(lowLink[vertex]!, lowLink[target]!);
      } else if (onStack[target]) {
        lowLink[vertex] = Math.min(lowLink[vertex]!, index[target]!);
      }
    }

    if (lowLink[vertex] !== index[vertex]) return;
    const component: number[] = [];
    while (stack.length > 0) {
      const member = stack.pop()!;
      onStack[member] = false;
      component.push(member);
      if (member === vertex) break;
    }
    component.sort((left, right) => compareStateIds(stateIds[left]!, stateIds[right]!));
    components.push(component);
  }

  for (let vertex = 0; vertex < stateIds.length; vertex += 1) {
    if (index[vertex] === -1) strongConnect(vertex);
  }

  components.sort((left, right) =>
    compareStateIdArrays(
      left.map((indexValue) => stateIds[indexValue]!),
      right.map((indexValue) => stateIds[indexValue]!)
    )
  );
  return components;
}

function isClosedComponent(component: number[], matrix: TransitionMatrix): boolean {
  const members = new Set(component);
  for (const from of component) {
    for (let to = 0; to < matrix.length; to += 1) {
      if (!members.has(to) && matrix[from]![to]! > 0) return false;
    }
  }
  return true;
}

function gcd(left: number, right: number): number {
  let a = Math.abs(left);
  let b = Math.abs(right);
  while (b !== 0) {
    const next = a % b;
    a = b;
    b = next;
  }
  return a;
}

function componentPeriod(
  component: number[],
  matrix: TransitionMatrix
): number | FiniteMarkovLongRunBehaviorFailureResult {
  const members = new Set(component);
  const distance = matrix.map(() => -1);
  const root = component[0];
  if (root === undefined) {
    return failure('structural_inconsistency', 'Empty recurrent component encountered');
  }
  distance[root] = 0;
  const queue = [root];
  for (let position = 0; position < queue.length; position += 1) {
    const from = queue[position]!;
    for (let to = 0; to < matrix.length; to += 1) {
      if (!members.has(to) || matrix[from]![to]! <= 0 || distance[to] !== -1) continue;
      distance[to] = distance[from]! + 1;
      queue.push(to);
    }
  }

  for (const member of component) {
    if (distance[member]! < 0) {
      return failure(
        'structural_inconsistency',
        'Recurrent component was not internally reachable during period calculation'
      );
    }
  }

  let period = 0;
  for (const from of component) {
    for (let to = 0; to < matrix.length; to += 1) {
      if (!members.has(to) || matrix[from]![to]! <= 0) continue;
      const difference = Math.abs(distance[from]! + 1 - distance[to]!);
      period = gcd(period, difference);
    }
  }
  if (period <= 0) {
    return failure(
      'structural_inconsistency',
      'Unable to derive a positive period for a closed recurrent component'
    );
  }
  return period;
}

function isPeriodFailure(
  value: number | FiniteMarkovLongRunBehaviorFailureResult
): value is FiniteMarkovLongRunBehaviorFailureResult {
  return typeof value !== 'number';
}

function solveLinearSystem(
  coefficients: number[][],
  rightHandSide: number[],
  tolerance: number
): LinearSolution | undefined {
  const size = coefficients.length;
  if (size === 0 || rightHandSide.length !== size) return undefined;
  const original = coefficients.map((row) => [...row]);
  const originalRight = [...rightHandSide];
  const augmented = coefficients.map((row, index) => [...row, rightHandSide[index]!]);
  const pivotThreshold = Math.max(
    Number.EPSILON * 32,
    Math.min(1e-12, tolerance * 1e-4)
  );

  for (let column = 0; column < size; column += 1) {
    let pivotRow = column;
    let pivotMagnitude = Math.abs(augmented[pivotRow]![column]!);
    for (let row = column + 1; row < size; row += 1) {
      const magnitude = Math.abs(augmented[row]![column]!);
      if (magnitude > pivotMagnitude) {
        pivotMagnitude = magnitude;
        pivotRow = row;
      }
    }
    if (!Number.isFinite(pivotMagnitude) || pivotMagnitude <= pivotThreshold) return undefined;
    if (pivotRow !== column) {
      const swap = augmented[column]!;
      augmented[column] = augmented[pivotRow]!;
      augmented[pivotRow] = swap;
    }

    const pivot = augmented[column]![column]!;
    for (let entry = column; entry <= size; entry += 1) {
      augmented[column]![entry] = augmented[column]![entry]! / pivot;
    }

    for (let row = 0; row < size; row += 1) {
      if (row === column) continue;
      const factor = augmented[row]![column]!;
      if (factor === 0) continue;
      for (let entry = column; entry <= size; entry += 1) {
        augmented[row]![entry] =
          augmented[row]![entry]! - factor * augmented[column]![entry]!;
      }
    }
  }

  const solution = augmented.map((row) => row[size]!);
  if (solution.some((value) => !Number.isFinite(value))) return undefined;

  let residual = 0;
  for (let row = 0; row < size; row += 1) {
    let actual = 0;
    for (let column = 0; column < size; column += 1) {
      actual += original[row]![column]! * solution[column]!;
    }
    residual = Math.max(residual, Math.abs(actual - originalRight[row]!));
  }
  if (!Number.isFinite(residual)) return undefined;
  return { solution, residual };
}

function stationaryDistribution(
  component: number[],
  matrix: TransitionMatrix,
  tolerance: number
): StationarySolution | FiniteMarkovLongRunBehaviorFailureResult {
  const size = component.length;
  const coefficients = Array.from({ length: size }, () => Array(size).fill(0) as number[]);
  const rightHandSide = Array(size).fill(0) as number[];

  for (let equation = 0; equation < size - 1; equation += 1) {
    for (let column = 0; column < size; column += 1) {
      coefficients[equation]![column] =
        matrix[component[column]!]![component[equation]!]! - (column === equation ? 1 : 0);
    }
  }
  for (let column = 0; column < size; column += 1) {
    coefficients[size - 1]![column] = 1;
  }
  rightHandSide[size - 1] = 1;

  const solved = solveLinearSystem(coefficients, rightHandSide, tolerance);
  if (solved === undefined) {
    return failure('stationary_solve_failure', 'Unable to solve recurrent-class stationary equations');
  }

  let roundoffClamped = false;
  const probabilities = solved.solution.map((value) => {
    if (value < 0 && value >= -tolerance) {
      roundoffClamped = true;
      return 0;
    }
    if (value > 1 && value <= 1 + tolerance) {
      roundoffClamped = true;
      return 1;
    }
    return value;
  });
  if (probabilities.some((value) => !Number.isFinite(value) || value < 0 || value > 1)) {
    return failure(
      'stationary_solve_failure',
      'Stationary solution contains an invalid probability'
    );
  }

  const total = probabilities.reduce((sum, value) => sum + value, 0);
  if (!Number.isFinite(total) || Math.abs(total - 1) > tolerance) {
    return failure(
      'stationary_solve_failure',
      `Stationary probabilities sum to ${String(total)}, outside tolerance ${tolerance}`,
      { actualTotal: total, tolerance }
    );
  }

  let balanceResidual = 0;
  for (let target = 0; target < size; target += 1) {
    let nextMass = 0;
    for (let source = 0; source < size; source += 1) {
      nextMass += probabilities[source]! * matrix[component[source]!]![component[target]!]!;
    }
    balanceResidual = Math.max(balanceResidual, Math.abs(nextMass - probabilities[target]!));
  }
  const residual = Math.max(solved.residual, balanceResidual, Math.abs(total - 1));
  if (!Number.isFinite(residual) || residual > tolerance) {
    return failure(
      'stationary_solve_failure',
      `Stationary residual ${String(residual)} exceeds tolerance ${tolerance}`,
      { tolerance }
    );
  }

  return { probabilities, residual, roundoffClamped };
}

function isStationaryFailure(
  value: StationarySolution | FiniteMarkovLongRunBehaviorFailureResult
): value is FiniteMarkovLongRunBehaviorFailureResult {
  return 'ok' in value && value.ok === false;
}

function solveClassEntryProbabilities(
  recurrentComponents: number[][],
  transientIndices: number[],
  matrix: TransitionMatrix,
  tolerance: number
): ClassEntrySolution | FiniteMarkovLongRunBehaviorFailureResult {
  const stateCount = matrix.length;
  const transientPosition = new Map(transientIndices.map((stateIndex, position) => [stateIndex, position]));
  const recurrentClassByState = new Map<number, number>();
  recurrentComponents.forEach((component, classIndex) => {
    for (const stateIndex of component) recurrentClassByState.set(stateIndex, classIndex);
  });

  const probabilitiesByClass = recurrentComponents.map(() => Array(stateCount).fill(0) as number[]);
  for (let classIndex = 0; classIndex < recurrentComponents.length; classIndex += 1) {
    for (const stateIndex of recurrentComponents[classIndex]!) {
      probabilitiesByClass[classIndex]![stateIndex] = 1;
    }
  }

  if (transientIndices.length === 0) {
    return { probabilitiesByClass, maxResidual: 0, roundoffClamped: false };
  }

  const coefficients = transientIndices.map((stateIndex, row) =>
    transientIndices.map((targetIndex, column) =>
      (row === column ? 1 : 0) - matrix[stateIndex]![targetIndex]!
    )
  );
  let maxResidual = 0;
  let roundoffClamped = false;

  for (let classIndex = 0; classIndex < recurrentComponents.length; classIndex += 1) {
    const targetStates = new Set(recurrentComponents[classIndex]);
    const rightHandSide = transientIndices.map((stateIndex) => {
      let directMass = 0;
      for (const target of targetStates) directMass += matrix[stateIndex]![target]!;
      return directMass;
    });
    const solved = solveLinearSystem(coefficients, rightHandSide, tolerance);
    if (solved === undefined) {
      return failure(
        'class_entry_solve_failure',
        `Unable to solve entry probabilities for recurrent class ${classIndex}`
      );
    }
    maxResidual = Math.max(maxResidual, solved.residual);

    for (let position = 0; position < transientIndices.length; position += 1) {
      const stateIndex = transientIndices[position]!;
      let value = solved.solution[position]!;
      if (value < 0 && value >= -tolerance) {
        value = 0;
        roundoffClamped = true;
      } else if (value > 1 && value <= 1 + tolerance) {
        value = 1;
        roundoffClamped = true;
      }
      if (!Number.isFinite(value) || value < 0 || value > 1) {
        return failure(
          'class_entry_solve_failure',
          `Invalid recurrent-class entry probability at transient state ${stateIndex}: ${String(value)}`
        );
      }
      probabilitiesByClass[classIndex]![stateIndex] = value;
    }
  }

  for (const stateIndex of transientIndices) {
    let total = 0;
    for (const byClass of probabilitiesByClass) total += byClass[stateIndex]!;
    if (!Number.isFinite(total) || Math.abs(total - 1) > tolerance) {
      return failure(
        'class_entry_solve_failure',
        `Recurrent-class entry probabilities from transient state ${stateIndex} sum to ${String(total)}, outside tolerance ${tolerance}`,
        { actualTotal: total, tolerance }
      );
    }
  }

  for (let stateIndex = 0; stateIndex < stateCount; stateIndex += 1) {
    if (transientPosition.has(stateIndex) || recurrentClassByState.has(stateIndex)) continue;
    return failure('structural_inconsistency', `State ${stateIndex} was not classified`);
  }

  if (maxResidual > tolerance) {
    return failure(
      'class_entry_solve_failure',
      `Class-entry residual ${String(maxResidual)} exceeds tolerance ${tolerance}`,
      { tolerance }
    );
  }
  return { probabilitiesByClass, maxResidual, roundoffClamped };
}

function isClassEntryFailure(
  value: ClassEntrySolution | FiniteMarkovLongRunBehaviorFailureResult
): value is FiniteMarkovLongRunBehaviorFailureResult {
  return 'ok' in value && value.ok === false;
}

function checkedProbabilityVector(
  values: number[],
  tolerance: number,
  name: string
): FiniteMarkovLongRunBehaviorFailureResult | undefined {
  for (const value of values) {
    if (!Number.isFinite(value)) {
      return failure('non_finite_analytical_result', `${name} contains a non-finite value`);
    }
    if (value < 0 || value > 1) {
      return failure('structural_inconsistency', `${name} contains probability ${String(value)}`);
    }
  }
  const total = values.reduce((sum, value) => sum + value, 0);
  if (!Number.isFinite(total) || Math.abs(total - 1) > tolerance) {
    return failure(
      'structural_inconsistency',
      `${name} sums to ${String(total)}, outside tolerance ${tolerance}`,
      { actualTotal: total, tolerance }
    );
  }
  return undefined;
}

export function analyzeFiniteMarkovLongRunBehavior(
  model: DefinitionModel,
  request: FiniteMarkovLongRunBehaviorRequest,
  options: FiniteMarkovLongRunBehaviorOptions = {}
): FiniteMarkovLongRunBehaviorResult {
  const resolved = resolveOptions(options);
  if (isFailure(resolved)) return resolved;

  const validation = validateDefinitionModel(model, resolved.probabilityTolerance);
  if (!validation.valid) {
    const first = validation.errors[0];
    return {
      ok: false,
      failure: {
        code: 'invalid_model',
        message: first === undefined
          ? 'DefinitionModel failed validation'
          : `DefinitionModel failed validation: ${first.message}`,
        ...(first === undefined ? {} : { path: `model.${first.path}` })
      },
      validation
    };
  }
  if (model.states.length === 0) {
    return failure('invalid_model', 'DefinitionModel must contain at least one state', {
      path: 'model.states'
    });
  }

  const stateIds = model.states.map((state) => state.id).sort(compareStateIds);
  const initial = validateInitialDistribution(request, stateIds, resolved.probabilityTolerance);
  if (isInitialDistributionFailure(initial)) return initial;

  const matrixResult = buildTransitionMatrix(
    model,
    stateIds,
    resolved.probabilityTolerance
  );
  if (isMatrixFailure(matrixResult)) return matrixResult;
  const { matrix, maxRowDeviation } = matrixResult;

  const components = stronglyConnectedComponents(matrix, stateIds);
  const recurrentComponents = components.filter((component) => isClosedComponent(component, matrix));
  if (recurrentComponents.length === 0) {
    return failure(
      'structural_inconsistency',
      'Finite chain produced no closed recurrent communicating class'
    );
  }
  const recurrentStates = new Set(recurrentComponents.flat());
  const transientIndices = stateIds
    .map((_, index) => index)
    .filter((index) => !recurrentStates.has(index));

  const stationarySolutions: StationarySolution[] = [];
  const periods: number[] = [];
  let maxStationaryResidual = 0;
  let roundoffClampingApplied = false;
  for (const component of recurrentComponents) {
    const period = componentPeriod(component, matrix);
    if (isPeriodFailure(period)) return period;
    periods.push(period);

    const stationary = stationaryDistribution(component, matrix, resolved.linearSolveTolerance);
    if (isStationaryFailure(stationary)) return stationary;
    stationarySolutions.push(stationary);
    maxStationaryResidual = Math.max(maxStationaryResidual, stationary.residual);
    roundoffClampingApplied = roundoffClampingApplied || stationary.roundoffClamped;
  }

  const entrySolutions = solveClassEntryProbabilities(
    recurrentComponents,
    transientIndices,
    matrix,
    resolved.linearSolveTolerance
  );
  if (isClassEntryFailure(entrySolutions)) return entrySolutions;
  roundoffClampingApplied = roundoffClampingApplied || entrySolutions.roundoffClamped;

  const entryProbabilities = recurrentComponents.map((_, classIndex) => {
    let probability = 0;
    for (let stateIndex = 0; stateIndex < stateIds.length; stateIndex += 1) {
      probability += initial[stateIndex]! * entrySolutions.probabilitiesByClass[classIndex]![stateIndex]!;
    }
    if (probability < 0 && probability >= -resolved.linearSolveTolerance) {
      roundoffClampingApplied = true;
      return 0;
    }
    if (probability > 1 && probability <= 1 + resolved.linearSolveTolerance) {
      roundoffClampingApplied = true;
      return 1;
    }
    return probability;
  });
  const entryCheck = checkedProbabilityVector(
    entryProbabilities,
    resolved.linearSolveTolerance,
    'Recurrent-class entry probabilities'
  );
  if (entryCheck !== undefined) return entryCheck;

  const cesaro = stateIds.map(() => 0);
  recurrentComponents.forEach((component, classIndex) => {
    const stationary = stationarySolutions[classIndex]!;
    const entryProbability = entryProbabilities[classIndex]!;
    component.forEach((stateIndex, localIndex) => {
      cesaro[stateIndex] = cesaro[stateIndex]! + entryProbability * stationary.probabilities[localIndex]!;
    });
  });
  const cesaroCheck = checkedProbabilityVector(
    cesaro,
    resolved.linearSolveTolerance,
    'Cesaro long-run occupancy'
  );
  if (cesaroCheck !== undefined) return cesaroCheck;

  const recurrentClasses = recurrentComponents.map((component, classIndex) => ({
    stateIds: component.map((stateIndex) => stateIds[stateIndex]!),
    period: periods[classIndex]!,
    stationaryDistribution: component.map((stateIndex, localIndex) => ({
      stateId: stateIds[stateIndex]!,
      probability: stationarySolutions[classIndex]!.probabilities[localIndex]!
    })),
    entryProbability: entryProbabilities[classIndex]!
  }));

  const uniqueGlobal = recurrentComponents.length === 1;
  const uniqueDistribution = uniqueGlobal
    ? stateIds.map((stateId, stateIndex) => {
        const localIndex = recurrentComponents[0]!.indexOf(stateIndex);
        return {
          stateId,
          probability: localIndex < 0 ? 0 : stationarySolutions[0]!.probabilities[localIndex]!
        };
      })
    : null;

  return {
    ok: true,
    stateIds,
    communicatingClasses: components.map((component) => ({
      stateIds: component.map((stateIndex) => stateIds[stateIndex]!),
      classification: isClosedComponent(component, matrix) ? 'closed_recurrent' : 'transient'
    })),
    transientStateIds: transientIndices.map((index) => stateIds[index]!),
    recurrentClasses,
    globalStationaryDistribution: {
      unique: uniqueGlobal,
      basis: recurrentClasses.map((recurrentClass) => ({
        stateIds: [...recurrentClass.stateIds],
        distribution: recurrentClass.stationaryDistribution.map((entry) => ({ ...entry }))
      })),
      distribution: uniqueDistribution
    },
    cesaroLongRunOccupancy: stateIds.map((stateId, index) => ({
      stateId,
      probability: cesaro[index]!
    })),
    diagnostics: {
      solverMethod: 'finite_scc_stationary_absorption_cesaro',
      simulationUsed: false,
      numericRepresentation: 'javascript_number_float64',
      normalizationApplied: false,
      roundoffClampingApplied,
      terminalSemantics: 'implicit_self_retention',
      graphEdgeConvention: 'strictly_positive_transition_probability',
      ordinaryPointwiseLimitComputed: false,
      probabilityTolerance: resolved.probabilityTolerance,
      linearSolveTolerance: resolved.linearSolveTolerance,
      stateCount: stateIds.length,
      communicatingClassCount: components.length,
      recurrentClassCount: recurrentComponents.length,
      transientStateCount: transientIndices.length,
      periodicRecurrentClassCount: periods.filter((period) => period > 1).length,
      maxTransitionRowDeviation: maxRowDeviation,
      maxStationaryResidual,
      maxClassEntryResidual: entrySolutions.maxResidual
    }
  };
}

type NonFiniteNumberLocation = {
  path: string;
  value: number;
};

function findNonFiniteNumber(value: unknown, path = '$'): NonFiniteNumberLocation | undefined {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? undefined : { path, value };
  }
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = findNonFiniteNumber(value[index], `${path}[${index}]`);
      if (found !== undefined) return found;
    }
    return undefined;
  }
  if (value !== null && typeof value === 'object') {
    for (const [key, nested] of Object.entries(value)) {
      const found = findNonFiniteNumber(nested, `${path}.${key}`);
      if (found !== undefined) return found;
    }
  }
  return undefined;
}

export function finiteMarkovLongRunBehaviorResultToJson(
  result: FiniteMarkovLongRunBehaviorResult
): string {
  const found = findNonFiniteNumber(result);
  if (found !== undefined) {
    throw new Error(
      `Cannot serialize finite Markov long-run result with non-finite numeric value ${String(found.value)} at ${found.path}`
    );
  }
  return JSON.stringify(result);
}
