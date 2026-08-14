# Candidate X — finite hidden-state evidence-mask conditioning v1

Authority: `ORF-ABC-HIDDEN-STATE-EVIDENCE-MASK-CONDITIONING-FOUNDATION-v1`

Operating mode: `QUALIFIED_SCOPE_HOLD`

## Scope

Candidate X adds fixed-model conditioning on one binary admissible hidden-state set per observation time while preserving Candidate C timing (`X_0 ~ pi`, emit `Y_0`, then transition-and-emit), terminal implicit self-retention, exact observation-kernel semantics, impossibility honesty and direct-probability underflow separation.

Candidate X uses a dedicated non-breaking API. Existing Candidate C/H/R request and runtime entry points remain unchanged.

## Binary state evidence

For each observation time `t`, the request supplies `S_t`, represented by `stateEvidenceMasks[t]`, a finite array of admissible hidden-state IDs. Membership is binary only:

`m_t(i) = 1[i in S_t]`.

The complete conditioning event is

`E_X = {Y_0=y_0,...,Y_T=y_T} intersect intersection_t {X_t in S_t}`.

Masks are evidence. They do not delete transitions, rewrite the supplied model or represent causal interventions.

## Outputs

For valid input Candidate X returns, where defined:

- prefix filtering `P(X_t | Y_0...Y_t, X_0 in S_0,...,X_t in S_t)`;
- full-sequence smoothing `P(X_t | E_X)`;
- adjacent pairwise smoothing `P(X_t,X_{t+1} | E_X)`;
- posterior expected transition counts;
- combined evidence log likelihood and direct probability;
- diagnostics that distinguish mathematical impossibility from Float64 direct-probability underflow.

Future observations and future masks may revise earlier smoothing and pairwise posteriors. They must not influence earlier prefix filtering.

## Required reductions

If every `S_t` is the full declared hidden-state set, Candidate X mathematically reduces exactly to:

- Candidate C filtering and observation-sequence likelihood;
- Candidate H full-sequence hidden-state smoothing;
- Candidate R pairwise smoothing and posterior expected transition counts.

Numerical qualification checks independently implemented recurrences within disclosed tolerances rather than requiring bit-for-bit identity.

## Required discriminator

Qualification includes a two-state fixture with initial `(0.5,0.5)`, stay probability `0.9`, switch probability `0.1`, an uninformative observation symbol, three observations, and masks `S_0=S_1={A,B}`, `S_2={A}`.

Earlier prefix filters remain `(0.5,0.5)`, while full smoothing becomes `(0.82,0.18)`, `(0.90,0.10)`, `(1,0)`. The first pairwise posterior is `AA=0.81`, `AB=0.01`, `BA=0.09`, `BB=0.09`.

This rejects future-mask leakage into filtering, local posterior zeroing-and-renormalization, and pairwise endpoint-only masking.

## Independent qualification

The primary oracle independently enumerates complete hidden trajectories, multiplies initial, transition, emission and binary-mask factors, normalizes possible path mass, and aggregates smoothing and pairwise marginals plus expected transition counts.

Prefix filtering uses a separate prefix-only enumeration oracle that never sees future observations or future masks.

Production Candidate X recurrence is not used as its own expected-value oracle.

## Failure and impossibility semantics

Malformed mask containers, mask-length mismatch, unknown or duplicate state IDs, invalid Candidate X tolerances, mass/consistency violations and non-finite analytical results are hard failures.

An empty mask is valid evidence for the empty event and returns analytical success with `possible=false`. Non-empty masks may likewise be dynamically incompatible with initial mass, transitions or exact observations; those cases also return `possible=false` without fabricated smoothing, pairwise or expected-count outputs.

Direct Float64 combined-evidence probability underflow remains distinct from impossibility when finite log likelihood and posterior quantities remain available.

## Compatibility boundary

Candidate C/H/R remain independently callable and unchanged. Candidate V and W parameter re-estimation remain unchanged and do not consume Candidate X masked posterior statistics in this qualification. Candidate S/T/U semantics also remain unchanged.

## Explicit exclusions

Candidate X v1 does not authorize or imply:

- modification of existing Candidate C/H/R request types or runtime entry points;
- parameter learning or re-estimation inside Candidate X;
- Candidate V/W learning from state-masked posterior statistics;
- soft state evidence or generic non-negative evidence likelihood factors;
- probabilistic or confidence-weighted hidden-state labels;
- coarsened or set-valued observation evidence;
- missing-observation mechanism modelling;
- causal intervention such as `do(X_t=i)`;
- transition disabling or model rewriting as a mask implementation;
- iterative EM/Baum-Welch, trajectory weights or streaming/stochastic EM;
- topology/alphabet/state-number discovery;
- hidden-state creation, deletion, merge or split;
- Viterbi/MAP decoding;
- Bayesian model or parameter posterior inference;
- adaptive observation design or MDP optimization;
- causal/counterfactual or global structural-identification claims;
- a new Wave, Level, principal application or Showcase;
- EXTREP changes; or
- release of `QUALIFIED_SCOPE_HOLD`.
