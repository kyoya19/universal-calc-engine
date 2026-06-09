import {
  DefinitionModel,
  expandModel,
  EvaluatedModel,
  evaluateModel,
  solveExpectedReward,
  SolvedModel,
  StateId
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

export type GeneratedTargetSolverGateFailureCode = GeneratedTargetSolverPlanningRejection['type'];

export type GeneratedTargetSolverGateResultSummary =
  | {
      accepted: true;
      edgeCount: number;
      generatedTargetReadyEdgeCount: number;
      rejectionCode?: never;
      rejectionType?: never;
      rejectionMessage?: never;
    }
  | {
      accepted: false;
      edgeCount: number;
      generatedTargetReadyEdgeCount: number;
      rejectionCode: GeneratedTargetSolverGateFailureCode;
      rejectionType: GeneratedTargetSolverPlanningRejection['type'];
      rejectionMessage: string;
    };

export type GeneratedTargetComparisonReportRowStatus =
  | 'match'
  | 'missing_generated_target'
  | 'explicit_generated_mismatch';

export type GeneratedTargetComparisonReportRow = {
  from: StateId;
  explicitTo: StateId;
  generatedTo?: StateId;
  status: GeneratedTargetComparisonReportRowStatus;
};

export type GeneratedTargetComparisonReport = {
  edgeCount: number;
  matchCount: number;
  missingGeneratedTargetCount: number;
  explicitGeneratedMismatchCount: number;
  rows: GeneratedTargetComparisonReportRow[];
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
      rejectionCode: result.rejection.type,
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

export function formatGeneratedTargetSolverGateResultSummary(
  summary: GeneratedTargetSolverGateResultSummary
): string {
  const baseLines = [
    `accepted: ${summary.accepted}`,
    `edgeCount: ${summary.edgeCount}`,
    `generatedTargetReadyEdgeCount: ${summary.generatedTargetReadyEdgeCount}`
  ];

  if (summary.accepted) {
    return baseLines.join('\n');
  }

  return [
    ...baseLines,
    `rejectionCode: ${summary.rejectionCode}`,
    `rejectionType: ${summary.rejectionType}`,
    `rejectionMessage: ${summary.rejectionMessage}`
  ].join('\n');
}

function statusForGeneratedTargetComparisonRow(
  explicitTo: StateId,
  generatedTo: StateId | undefined
): GeneratedTargetComparisonReportRowStatus {
  if (generatedTo === undefined) {
    return 'missing_generated_target';
  }

  if (explicitTo !== generatedTo) {
    return 'explicit_generated_mismatch';
  }

  return 'match';
}

export function buildGeneratedTargetComparisonReport(graph: ExpandedStateGraph): GeneratedTargetComparisonReport {
  const rows = graph.edges.map((edge): GeneratedTargetComparisonReportRow => ({
    from: edge.from,
    explicitTo: edge.explicitTo,
    generatedTo: edge.generatedTo,
    status: statusForGeneratedTargetComparisonRow(edge.explicitTo, edge.generatedTo)
  }));

  return {
    edgeCount: rows.length,
    matchCount: rows.filter((row) => row.status === 'match').length,
    missingGeneratedTargetCount: rows.filter((row) => row.status === 'missing_generated_target').length,
    explicitGeneratedMismatchCount: rows.filter((row) => row.status === 'explicit_generated_mismatch').length,
    rows
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
