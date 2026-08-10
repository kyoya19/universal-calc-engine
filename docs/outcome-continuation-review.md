# 成果還元関数 continuation review

## Purpose

This document is the current review surface for deciding what should be implemented next without depending on private conversation history or PR count.

## Current position

The repository now has two clearly separated layers.

### Kiyotan-style forward v1 candidate

```text
checked external model input
→ parameter / formula resolution
→ structured model validation
→ expansion / evaluation
→ expected reward
→ expected elapsed time
→ optional reachability
→ ratio-of-expectations reward rate
→ contribution output
→ optional named reward axes
→ convergence diagnostics
→ structured forward result
```

Higher-level forward analysis includes:

```text
same model + baseline/candidate parameters
→ structured scenario comparison
```

and:

```text
same model + baseline + one selected parameter + candidate values
→ one-at-a-time sensitivity
```

The authoritative implementation boundary is documented in:

```text
docs/forward-v1-support-matrix.md
```

### Minimal Seikatan-style reverse PoC

ObservationDataset remains separate evidence, and the first reverse production path now estimates one declared unknown parameter over a finite candidate set:

```text
parameterized model
+ fixed parameter values
+ one unknown parameter
+ finite candidate values
+ transition_count observations
+ optional numeric range constraint
→ resolve and validate each candidate
→ complete-category transition multinomial log-likelihood
→ rank candidates
→ maximum-likelihood estimate over the supplied candidate set
```

The public reverse entry point is:

```text
estimateDiscreteParameterFromTransitions
```

The mathematical contract is documented in:

```text
docs/discrete-reverse-estimation.md
```

## Forward assessment

The forward side is sufficiently integrated to be treated as a **v1 candidate** rather than an unfinished collection of isolated solver functions.

A third party can provide checked model input, vary parameters, receive several forward outputs, compare scenarios, and run one-at-a-time sensitivity without modifying the core for a specific domain.

TeX and report support remain partial output boundaries and are not represented as complete renderers of every forward result.

## Reverse assessment

The reverse side has crossed from “observation boundary only” to a small but real estimation capability.

The current estimator deliberately separates:

- unknown parameter,
- fixed supplied parameters,
- finite candidate values,
- constraint,
- observations,
- likelihood,
- estimate over the discrete candidate set.

It does not copy observed frequency directly into a parameter.

It does not introduce prior/posterior terminology.

### Current likelihood

The current likelihood is:

```text
transition_multinomial_complete_categories
```

For each scored origin state, every modeled outgoing destination requires an explicit transition_count record, including explicit zero counts.

The candidate score is a true multinomial log-likelihood. Positive observed counts with candidate probability zero receive zero likelihood without hidden epsilon smoothing.

### Current observation limitation

The first scorer uses only `transition_count` records.

`state_count` and generic `scalar` observations are still parsed and validated but are ignored by this likelihood because their observation models are not yet defined.

That is a deliberate semantic boundary rather than a missing if-statement.

### Current inference limitation

The reverse PoC is:

```text
one unknown parameter
finite candidate set
maximum likelihood over those candidates
```

It is not:

- continuous optimization,
- multiple-parameter inference,
- Bayesian inference,
- hidden-state estimation,
- confidence-interval estimation.

`relativeLikelihoodToBest` is a likelihood ratio and not a posterior probability.

## Highest-value remaining work

The next work should be selected by missing analytical value, not by ease of implementation.

### 1. Reverse external input boundary

The current reverse request is a typed TypeScript contract.

A versioned `unknown` / JSON reverse-request boundary would make the first Seikatan PoC usable by third parties with the same input-discipline principles as forward v1:

```text
external reverse request
→ syntax / shape checks
→ model document + observations + candidate request
→ reverse estimation
```

This is the leading next candidate because the mathematics now exists but the reverse request itself is not yet externally shape-checked.

### 2. State-count observation model

`state_count` should only enter likelihood after its semantics are made explicit.

For example, if a future contract defines a state count as the number of outgoing transition opportunities from a state, it could support multinomial exposure semantics. The current generic state count does not make that promise, so it must not be silently reused as a denominator.

### 3. Additional declared observation likelihoods

Generic scalar metrics need a declared observation model before they can contribute to likelihood.

Examples might later include Gaussian measurement error or another explicit distribution, but no such model should be assumed from the metric name alone.

### 4. Multi-parameter reverse estimation

A candidate grid over more than one unknown parameter is conceptually possible, but computational cost, candidate-space growth, ranking semantics, and identifiability should be documented first.

### 5. Bayesian layer only with real prior semantics

Prior/posterior types should only appear when an explicit prior distribution or prior mass over candidates is actually part of the computation.

Do not rename likelihood ratios as posterior probabilities.

### 6. Multi-parameter outcome attribution only with an explicit method

Scenario differences still do not imply unique causal attribution.

A later attribution layer must choose a method such as ordered marginal or Shapley-style attribution and define interaction handling.

## Conditional gaps

These should not outrank the reverse input/observation-model gaps until a generic use case proves otherwise:

- richer transition effects beyond `set_property`,
- automatic dimensional analysis,
- more scalar-expression operators,
- generated-target solver execution,
- domain-facing aliases for generic outputs.

## Maintenance gaps

Lower priority maintenance still includes:

- legacy/diagnostic solver-loop unification,
- confirmed obsolete historical-doc cleanup,
- internal organization changes that do not improve public capability.

## Current non-goals

Do not move core development toward these merely because they are available examples:

- digipachi-specific functionality,
- Juoh-specific functionality,
- a large Bayesian Seikatan engine,
- GUI implementation,
- monetization implementation,
- broad diffusion claims.

## Small-test boundary

Historical JSON/copy/text/report micro-tests remain regression coverage, but they must not become the project path again.

Tests should primarily protect:

- new production behavior,
- mathematical semantics,
- compatibility boundaries,
- meaningful failure cases.

## Preferred next production candidates

Recommended order after this minimal reverse likelihood boundary:

1. versioned checked external reverse-request input,
2. explicit state-count exposure likelihood only if its semantics are defined,
3. additional observation likelihood contracts where a generic requirement exists,
4. multi-parameter discrete estimation after candidate-space limits are explicit,
5. Bayesian prior/posterior only after an explicit prior contract exists,
6. multi-parameter attribution only after choosing a defined method.

## Suggested assistant prompt

```text
Read README.md, docs/forward-v1-support-matrix.md, docs/discrete-reverse-estimation.md, docs/observations.md, docs/external-input.md, and docs/outcome-continuation-review.md.
Treat the forward engine as the current forward-v1 candidate and the discrete transition-count maximum-likelihood estimator as the minimal Seikatan PoC.
Do not return to near-duplicate boundary tests.
Choose the production work that most improves third-party reverse input, explicit observation-model semantics, or another clearly missing analytical capability.
Do not call likelihood a posterior, do not infer a prior that is not supplied, and do not copy observations directly into parameters and call that estimation.
Keep large domain-specific models, GUI, monetization, and large Bayesian inference out of scope unless a later instruction changes the phase.
```

## Current interpretation

The project now has a credible forward-v1 candidate and a mathematically explicit first reverse-estimation capability.

The next threshold is not “add more inference features quickly.” It is to make the reverse request externally usable and to expand observation likelihoods only when their semantics are explicitly defined.
