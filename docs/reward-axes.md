# Named reward axes

## Purpose

The legacy `reward` field represents one scalar reward channel. It remains supported and its solver semantics are unchanged.

When a model needs outcomes with different meanings or units, use the named reward-axes pipeline instead of combining those values into one scalar.

Examples of values that should remain separate include:

- revenue in JPY
- operating cost in JPY
- score in points
- safety incidents in count

## Axis definition

Each reward axis has explicit metadata:

```ts
{
  id: 'revenue',
  label: 'Revenue',
  unit: 'JPY',
  kind: 'benefit'
}
```

`kind` is one of:

- `benefit`
- `cost`
- `neutral`

The kind is descriptive metadata. The solver does not automatically negate costs, convert units, or combine axes.

## Transition values

A transition can supply values independently for declared axes:

```ts
{
  from: 'start',
  to: 'done',
  probability: 1,
  rewardsByAxis: {
    revenue: 1000,
    cost: 200,
    score: 10
  }
}
```

An omitted axis contributes zero on that transition.

A transition value for an undeclared axis is rejected during expansion.

## Pipeline

The named reward-axes pipeline mirrors the existing forward model while reusing its state, transition, probability, scalar, terminal, and time semantics:

```text
RewardAxesDefinitionModel
→ RewardAxesExpandedModel
→ RewardAxesEvaluatedModel
→ RewardAxesSolvedModel
→ RewardAxesOutputResult
→ RewardAxesContributionResult
```

Primary entry points:

```text
expandRewardAxesModel
evaluateRewardAxesModel
solveExpectedRewardAxes
toRewardAxesOutputResult
toRewardAxesContributionResult
```

## No implicit cross-axis aggregation

The engine intentionally does not compute values such as:

```text
revenue - cost + score
```

because that expression mixes meanings unless a caller supplies an explicit conversion or utility model.

Even two axes with the same physical unit remain separate when their meanings differ. For example, `revenue: JPY` and `cost: JPY` are returned independently. A later net-profit calculation must state that relationship explicitly.

## Legacy compatibility

The existing fields and functions remain valid:

```text
reward
solveExpectedReward
toOutputResult
toContributionResult
```

A reward-axes model may also contain legacy `reward` values. The legacy solver reads only `reward`; the reward-axes solver reads only `rewardsByAxis`.

This separation prevents a migration from silently changing existing calculations.
