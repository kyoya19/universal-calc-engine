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
