# Candidate I — Finite Observation / Experiment Design v1

Authority: `ORF-ABC-FINITE-OBSERVATION-DESIGN-FOUNDATION-v1`

Candidate I adds a prior-free, non-adaptive design-selection layer for a caller-supplied finite candidate family and a caller-supplied finite set of observation designs.

## Contract

The request supplies at least two unique `candidateId` values and at least one unique `designId`. Every design supplies exactly one finite sparse categorical outcome distribution for every candidate.

Within one design, the same `outcomeId` must mean the same observable outcome for every candidate. Candidate distributions may have different sparse supports; an omitted outcome has probability zero. Every supplied distribution must total 1 within `probabilityTolerance`. Inputs are never silently normalized.

For design `d` and candidate pair `(a,b)`, Candidate I computes the total-variation distance

`TV_d(a,b) = 0.5 * sum_o |P_d,a(o) - P_d,b(o)|`

over the union of the two finite sparse supports.

The design score is

`score(d) = min_{a<b} TV_d(a,b)`.

The selected design set is the complete maximin set. If `score* = max_d score(d)`, every design satisfying

`|score(d) - score*| <= selectionTolerance`

is retained. Input order and IDs never break a numerical tie.

Every candidate pair within `selectionTolerance` of a design's minimum pairwise TV is retained as a worst-case pair.

## Meaning of the score

A positive worst-case score means every candidate pair has different supplied outcome distributions under that design. It does **not** guarantee that one realized observation identifies the correct candidate, and it is not a hypothesis-test power or global-identifiability claim.

A zero worst-case score means at least one candidate pair has identical supplied outcome distributions under that design. It does **not** prove global structural non-identifiability.

Candidate I is relative only to the supplied finite family, supplied finite design set, supplied finite categorical distributions and disclosed tolerances.

## Numerical semantics

- Float64 arithmetic is used.
- `probabilityTolerance` validates supplied distribution totals; no normalization is applied.
- `selectionTolerance` controls maximin design ties and reported worst-case-pair ties.
- Missing sparse outcomes contribute zero probability.
- Pairwise TV must remain finite and within the probability boundary.
- Results are canonically ordered by candidate ID, design ID and outcome ID.
- Checked JSON serialization rejects forged non-finite numeric values.

## Independent qualification oracles

Qualification does not use Candidate I production scoring as its expected-value oracle.

Primary oracle:

- independently compute `0.5 * L1` over the union of finite supports;
- brute-force the minimum over unordered candidate pairs;
- brute-force the maximum over designs.

Secondary oracle:

- enumerate every subset of a small finite outcome alphabet and use the variational identity
  `TV(P,Q) = max_A |P(A)-Q(A)|`.

Metamorphic qualification includes candidate/design/outcome permutation, consistent outcome relabeling, explicit zero-mass support, consistent proportional support splitting, dominated-design insertion, and complete tied-optimum preservation.

## Relationship to existing ORF capabilities

Candidate D evaluates distinguishability under a fixed supplied observation design. Candidate I chooses among a finite supplied set of prospective stochastic observation designs using a distributional maximin objective.

Candidates F/G/K/L consume realized evidence for finite-candidate inference. Candidate I acts before evidence collection and does not compute candidate likelihoods or posterior probabilities.

Upstream qualified forward analyses may be used by callers to construct candidate-specific outcome distributions, but Candidate I v1 does not silently derive or alter model distributions itself.

## Explicit exclusions

Candidate I v1 does not authorize or imply:

- candidate priors, Bayesian posterior probabilities or posterior normalization;
- mutual information, expected information gain, entropy reduction or Bayes risk;
- adaptive or sequential experiment design;
- automatic design generation;
- observation cost, budget, duration or resource optimization;
- arbitrary user-supplied scoring functions or pair weights;
- sample-size or repeated-trial power optimization;
- hypothesis-test p-values, confidence intervals or error guarantees;
- continuous design variables, gradients or Fisher-information optimization;
- global structural identifiability;
- automatic candidate-family generation;
- smoothing or Viterbi decoding;
- unknown observation-kernel learning or continuous parameter fitting;
- stationary or limiting distributions;
- cyclic/general MDP optimization;
- causal inference;
- a new Wave, Level, principal application or Showcase;
- EXTREP changes;
- release of `QUALIFIED_SCOPE_HOLD`.

The historical project-wide analytical subject remains unchanged. Candidate I, if qualified, is registered as a separate targeted analytical subject.
