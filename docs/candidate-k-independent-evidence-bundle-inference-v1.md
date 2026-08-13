# Candidate K — Finite Independent Evidence-Bundle Candidate Inference v1

Authority: `ORF-ABC-FINITE-INDEPENDENT-EVIDENCE-BUNDLE-INFERENCE-FOUNDATION-v1`

Operating mode: `QUALIFIED_SCOPE_HOLD`

## Purpose

Candidate K adds a finite Seikatan aggregation layer over already-qualified Candidate F hidden-observation candidate likelihoods and Candidate G first-passage candidate likelihoods.

A request supplies one finite candidate family and a finite non-empty bundle of evidence blocks. The caller must explicitly assert:

`evidence_blocks_conditionally_independent_given_candidate`

Under that declared assumption, Candidate K adds finite per-block log likelihoods for each candidate and performs maximum-likelihood comparison on the total log likelihood.

## Supported evidence blocks

v1 accepts three block kinds:

- `hidden_observation_sequence`
- `first_passage_exact_hit`
- `first_passage_not_hit_by_horizon`

Each block has a unique `blockId` and exactly one binding for every candidate in the top-level finite candidate family.

Hidden-observation bindings retain Candidate C/F semantics: fixed finite `DefinitionModel`, Candidate-A-compatible initial distribution, known finite observation alphabet/kernel, and one finite non-empty observation sequence.

First-passage bindings retain Candidate B/G semantics: fixed finite `DefinitionModel`, Candidate-A-compatible initial distribution, finite non-empty target set, step-0 first-entry convention, and one exact-hit or finite right-censored observation.

## Candidate identity and values

Candidate IDs are declared once at the request top level. Optional candidate values are JSON scalars and are also declared only at the top level. Evidence blocks bind channel-specific analytical inputs by `candidateId`; they do not redefine candidate values.

Output is canonically ordered by candidate ID and block ID. Input ordering must not affect selection.

## Mathematical contract

For candidate `i` and evidence block `b`, let the already-qualified channel likelihood be:

`L[i,b] = P(evidence block b | candidate i)`

For every mathematically possible block, define:

`ell[i,b] = log L[i,b]`

Under the explicit conditional-independence declaration:

`L[i] = product_b L[i,b]`

and production ranking uses:

`ell[i] = sum_b ell[i,b]`

rather than multiplying direct Float64 probabilities.

If any required block is mathematically impossible for candidate `i`, the joint candidate is mathematically impossible. The result retains the exact `blockId` values that caused impossibility instead of silently dropping the candidate.

If `exp(ell[i])` underflows to Float64 zero while `ell[i]` remains finite, the candidate remains mathematically possible and rankable. `jointProbabilityUnderflowed` reports that representational condition.

## Selection semantics

Among joint-possible candidates:

`ell* = max_i ell[i]`

Every candidate satisfying:

`abs(ell[i] - ell*) <= comparisonTolerance`

belongs to the complete selected set.

Classification is one of:

- `unique_maximum_likelihood`
- `tied_maximum_likelihood`
- `all_candidates_impossible`

Input order or candidate ID lexical order may not break a tie.

## Independence boundary

Core validates the literal independence declaration but does not claim to prove empirical/statistical independence.

A caller must not split multiple observations extracted from one dependent trajectory into separate blocks merely to multiply their likelihoods. In particular, hidden-observation evidence and first-passage evidence from the same stochastic trajectory require a separately modeled joint-likelihood capability; Candidate K does not qualify naive multiplication for that case.

## Explicit non-claims

Candidate K does not add or imply:

- Bayesian candidate priors
- posterior candidate probabilities
- posterior normalization
- Bayes-factor inference as a separately qualified family
- arbitrary evidence weights or likelihood exponents
- automatic statistical independence testing
- automatic evidence de-duplication
- dependent-evidence combination
- same-trajectory hidden-observation + first-passage joint likelihood
- continuous parameter fitting
- automatic candidate-family generation
- unknown observation-kernel learning
- infinite-horizon absorption inference
- stationary/limiting distributions
- smoothing or Viterbi decoding
- global structural identifiability
- causal inference
- new Wave, Level, principal application, Showcase, EXTREP change, or HOLD release

A unique maximum-likelihood candidate is unique only inside the supplied finite family, supplied evidence bundle, declared independence semantics, and disclosed tolerance. It is not a model-truth claim.

## Failure semantics

The API returns explicit failures for invalid options, missing/wrong independence declaration, invalid or duplicate candidate IDs, invalid candidate scalar values, empty/duplicate evidence blocks, candidate-binding mismatch, channel-specific Candidate F/G validation failure, resource-limit violation, non-finite analytical aggregation, and checked serialization of forged non-finite results.

Channel-specific analytical impossibility is not a request failure. It contributes to joint candidate impossibility and remains provenance-bearing analytical output.

## Qualification requirements

Candidate K qualification uses independent expected-value construction rather than Candidate K production aggregation:

1. complete finite hidden-path enumeration plus complete finite first-passage path enumeration, followed by independent bundle likelihood multiplication/log summation;
2. independently constructed dense hidden forward propagation plus dense killed-chain first-passage propagation, followed by independent bundle ranking;
3. closed-form underflow fixtures where direct joint Float64 probability becomes zero but finite total log likelihood preserves ordering.

Metamorphic coverage includes candidate-order invariance, evidence-block-order invariance, block-binding-order invariance, likelihood-one neutral blocks, common-factor blocks, exact tie preservation, impossibility provenance, resource/failure boundaries, candidate-value preservation, and deterministic checked serialization.
