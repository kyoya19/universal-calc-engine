# Candidate W — finite hidden-state multiple-trajectory joint parameter re-estimation v1

Authority: `ORF-ABC-HIDDEN-STATE-MULTI-TRAJECTORY-JOINT-PARAMETER-REESTIMATION-FOUNDATION-v1`

Operating mode: `QUALIFIED_SCOPE_HOLD`

## Scope

Candidate W adds exactly one finite hidden-state joint M-step over one finite non-empty collection of mutually independent finite non-empty observation trajectories. Every trajectory uses the same supplied immutable current hidden-state model `theta=(pi,A,B)`, fixed hidden-state set, fixed transition topology, fixed observation alphabet and Candidate C/H/R timing and terminal semantics.

No trajectory receives a parameter update before all trajectory E-step sufficient statistics have been frozen and aggregated.

## Common-current-model per-trajectory E-steps

For every trajectory `k`, Candidate W obtains posterior state and pairwise-transition statistics under the same current `theta`:

- `G_i^(k) = gamma_0^(k)(i)`;
- `Nbar_ij^(k) = sum_t xi_t^(k)(i,j)` over learnable transition times;
- `M_i^(k)(a) = sum_t gamma_t^(k)(i) 1[Y_t^(k)=a]`.

The production operation does not call Candidate V as a per-trajectory update supplier. For trajectories containing transitions it uses Candidate R-compatible pairwise posteriors; one-observation trajectories use Candidate H-compatible smoothing.

## Aggregated sufficient statistics

After every trajectory E-step has been evaluated under the unchanged current model, Candidate W aggregates:

`G_i = sum_k G_i^(k)`

`Nbar_ij = sum_k Nbar_ij^(k)`

`M_i(a) = sum_k M_i^(k)(a)`

`D_i = sum_j Nbar_ij`

`E_i = sum_a M_i(a)`.

For `K` independent trajectories the initial-distribution M-step is

`pi'_i = G_i / K`.

## Simultaneous joint M-step

Transition rows with `D_i > countTolerance` use `A'_ij = Nbar_ij / D_i` over the fixed declared topology. Equivalent parallel transition entries preserve Candidate S conditional proportions. Rows with `D_i <= countTolerance` retain their current transition row. Terminal implicit self-retention remains structural and unlearned.

Observation-kernel rows with `E_i > countTolerance` use `B'_i(a) = M_i(a) / E_i`. Rows with `E_i <= countTolerance` retain their current observation-kernel row.

`pi'`, `A'` and `B'` are constructed solely from the frozen aggregate statistics and are applied simultaneously once.

## Required reductions and discriminators

For `K=1`, Candidate W must reduce to Candidate V within the disclosed numerical tolerance.

Equal replication of every trajectory multiplies sufficient statistics but must not change the normalized updated parameters. Reordering trajectories must not change the result.

Candidate W is not sequential Candidate V chaining. A fixture must distinguish the common-current batch result from processing one trajectory with Candidate V, applying that update, and then processing the next trajectory under the modified model.

Candidate W is also not trajectory concatenation. Trajectory boundaries carry independent initial draws and no transition crosses a boundary. A fixture must distinguish the W result from applying Candidate V to one concatenated observation sequence.

## Total realized likelihood

For possible datasets, Candidate W independently evaluates the total realized log likelihood

`sum_k log P_theta(Y^(k))`

under the current model and again under the simultaneously updated model `theta'`.

The one-step consistency requirement is

`sum_k log P_theta'(Y^(k)) >= sum_k log P_theta(Y^(k)) - likelihoodTolerance`.

This is a one-step finite-data EM consistency condition only. It is not an iterative convergence, global optimum, structural identification or truth-recovery guarantee.

## Independent qualification

The primary oracle independently enumerates every complete hidden path for every small finite trajectory under the current model. It normalizes posterior path mass separately within each trajectory, independently aggregates initial-state, transition and emission sufficient statistics across trajectories, constructs the simultaneous joint update, and independently recomputes both current and updated total realized likelihoods.

The oracle does not call Candidate W production recurrence and does not use Candidate V, S, T or U production re-estimation as its expected-value oracle.

Qualification includes K=1 reduction, trajectory-order invariance, equal-replication invariance, zero-departure and zero-occupancy retention, impossible-dataset honesty, direct probability-underflow separation, anti-sequential-V and anti-concatenation discriminators, and checked deterministic serialization.

## Failure and impossibility semantics

An empty trajectory collection or an empty member trajectory is invalid input.

If any otherwise valid trajectory is mathematically impossible under the supplied current model, the dataset is represented as `possible=false`; Candidate W does not fabricate an updated parameter set. Direct floating-point probability underflow remains distinct from mathematical impossibility when finite/log-domain likelihood remains available.

## Compatibility boundary

Candidate C filtering/likelihood, Candidate H smoothing, Candidate R pairwise smoothing, Candidate S/T/U blockwise one-step re-estimation and Candidate V single-trajectory common-E-step joint re-estimation remain unchanged and independently callable.

## Explicit exclusions

Candidate W v1 does not authorize or imply:

- sequential Candidate V updates as a batch substitute;
- trajectory concatenation as a batch substitute;
- trajectory weights or sample weights;
- iterative EM or iterative Baum-Welch;
- automatic convergence loops or stopping criteria;
- online, streaming, mini-batch or stochastic EM;
- pseudocounts, regularization, shrinkage or Bayesian priors;
- Bayesian parameter posteriors or uncertainty intervals;
- transition-topology, observation-alphabet, hidden-state topology or state-number discovery;
- hidden-state creation, deletion, merge, split or label-switching resolution;
- continuous observation distributions or generic/gradient optimization;
- Viterbi/MAP trajectory decoding;
- adaptive/sequential observation design;
- cyclic/general MDP optimization;
- causal interpretation;
- global structural identification or global maximum-likelihood guarantees;
- a new Wave, Level, principal application or Showcase;
- EXTREP changes; or
- release of `QUALIFIED_SCOPE_HOLD`.
