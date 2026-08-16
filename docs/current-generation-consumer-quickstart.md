# Current-generation consumer quickstart

This page is the shortest supported consumer path for the currently qualified public distribution.

## Exact current package

```text
package: universal-calc-engine
version: 1.1.0
registry: npm public registry
module contract: ESM only
runtime dependencies: zero
qualified Linux x64 Node lines:
  >=22.14.0 <23
  >=24.0.0 <25
```

Install the exact current qualified version:

```bash
npm install universal-calc-engine@1.1.0
```

The package root is the supported import boundary. CommonJS `require(...)` and undocumented deep imports are not supported.

## Recommended package-name imports

For third-party checked input and stable result handoff, start with:

```ts
import {
  evaluateExternalModelJson,
  estimateExternalReverseJson,
  toForwardResultHandoff,
  toReverseResultHandoff
} from 'universal-calc-engine';
```

Lower-level qualified APIs remain exported for callers that need them, but external JSON or otherwise untrusted input should enter through the checked facade rather than being treated as validated merely because `JSON.parse` succeeded.

## Minimal checked forward path

```ts
import {
  evaluateExternalModelJson,
  toForwardResultHandoff
} from 'universal-calc-engine';

const document = {
  schemaVersion: 1,
  modelKind: 'base',
  parameterValues: {},
  model: {
    startState: 'start',
    states: [
      { id: 'start' },
      { id: 'done', terminal: true }
    ],
    parameters: [],
    transitions: [
      {
        from: 'start',
        to: 'done',
        probability: 1,
        reward: 1
      }
    ]
  }
};

const evaluation = evaluateExternalModelJson(JSON.stringify(document));
const handoff = toForwardResultHandoff(evaluation);

console.log(JSON.stringify(handoff, null, 2));
```

The checked forward path keeps these failure stages distinct:

```text
json_syntax
shape
parameter_resolution
model_validation
evaluation_options
evaluation
```

A failure handoff reports its stage and issues. It does not fabricate reward, time, rate, reachability, contribution, or convergence outputs.

## Interpret structured results before using values

For a successful forward handoff, inspect at least:

```text
status
converged
validation
warnings
limitations
diagnostics
```

`status: success` does not imply that every iterative solver converged. A valid evaluation can return `converged: false` together with its last approximation and machine-readable diagnostics. Do not silently convert that state into convergence.

Reward rate keeps the qualified meaning:

```text
E[reward] / E[elapsed time]
```

It is not `E[reward / elapsed time]`.

Reachability is generic target-state probability, not automatically a domain-specific win probability. Named reward axes are not silently netted or unit-converted. Contribution outputs are descriptive analytical decompositions, not automatically causal attribution.

## Reverse / Seikatan path

For checked reverse input, use `estimateExternalReverseJson` and then `toReverseResultHandoff`.

Current checked reverse methods are finite-candidate or finite-grid methods. Result interpretation must preserve:

- tied best candidates or assignments instead of inventing one winner;
- impossible or rejected candidates as reported;
- explicit evidence blocks and assumptions;
- search limits and finite-grid identifiability boundaries;
- `priorUsed: false` and `posteriorComputed: false` where reported;
- `relativeLikelihoodToBest` as a likelihood ratio, not a posterior probability;
- scalar-prediction non-convergence as a failed evidence path rather than successful likelihood evidence.

## Local Browser Workbench

A bounded local consumer interface is available at:

- [ORF Qualified API Consumer Workbench](../examples/qualified-api-consumer-workbench/README.md)

The Workbench keeps analytical execution in a local Node adapter that installs exact `universal-calc-engine@1.1.0` and imports the checked APIs above from the package-name ESM root. Its Browser is input/presentation only.

This consumer layer adds no analytical API or package generation and does not qualify Browser-direct execution. Its response envelope keeps consumer/integration errors distinct from qualified API failures while preserving the original structured handoff, warnings, limitations, ties, and convergence status.

## Closed-Loop Foundation Showcase and npm 1.1.0

`universal-calc-engine@1.1.0` contains the current qualified root API surface used by the ORF Closed-Loop Foundation Showcase.

The repository Showcase still runs from its checked-in fixture, runner, and expected-result files because those example files are not part of the packed npm artifact. That repository reproduction path must not be misread as an API-surface limitation of 1.1.0.

The historical `universal-calc-engine@1.0.0` predates the current A-through-AJ root API surface and remains an immutable earlier distribution identity.

See:

- [Closed-Loop Foundation Showcase README](../examples/showcase/closed-loop-foundation/README.md)
- [Closed-Loop Foundation technical provenance](showcase/closed-loop-foundation.md)
- [External distribution contract v1](distribution-contract-v1.md)

## Qualified claim boundary

Current package publication does not add or imply:

```text
arbitrary real-world exact prediction
continuous inference or continuous/adaptive optimization
Bayesian prior/posterior inference
confidence or credible intervals
causal inference or causal attribution
arbitrary MDP / policy optimization
automatic general unit conversion
guaranteed convergence
guaranteed truth recovery
GUI / browser / HTTP product behavior
```

Use the package only inside the documented qualified contracts and preserve explicit failure, ambiguity, limitation, and convergence states in downstream consumer interfaces.

## License boundary

Public npm availability does not grant commercial-use permission. See `COMMERCIAL-LICENSE.md` in the package/repository before commercial use.
