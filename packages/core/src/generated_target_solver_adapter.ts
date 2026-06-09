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

export type GeneratedTargetSolverGateResultSummary =
  | {
      accepted: true;
      edgeCount: number;
      generatedTargetReadyEdgeCount: number;
      rejectionType?: never;
      rejectionMessage?: never;
    }
  | {
      accepted: false;
      edgeCount: number;
      generatedTargetReadyEdgeCount: number;
      rejectionType: GeneratedTargetSolverPlanningRejection['type'];
      rejectionMessage: string;
    };

export function summarizeGeneratedTargetSolverGateResult(
  result: GeneratedTargetSolverGateResult
): GeneratedTargetSolverGateResultSummary {
  const edgeCount = result.graph.edges.length;
  const generatedTargetReadyEdgeCount = result.graph.edges.filter((edge) => edge.generatedTo !== undefined).length;

  if (!result.accepted) {
    return {
      accepted: false,
      edgeCount,
      generatedTargetReadyEdgeCount,
      rejectionType: result.rejection.type,
      rejectionMessage: result.rejection.message
    };
  }

  return {
    accepted: true,
    edgeCount,
    generatedTargetReadyEdgeCount
  };
}

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
