# Candidate C — Finite Hidden-State Observation Foundation v1

Authority: `ORF-ABC-HIDDEN-STATE-OBSERVATION-FOUNDATION-v1`

## Capability

This targeted capability computes finite observation-sequence likelihood and forward hidden-state filtering for:

- a validated finite `DefinitionModel`;
- an explicit finite initial state distribution;
- a finite non-empty observation alphabet;
- a known finite state-conditioned observation kernel; and
- a finite non-empty realized observation sequence.

It is a fixed-model hidden-state conditioning capability. It is not parameter-posterior inference, model selection, unknown-kernel learning, or a global identifiability solver.

## Time convention

Let `X_t` be the hidden state and `Y_t` the observation.

1. `X_0 ~ mu_0`.
2. `Y_0` is emitted from `X_0` before any transition.
3. For `t > 0`, predict `X_t` from the previous filtered distribution through the transition kernel, then emit `Y_t` from `X_t`.

Thus:

- `q_0 = mu_0`;
- for `t > 0`, `q_t(s) = sum_r b_(t-1)(r) P(r,s)`;
- `c_t = sum_s q_t(s) B_s(y_t)`;
- when `c_t > 0`, `b_t(s) = q_t(s) B_s(y_t) / c_t`.

The possible-sequence log likelihood is

`log P(y_0,...,y_T) = sum_t log(c_t)`.

The implementation uses the scaling factors `c_t`, not unscaled full-path mass propagation, to keep the filtering recursion stable over finite sequences.

## Initial distribution

The initial distribution follows the Candidate A validation convention:

- state IDs must exist;
- duplicate state entries fail;
- probabilities must be finite and in `[0,1]`;
- omitted states have probability zero;
- total probability must be within the disclosed probability tolerance of one;
- no silent input normalization or correction is applied.

Default probability tolerance: `1e-9`.

## Observation alphabet and kernel

The observation alphabet is a finite, non-empty set of unique, non-empty strings.

The kernel entry

`{ stateId, symbol, probability }`

means `P(Y_t = symbol | X_t = stateId)`.

For every hidden state:

- kernel probabilities must be finite and in `[0,1]`;
- duplicate `(stateId, symbol)` entries fail;
- omitted state-symbol entries are zero;
- the full row across the declared alphabet must sum to one within tolerance;
- kernel rows are never silently normalized.

This representation supports finite state aliasing/coarsening and known noisy emissions. A categorical censored/coarsened observation is supported only when that category is explicitly represented in the alphabet/kernel.

## Terminal semantics

Terminal states use implicit self-retention with probability one during hidden-state prediction. Outgoing transitions declared from a terminal state do not drive propagation, matching Candidate A semantics.

## Impossible observation sequences

A zero evidence factor `c_t = 0` does not mean the request is malformed. It means the realized prefix is mathematically impossible under the supplied model, initial distribution, and observation kernel.

The function returns `ok: true` with:

- `possible: false`;
- `sequenceProbability: 0`;
- `logLikelihood: null`;
- `diagnostics.impossibleAtStep = t`;
- a predictive distribution and zero evidence at the first impossible step;
- no fabricated filtered posterior at that step or later steps.

## Float64 underflow

For a mathematically possible sequence, `logLikelihood` is the authoritative finite likelihood representation. If `exp(logLikelihood)` underflows to zero in JavaScript float64, the result remains `possible: true`, reports `sequenceProbability: null`, and sets `diagnostics.sequenceProbabilityUnderflowed: true`.

Therefore numeric zero is reserved for a mathematically impossible sequence and is not used to disguise representational underflow.

## Result provenance and claim boundary

Diagnostics disclose:

- solver method `scaled_forward_filtering_known_observation_kernel`;
- JavaScript float64 numeric representation;
- simulation not used;
- no input normalization;
- posterior normalization performed by Bayes conditioning;
- the step-0 emission convention;
- terminal implicit self-retention;
- tolerance and resource limit;
- impossible-step and underflow status;
- `globalModelIdentificationClaimed: false`;
- `parameterPosteriorComputed: false`.

Filtered state probabilities are conditional state beliefs under the supplied fixed model and known observation kernel. They must not be described as posterior probabilities over model parameters or as proof that the model/kernel is globally identified or empirically valid.

## Independent qualification oracle

Production qualification requires independent expected values rather than a copy of production filtering logic.

Primary oracle:

- enumerate complete hidden-state paths on small finite fixtures;
- multiply initial, transition, and emission probabilities directly;
- sum path probabilities consistent with each observation prefix;
- independently derive prefix likelihood and posterior end-state mass.

Secondary oracle:

- independently construct a dense transition matrix;
- apply transition-vector multiplication and state-conditioned emission weighting;
- compare predictive mass, evidence factors, and filtered mass with production output.

Metamorphic qualification includes:

- state-definition order invariance;
- transition-definition order invariance;
- observation-alphabet/kernel-entry order invariance;
- bijective observation-symbol renaming invariance;
- split-parallel-transition aggregate equivalence;
- deterministic one-to-one emissions collapsing belief to state certainty;
- identical emission rows leaving filtered belief equal to the predictive distribution.

Simulation alone is not an exact qualification oracle.

## Explicit exclusions

This v1 authority does not add:

- unknown observation-kernel estimation or learning;
- transition-parameter learning from hidden observations;
- parameter/model posterior inference or Bayesian parameter priors;
- smoothing using future observations;
- Viterbi decoding;
- continuous latent states or continuous observation distributions;
- Kalman or particle filtering;
- MCMC or variational inference;
- automatic hidden-state cardinality selection;
- general missingness or unknown censoring-mechanism inference;
- automatic experiment design;
- general structural-identifiability solving;
- first-passage, stationary-distribution, or generalized MDP optimization;
- causal or counterfactual semantics;
- a new principal application, Wave, Level, or Showcase.

`QUALIFIED_SCOPE_HOLD` remains active. This targeted capability does not rewrite historical Wave/Level evidence or replace the historical project-wide qualified subject.
