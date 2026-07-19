# 成果還元関数 sample policy

## Purpose

This document defines how application samples should be used in the 成果還元関数 project.

Application samples are useful, but they must not define the project identity too early.

The current purpose of samples is to improve reviewability, reveal missing core capabilities, and show whether the core engine can support reusable outcome analysis.

Samples are not currently for broad diffusion, commercial claims, product UI, monetization, or domain-specific promotion.

## Why samples matter

Without samples, the project can look like an abstract probability-state-transition engine.

Good samples help reviewers answer these questions:

- What can this model evaluate?
- What result types are missing?
- Which parts belong in the core engine?
- Which parts are domain-specific and should stay outside the core?
- Can a future contributor choose the next small production PR without private context?

Samples are therefore part of continuation judgment, not a promise that the project must be handed off or diffused.

## Main risk

The main risk is that a sample becomes mistaken for the identity of the project.

The project should remain a core outcome-evaluation engine.

A sample should demonstrate a reusable pattern, not pull the repository into a narrow domain.

## Preferred sample order

Recommended order:

1. Sugoroku or another already-established neutral baseline.
2. A small non-gambling sport or skill sample.
3. A learning or practice-planning sample.
4. A business, task, or workflow decision sample.
5. Later representative gaming samples, if the core engine is strong enough.

This order keeps the project understandable without making it look like a domain-specific gaming or gambling calculator.

## Recommended first new sample families

### Sugoroku

Sugoroku remains the safest baseline sample because it is simple, explicit, and already present in the project history.

It can show states, transitions, probabilities, rewards, reachability, and contribution without requiring private context or domain expertise.

### Table tennis or simple sport

A simple sport sample can show skill, success probability, win probability, and intermediate states without implying gambling use.

Example states may include:

```text
serve
receive
rally_advantage
rally_disadvantage
point_won
point_lost
```

This kind of sample can validate reachability or win probability after the core solver supports it.

### Learning or practice planning

A learning sample can show how actions affect future competence, retention, or score outcomes.

Example states may include:

```text
not_started
studied_once
reviewed
understood
forgotten
passed
failed
```

This kind of sample is useful for explaining that 成果還元関数 can evaluate progress and contribution beyond monetary outcomes.

### Business or workflow decision

A small business or workflow sample can show conversion, loss, follow-up, and expected value without requiring gambling-specific terminology.

Example states may include:

```text
lead
contacted
proposal_sent
won
lost
follow_up
```

This kind of sample should remain abstract until the core API and result surfaces are stable.

## Gaming samples

Digipachi and slot-machine samples may be valuable later as complex representative samples.

They should be treated as later domain-specific validation cases, not as the primary project identity.

They should be separated from core docs and should not be used as the first explanation of the repository.

Gaming samples must not encourage gambling behavior, practical betting advice, store targeting, or real-world play promotion.

If they are added later, they should be framed as complex probability, time, and contribution-analysis examples.

## Gaming sample conditions

Before adding digipachi, slot, or similar samples, the repository should have:

- a stable core forward-evaluation surface
- expected reward and reachability or win probability
- clear separation between core engine and sample domain
- no dependency on private context
- no claim of broad social value from the gaming sample alone
- a documented reason why the sample tests a missing general capability

## Good sample properties

A good sample is:

- small
- explicit
- reproducible
- non-private
- domain-light
- easy to read
- connected to one missing core capability
- usable by a future assistant or contributor without private conversation history

A good sample should make one project decision easier.

For example:

```text
Can the engine calculate reachability probability separately from expected reward?
```

or:

```text
Can time-cost evaluation be represented without changing the core state model?
```

## Bad sample properties

Avoid samples that are:

- too domain-specific
- too large
- dependent on private context
- mainly promotional
- mainly monetization-oriented
- likely to make the repository look like a gambling-advice project
- likely to restart micro-test-only progress
- likely to require broad production features before the core API is ready

## Relationship to continuation review

This policy should be read together with `docs/outcome-continuation-review.md`.

The continuation review asks whether the project is worth continuing, pausing, narrowing, expanding, or handing off.

Samples should help answer that question.

They should not bypass it.

## Current recommendation

The current recommended path is:

1. Keep the newly added reachability probability solver as a core production step.
2. Avoid adding gaming samples immediately.
3. Add a small non-gambling sample only after the core reachability surface is merged and reviewed.
4. Prefer a simple sport, learning, or workflow sample before any digipachi or slot sample.
5. Keep future gaming samples in a clearly separated later-sample area.

## Suggested assistant prompt

A future assistant or contributor can start sample work with this prompt:

```text
Read README.md, docs/outcome-continuation-review.md, and docs/outcome-sample-policy.md.
Do not start from digipachi, Juoh, slot, GUI, Seikatan, or monetization.
Choose one small non-gambling sample that tests a missing general capability of the core engine.
Keep the sample small, explicit, and separate from the core engine.
Do not let the sample redefine the repository as a domain-specific calculator.
```
