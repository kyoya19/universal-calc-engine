# Candidate M — Finite Ambiguity-Preserving Robust Decision v1

Authority: `ORF-ABC-FINITE-AMBIGUITY-PRESERVING-ROBUST-DECISION-FOUNDATION-v1`

Candidate M adds a prior-free one-shot robust-decision layer between ambiguity-preserving Seikatan inference and downstream Kiyotan action selection.

## Contract

The caller supplies:

- a finite non-empty candidate ambiguity set with unique `candidateId` values;
- a finite non-empty common pure-action set with unique `actionId` values;
- exactly one finite `expectedReward` for every candidate/action pair.

Negative and zero expected rewards are valid. Missing, duplicate, unknown-candidate, unknown-action, or non-finite matrix entries are failures. Candidate M does not infer matrix values, candidate probabilities, or actions.

For every action `a`, Candidate M computes

`robustValue(a) = min_c V(c,a)`.

Every candidate satisfying

`|V(c,a) - robustValue(a)| <= actionValueTolerance`

is retained as a worst-case candidate for that action.

The best robust value is

`robustValue* = max_a robustValue(a)`.

Every action satisfying

`|robustValue(a) - robustValue*| <= actionValueTolerance`

is retained in the complete maximin action set. Input order and IDs never break a numerical tie.

## Ambiguity semantics

The candidate set is an ambiguity set, not a probability distribution.

Candidate M never:

- chooses one candidate merely because it appears first;
- assigns equal probability to candidates;
- derives probabilities from candidate likelihoods;
- averages candidate rewards;
- silently discards tied candidate models.

When there is exactly one candidate, the contract reduces to ordinary maximum expected-reward action selection over the supplied pure actions.

## Meaning of the objective

Maximin protects the worst supplied candidate-specific expected reward for each pure action and then chooses the action or actions with the greatest such worst-case value.

This is not:

- Bayesian expected utility;
- minimax regret;
- CVaR or another tail-risk measure;
- a claim that candidates are equally likely;
- a guarantee outside the supplied finite candidate ambiguity set;
- a state-transition policy optimizer.

## Numerical and deterministic semantics

- Float64 arithmetic is used.
- `actionValueTolerance` must be finite and positive.
- Candidate IDs and action IDs are canonicalized by lexical order.
- The complete candidate/action value table is retained in output action evaluations.
- Worst-case-candidate ties are complete.
- Maximin-action ties are complete.
- Checked JSON serialization rejects forged non-finite numeric values.

## Independent qualification oracles

Qualification does not use Candidate M production min/max selection as the expected-value oracle.

Primary oracle:

- group candidate rewards by action independently;
- sort candidate rewards for each action;
- take the first order statistic as that action's worst case;
- sort action worst cases independently;
- retain the complete best-action and worst-candidate ties.

Secondary qualification includes closed-form finite matrices for unique maximin, tied maximin, multiple worst-case candidates, all-negative rewards, one-candidate reduction, and dominated actions.

Metamorphic checks include:

- candidate permutation invariance;
- action permutation invariance;
- matrix-entry permutation invariance;
- common additive reward translation;
- positive reward scaling with correspondingly scaled tolerance;
- duplicate candidate reward-profile invariance for robust values and selected actions;
- strictly dominated action insertion;
- complete tied-optimum preservation.

## Relationship to existing ORF capabilities

Candidates F/G/K/L may preserve a finite set of plausible or maximum-likelihood candidates after evidence analysis. Candidate M can consume a caller-prepared action-value matrix for such an unresolved set without inventing candidate weights.

Candidate I acts before evidence collection and chooses among prospective observation designs. Candidate M acts after caller-supplied candidate-specific action values exist.

Existing `FiniteDecisionProcess` APIs evaluate or optimize one supplied state-transition decision process. Candidate M does not alter those APIs and does not solve a state-transition process itself.

## Explicit exclusions

Candidate M v1 does not authorize or imply:

- Bayesian candidate priors or posterior probabilities;
- candidate probability or likelihood weighting;
- equal-candidate-probability assumptions;
- minimax regret;
- CVaR, variance penalties, utility curvature, or other risk objectives;
- arbitrary candidate weights or score functions;
- randomized or mixed actions;
- continuous action optimization;
- automatic action generation;
- learning while acting;
- adaptive or sequential observation design;
- cyclic/general MDP optimization;
- discounted infinite-horizon dynamic programming;
- average-reward dynamic programming;
- stochastic shortest-path optimization;
- causal or counterfactual claims;
- a new Wave, Level, principal application, or Showcase;
- EXTREP changes;
- release of `QUALIFIED_SCOPE_HOLD`.

The historical project-wide analytical subject remains unchanged. Candidate M, if qualified, is registered as a separate targeted analytical subject.
