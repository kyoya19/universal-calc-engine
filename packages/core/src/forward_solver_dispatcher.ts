import {
  AcyclicDirectForwardResult,
  evaluateAcyclicDirectDefinitionModel
} from './acyclic_direct_forward_evaluation';
import { AcyclicDirectOptions } from './acyclic_direct_solver';
import {
  ForwardEvaluationOptions,
  ForwardEvaluationResult,
  evaluateDefinitionModel
} from './forward_evaluation';
import { DefinitionModel } from './model';

export type ForwardSolverMethod = 'iterative' | 'acyclic_direct';

export type IterativeForwardSolverRequest = {
  solverMethod: 'iterative';
  options?: ForwardEvaluationOptions;
};

export type AcyclicDirectForwardSolverRequest = {
  solverMethod: 'acyclic_direct';
  options?: AcyclicDirectOptions;
};

export type ForwardSolverRequest =
  | IterativeForwardSolverRequest
  | AcyclicDirectForwardSolverRequest;

export type IterativeForwardSolverEvaluation = {
  solverMethod: 'iterative';
  result: ForwardEvaluationResult;
};

export type AcyclicDirectForwardSolverEvaluation = {
  solverMethod: 'acyclic_direct';
  result: AcyclicDirectForwardResult;
};

export type ForwardSolverEvaluationResult =
  | IterativeForwardSolverEvaluation
  | AcyclicDirectForwardSolverEvaluation;

export function evaluateDefinitionModelWithSolver(
  model: DefinitionModel,
  request: ForwardSolverRequest
): ForwardSolverEvaluationResult {
  if (request.solverMethod === 'iterative') {
    return {
      solverMethod: 'iterative',
      result: evaluateDefinitionModel(model, request.options)
    };
  }

  return {
    solverMethod: 'acyclic_direct',
    result: evaluateAcyclicDirectDefinitionModel(model, request.options)
  };
}
