# External Independent Reproduction Task v1

Specification: `ORF-EXTERNAL-REPRODUCTION-QUALIFICATION-v1`

This is a consumer-side reproduction task for the already-qualified `universal-calc-engine@1.0.0` distribution. It does not define a new analytical capability or expand the supported analytical scope.

## Package and execution boundary

Use only the published npm package:

- package: `universal-calc-engine`
- version: `1.0.0`
- expected registry integrity: `sha512-+SvfAWnXyQsKX/M3SCj/GmJWSpR2vZHc+tw6DeYjYgA8ZEM769t0t9pX8ZomTUVG0fpTk24Ee6v9IHrPdeE25w==`
- supported Node line for this task: Node `>=22.14.0 <23` or `>=24.0.0 <25`

Create an independently controlled consumer project. Do not clone this repository as an execution dependency. Do not import repository source or `dist` by filesystem path, use `npm link`, use workspace source, or copy production implementation code.

Public README, `docs/distribution-consumer-v1.md`, `docs/package-api-v1.json`, `docs/qualified-scope-status.md`, `docs/promoted-showcases.md`, and the commercial license are permitted consumer materials.

## Independence and semi-blind protocol

Before final submission, do not access `kyoya19/universal-calc-engine-research`, Private expected-result material, Private oracle code, prior internal result JSON, or unpublished maintainer debugging instructions. Package output is an observation to compare, not an oracle.

Expected numerical/discrete answers and expected scenario rankings are intentionally withheld. Derive comparison values independently by hand, exact rational arithmetic, an independently written script, a matrix/linear solver derived from the stated equations, or another independent mathematical method.

AI/coding assistance is allowed, but record the tool/model, its role, the prompt category, and who takes final responsibility for the independent oracle. Do not provide Private project material to the assistant.

Do not finalize a result after seeing an expected-result reveal. The final pre-reveal submission must be immutable or versioned and timestamped.

## Consumption-mode requirements

Across the three cases:

1. Run ERQ-101 and at least one of ERQ-102/ERQ-103 from a plain ESM JavaScript consumer using package-name imports.
2. Compile-check or compile-and-run at least one principal case from a strict TypeScript consumer using NodeNext-compatible module resolution and package-name imports.
3. Record OS, Node, npm, and TypeScript versions.

## ERQ-101 — Checked Forward / Handoff Consumer Reproduction

Fixture ID: `FIX-EXTREP-FORWARD-BLIND-v1`

Fixture: `docs/reproduction/extrep-v1/fixtures/erq101-forward.json`

The original control numbers used during distribution qualification are already visible in Public repository history. To avoid a false blindness claim, this task uses an equivalent control fixture authorized by the reproduction fixture-derivation rule. This does not change package bytes, analytical subject, distribution subject, or analytical scope.

Use the Public checked forward/handoff APIs:

- `evaluateExternalModelJson`
- `toForwardResultHandoff`
- `forwardResultHandoffToJson`

Evaluate the fixture with reachability target `success`.

Record at least:

- `ok`
- `converged`
- expected reward from the start state
- expected elapsed time in seconds
- reachability of `success`
- reward rate per second and per hour where exposed by the result contract
- the forward handoff object and its JSON serialization

Independently derive the expected values using exact arithmetic. Compare direct finite values with absolute tolerance `1e-12`; discrete fields are exact.

## ERQ-102 — CMP605 Cyclic Multi-Parameter Round Trip

Fixture ID: `FIX-EXTREP-CMP605-v1`

Reverse fixture: `docs/reproduction/extrep-v1/fixtures/erq102-reverse.json`

Use the checked Public reverse entry point documented for external JSON, with the fixture as the complete reverse request. Record all scored assignments, the best-assignment set, and any unique estimated assignment returned by the Public contract.

Independently score the finite grid. The candidate-dependent log-likelihood is derived from the supplied transition counts and candidate transition probabilities. Fixed terminal-probability terms may be included or omitted consistently. Do not use the package output as the expected answer.

Then construct a forward model from the same transition structure by substituting the inferred `p` and `q` values as consumer-owned parameter values. This consumer substitution is part of the task and is not a claim that the package exposes a generalized automatic reconstruction API.

Run the reconstructed cyclic forward model from `G` with retirement target `T`. Record:

- inferred `p` and `q`
- expected reward from `G` and `W`
- expected elapsed time from `G` and `W`
- reward rate from `G`
- reachability of `T` from `G`

Independently solve the two-state absorbing linear system for reward and time. Use a Level A symbolic/rational derivation or Level B independently written numerical/matrix implementation. Compare cyclic numerical values with absolute tolerance `1e-10`; parameter identities are exact.

## ERQ-103 — Maintenance Decision and Ambiguity Reproduction

Principal fixture ID: `FIX-EXTREP-MAINTENANCE-v1`

Unique-evidence variant ID: `VAR-EXTREP-MAINT-UNIQUE-v1`

Unique-evidence reverse fixture: `docs/reproduction/extrep-v1/fixtures/erq103-unique-reverse.json`

Evidence-limited variant ID: `VAR-EXTREP-MAINT-AMBIG-v1`

Evidence-limited reverse fixture: `docs/reproduction/extrep-v1/fixtures/erq103-ambiguous-reverse.json`

### Variant A — full evidence

Run the checked finite multi-parameter transition-grid reverse request from the unique-evidence fixture. Record the best assignment set and unique estimate status.

Using the inferred assignment, evaluate the maintenance model for:

- baseline: `m = 0`
- intensive: `m = 1`

For each scenario record from start state `G`:

- total net reward
- expected elapsed time in hours
- net reward rate per hour
- `production_value` expected reward axis
- `maintenance_cost` expected reward axis
- retirement reachability

Independently derive the scenario values from the specified finite-state equations. State separately which scenario is preferred for total production, total net utility, net utility rate, and expected operating duration. Do not assert an objective-free optimum.

### Variant B — evidence-limited ambiguity

Run the evidence-limited fixture. Record the complete best-assignment set and whether the Public result contract returns a unique assignment.

Do not choose a tied `q` by first-row selection, midpoint, averaging, or another unstated weighting rule.

For every tied assignment returned by the finite grid, independently evaluate baseline `m = 0` and intensive `m = 1`. Record the intensive-minus-baseline delta for:

- total net reward
- net reward rate

Conclude separately whether each objective has a robust ordering across the supplied tied finite set. This task does not ask for posterior probabilities or a global structural-identifiability conclusion.

Use a Level A or Level B independent oracle. Direct scenario values are compared with absolute tolerance `1e-9`; reverse log-likelihood comparisons use absolute tolerance `1e-10` when compared numerically.

## Critical documentation-semantic assessment

Using Public documentation only, answer these questions in your own words before expected-result reveal:

- SEM-EXT-01: What does `relativeLikelihoodToBest` mean, and what probabilistic interpretation must not be assigned to it?
- SEM-EXT-02: What can a predefined scenario comparison establish, and what does it not establish about causality?
- SEM-EXT-03: How should transition contribution be interpreted, and what stronger attribution claim does it not automatically support?
- SEM-EXT-04: What follows from tied assignments on a finite candidate grid, and what global identifiability conclusion does not follow merely from that tie?
- SEM-EXT-05: How does comparison of predefined scenarios differ from an optimized policy search?

No unpublished semantic coaching is permitted.

## Adoption observations

Classify each as `PASS`, `FRICTION`, or `BLOCKING_FAILURE`, with evidence:

- ADOPT-001 install friction
- ADOPT-002 root import friction
- ADOPT-003 qualified API discovery
- ADOPT-004 input construction clarity
- ADOPT-005 error comprehension
- ADOPT-006 handoff interpretability
- ADOPT-007 TypeScript ergonomics
- ADOPT-008 qualified API vs compatibility/legacy API distinction
- ADOPT-009 limitation visibility
- ADOPT-010 commercial-license visibility

Minor friction is recordable without being a blocking failure. A required step that depends on unpublished maintainer knowledge is a blocking documentation/adoption issue.

## Clarifications

During the semi-blind execution, maintainer answers are limited to pointers to already-existing Public material. Log every clarification request and answer. Do not accept hidden API calls, expected answers, custom debugging code, Private-derived corrections, or unpublished interpretation.

## Final pre-reveal submission

Complete `docs/reproduction/extrep-v1-result-template.json` or an equivalent versioned package containing:

- reproducer identifier and independence declaration
- prior project involvement declaration
- Private-access declaration
- AI assistance disclosure
- package requested/resolved version and integrity metadata if available
- OS, Node, npm, and TypeScript versions
- consumer source files and commands
- raw package outputs
- independently computed expected outputs
- oracle formulas/derivation/code and numerical precision
- comparisons and case verdicts
- semantic answers
- clarification log
- ADOPT-001..010 observations
- suspected defects/discrepancies
- completion declaration and timestamp

Do not edit answer-changing fields after declaring the submission complete. Expected-result commitment verification and reveal occur only after the final submission is recorded.
