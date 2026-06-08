import {
  DefinitionModel,
  expandModel,
  EvaluatedModel,
  evaluateModel,
  solveExpectedReward,
  SolvedModel
} from './model';
import { expandGraphFromModel, ExpandedStateGraph } from './state_generation';
import {
  GeneratedTargetSolverPlanningDecision,
  GeneratedTargetSolverPlanningRejection,
  requireGeneratedMatchPlanningDecision,
  validateGeneratedTargetSolverPlanningBoundary
} from './generated_target_solver_policy';

export type GeneratedTargetSolverGateResult =
  | {
      accepted: true;
      graph: ExpandedStateGraph;
      evaluatedModel: EvaluatedModel;
      solvedModel: SolvedModel;
    }
  | {
      accepted: false;
      graph: ExpandedStateGraph;
      rejection: GeneratedTargetSolverPlanningRejection;
    };

export function solveExpectedRewardWithGeneratedTargetGate(
  model: DefinitionModel,
  decision: GeneratedTargetSolverPlanningDecision = requireGeneratedMatchPlanningDecision
): GeneratedTargetSolverGateResult {
  const graph = expandGraphFromModel(model);
  const validation = validateGeneratedTargetSolverPlanningBoundary(graph, decision);

  if (!validation.accepted) {
    return {
      accepted: false,
      graph,
      rejection: validation.rejection
    };
  }

  const evaluatedModel = evaluateModel(expandModel(model));
  const solvedModel = solveExpectedReward(evaluatedModel);

  return {
    accepted: true,
    graph,
    evaluatedModel,
    solvedModel
  };
}
