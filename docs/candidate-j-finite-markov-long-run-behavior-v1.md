# Candidate J — Finite Markov Long-Run Behavior v1

Authority: `ORF-ABC-FINITE-MARKOV-LONG-RUN-BEHAVIOR-FOUNDATION-v1`

Operating mode: `QUALIFIED_SCOPE_HOLD`

## Purpose

Candidate J extends the qualified finite-horizon Markov foundation into finite time-homogeneous long-run structural analysis. It classifies communicating/transient/recurrent structure, computes the period and unique stationary distribution of every closed recurrent class, computes the supplied-initial-distribution probability of eventually entering each recurrent class, and combines those quantities into the Cesàro long-run occupancy distribution.

Candidate J deliberately does **not** equate a stationary distribution with an ordinary pointwise `t -> infinity` distribution limit.

## Model and initial-distribution contract

The caller supplies:

- one finite `DefinitionModel`;
- one explicit finite initial state distribution;
- optional positive finite numerical tolerances.

Candidate J reuses existing `DefinitionModel` validation and Candidate A transition semantics. Terminal states use implicit self-retention; outgoing transition definitions on a terminal state remain ignored by analytical solvers. Non-terminal transition probabilities are used as supplied and are not silently normalized.

Initial-distribution entries must reference known states, have unique state IDs, contain finite probabilities from 0 to 1, and total 1 within `probabilityTolerance`. Omitted states receive zero initial mass. The input distribution is never silently normalized.

## Positive-probability graph

After terminal self-retention is materialized, an edge `i -> j` exists exactly when its accumulated transition probability is strictly greater than zero. `probabilityTolerance` validates row totals; it does not convert a positive transition into a zero edge or a zero transition into a positive edge.

States communicate when each is reachable from the other through positive-probability edges. Communicating classes partition the finite state set.

A communicating class is closed when no positive-probability edge leaves it. In a finite chain, every closed communicating class is recurrent. States outside all closed recurrent classes are classified transient.

Reducibility and transient states are valid analytical cases, not failures.

## Recurrent-class period

For every closed recurrent class `C`, Candidate J returns the class period

`d(C) = gcd{ n >= 1 : P^n(i,i) > 0 }`

for any state `i` in `C`. The period is common to all states in an irreducible recurrent class.

`d(C) = 1` denotes an aperiodic class. Periodic classes are valid analytical cases.

## Recurrent-class stationary distributions

For every closed recurrent class `C`, Candidate J returns its unique stationary distribution `pi_C`, satisfying

`pi_C P_C = pi_C`,

`pi_C(x) >= 0`,

and

`sum_x pi_C(x) = 1`.

The complete finite-chain stationary-distribution structure is represented by the set of class-stationary basis distributions. A global stationary distribution is unique exactly when there is one closed recurrent class. With multiple closed recurrent classes, Candidate J does not select or invent a preferred mixture.

## Initial-dependent recurrent-class entry mass

For each closed recurrent class `C_k`, Candidate J returns

`alpha_k = P_initial(eventually enter C_k)`.

For a valid finite chain these masses are non-negative and total 1 within the disclosed numerical tolerance. A recurrent class that is unreachable from the supplied initial distribution remains part of the stationary structure but receives entry probability zero.

## Cesàro long-run occupancy

Candidate J returns

`mu = sum_k alpha_k * pi_k`,

extended with zero mass on transient states.

This is the supplied-initial-distribution-dependent **Cesàro long-run occupancy distribution**, corresponding to the limit of time-averaged state distributions. For finite chains it remains well-defined when a recurrent class is periodic.

Candidate J v1 does **not** compute or claim the ordinary pointwise limit

`lim_{t -> infinity} P(X_t = .)`.

A deterministic two-cycle is therefore correctly reported as period 2 with stationary/Cesàro distribution `[1/2, 1/2]`, without claiming that its alternating pointwise state distribution converges.

## Numerical semantics

- Float64 arithmetic is used in production.
- Input probabilities are never silently normalized.
- Small negative or greater-than-one values caused only by linear-solve roundoff and lying within `linearSolveTolerance` may be clamped to the nearest probability boundary; diagnostics disclose whether this occurred.
- Stationary and recurrent-class-entry linear solutions are checked for finiteness, probability bounds, totals and residuals.
- State IDs, communicating classes, recurrent classes and distributions use deterministic canonical ordering.
- Checked JSON serialization rejects forged non-finite numeric values.

## Independent qualification oracles

Qualification does not use the production SCC or production period recurrence as its expected structural oracle.

Primary structural oracle:

- independently construct the finite transition matrix;
- compute finite transitive closure instead of Tarjan/SCC production logic;
- construct communicating classes from mutual reachability;
- enumerate elementary directed cycles in small qualification fixtures;
- take the gcd of independently enumerated cycle lengths.

Independent closed-form fixtures include:

- one-state absorbing chain;
- irreducible aperiodic two-state chain with analytically known stationary distribution;
- deterministic two-cycle;
- reducible chains with multiple absorbing classes;
- geometric transient leakage whose eventual recurrent-class entry probabilities have closed forms.

Secondary checks use independently constructed dense equations and direct residual identities for class stationarity and transient absorption, rather than production graph decomposition.

Required metamorphic/reduction qualification includes:

- state-order permutation invariance;
- transition-entry order invariance;
- initial-distribution entry-order invariance;
- equivalent parallel-transition split/merge invariance;
- explicit zero-probability edge invariance;
- initial-distribution mixture linearity for recurrent-class entry mass and Cesàro occupancy;
- unreachable recurrent-class preservation;
- Candidate A terminal self-retention compatibility;
- one-state absorbing reduction;
- deterministic two-cycle period/stationary/Cesàro semantics;
- multiple recurrent classes without fabricated global-stationary uniqueness.

## Relationship to existing ORF capabilities

Candidate A remains the authority for finite-horizon state-distribution and initial-distribution semantics. Candidate J adds structural long-run analysis without changing Candidate A.

Candidate B first-passage analysis remains separate. Candidate J may compute eventual recurrent-class entry probabilities as part of its long-run decomposition, but it does not replace finite first-passage-time distributions.

Candidates C/H hidden-state filtering/smoothing, F/G/K/L candidate inference, I observation design and M ambiguity-preserving robust decision remain unchanged.

Candidate J provides a dynamics foundation that may later support separately authorized cyclic-decision or long-run-reward capabilities, but Candidate J itself performs no action or policy optimization.

## Explicit exclusions

Candidate J v1 does not authorize or imply:

- ordinary pointwise `t -> infinity` state-distribution-limit computation;
- mixing time, spectral gap, convergence rate or cutoff analysis;
- quasi-stationary distributions;
- continuous-time Markov chains;
- countably infinite or continuous state spaces;
- time-inhomogeneous transition kernels;
- actions, policies or MDP optimization;
- discounted infinite-horizon dynamic programming;
- average-reward dynamic programming;
- stochastic-shortest-path control;
- reward or utility optimization;
- Bayesian candidate priors or posterior probabilities;
- changes to hidden-state filtering, smoothing or trajectory decoding;
- unknown transition-parameter learning or continuous fitting;
- global structural identification;
- causal or counterfactual claims;
- adaptive/sequential observation design;
- a new Wave, Level, principal application or Showcase;
- EXTREP changes;
- release of `QUALIFIED_SCOPE_HOLD`.

The historical project-wide analytical subject remains unchanged. Candidate J, if qualified, is registered as a separate targeted analytical subject.
