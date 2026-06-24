import { ExpandedStateEdge, ExpandedStateGraph } from './state_generation';

export type GeneratedTargetSolverPolicyCandidate = 'require_generated_match';

export type MissingGeneratedTargetDecision = 'reject';

export type ExplicitGeneratedMismatchDecision = 'reject';

export type ExplicitGeneratedMatchDecision = 'require_match_then_use_generated';

export type ExpectedRewardBaselineDecision = 'must_remain_unchanged';

export type ContributionOutputDecision = 'report_explicit_target';

export type GeneratedTargetSolverPlanningDecision = {
  policy: GeneratedTargetSolverPolicyCandidate;
  missingGeneratedTarget: MissingGeneratedTargetDecision;
  explicitGeneratedMismatch: ExplicitGeneratedMismatchDecision;
  explicitGeneratedMatch: ExplicitGeneratedMatchDecision;
  expectedRewardBaseline: ExpectedRewardBaselineDecision;
  contributionOutput: ContributionOutputDecision;
};

export const requireGeneratedMatchPlanningDecision: GeneratedTargetSolverPlanningDecision = {
  policy: 'require_generated_match',
  missingGeneratedTarget: 'reject',
  explicitGeneratedMismatch: 'reject',
  explicitGeneratedMatch: 'require_match_then_use_generated',
  expectedRewardBaseline: 'must_remain_unchanged',
  contributionOutput: 'report_explicit_target'
};

export type GeneratedTargetSolverPlanningRejection =
  | {
      type: 'missing_generated_target';
      edge: ExpandedStateEdge;
      message: string;
    }
  | {
      type: 'explicit_generated_mismatch';
      edge: ExpandedStateEdge;
      message: string;
    };

export type GeneratedTargetSolverPlanningValidationResult =
  | {
      accepted: true;
    }
  | {
      accepted: false;
      rejection: GeneratedTargetSolverPlanningRejection;
    };

export function serializeGeneratedTargetSolverPlanningDecision(
  decision: GeneratedTargetSolverPlanningDecision
): GeneratedTargetSolverPlanningDecision {
  return { ...decision };
}

export function serializeGeneratedTargetSolverPlanningEdge(edge: ExpandedStateEdge): ExpandedStateEdge {
  const transition = edge.transition.effects
    ? {
        ...edge.transition,
        effects: edge.transition.effects.map((effect) => ({ ...effect }))
      }
    : { ...edge.transition };

  return {
    ...edge,
    transition
  };
}

export function serializeGeneratedTargetSolverPlanningRejection(
  rejection: GeneratedTargetSolverPlanningRejection
): GeneratedTargetSolverPlanningRejection {
  return {
    ...rejection,
    edge: serializeGeneratedTargetSolverPlanningEdge(rejection.edge)
  };
}

export function serializeGeneratedTargetSolverPlanningValidationResult(
  result: GeneratedTargetSolverPlanningValidationResult
): GeneratedTargetSolverPlanningValidationResult {
  if (result.accepted) {
    return { accepted: true };
  }

  return {
    accepted: false,
    rejection: serializeGeneratedTargetSolverPlanningRejection(result.rejection)
  };
}

export function generatedTargetSolverPlanningValidationResultToJson(
  result: GeneratedTargetSolverPlanningValidationResult
): string {
  return JSON.stringify(serializeGeneratedTargetSolverPlanningValidationResult(result));
}

export function validateGeneratedTargetSolverPlanningBoundary(
  graph: ExpandedStateGraph,
  decision: GeneratedTargetSolverPlanningDecision = requireGeneratedMatchPlanningDecision
): GeneratedTargetSolverPlanningValidationResult {
  if (decision.missingGeneratedTarget === 'reject') {
    const missingEdge = graph.edges.find((edge) => edge.generatedTo === undefined);
    if (missingEdge) {
      return {
        accepted: false,
        rejection: {
          type: 'missing_generated_target',
          edge: missingEdge,
          message: `Generated target is missing for edge from ${missingEdge.from} to ${missingEdge.explicitTo}`
        }
      };
    }
  }

  if (decision.explicitGeneratedMismatch === 'reject') {
    const mismatchedEdge = graph.edges.find(
      (edge) => edge.generatedTo !== undefined && edge.explicitTo !== edge.generatedTo
    );
    if (mismatchedEdge) {
      return {
        accepted: false,
        rejection: {
          type: 'explicit_generated_mismatch',
          edge: mismatchedEdge,
          message: `Explicit target ${mismatchedEdge.explicitTo} differs from generated target ${mismatchedEdge.generatedTo}`
        }
      };
    }
  }

  return { accepted: true };
}
