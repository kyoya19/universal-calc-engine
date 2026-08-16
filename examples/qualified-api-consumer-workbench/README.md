# ORF Qualified API Consumer Workbench

This is a local-only consumer Workbench for the already-qualified and published `universal-calc-engine@1.1.0`.

It is a consumer layer, not a new analytical runtime, qualification campaign, package generation, hosted service, or Showcase.

## Architecture

```text
Browser UI
  -> loopback HTTP request
local Node consumer adapter
  -> exact dependency: universal-calc-engine@1.1.0
  -> package-name ESM root import only
existing qualified checked APIs
  -> existing structured handoff
consumer response envelope
  -> Browser presentation
```

The Browser is input and presentation only. The local Node process is the qualified npm consumer execution boundary. Browser-direct analytical execution is not claimed.

## Selected existing qualified APIs

The first generation intentionally exposes only the checked forward/reverse facade used by the current consumer quickstart:

- `evaluateExternalModelJson`
- `toForwardResultHandoff`
- `estimateExternalReverseJson`
- `toReverseResultHandoff`

All four are imported from the package root. There are no deep imports, repository source imports, workspace links, or `npm link` substitutions.

## Prerequisites

Use a qualified Node line:

```text
>=22.14.0 <23
or
>=24.0.0 <25
```

From this directory:

```bash
npm install --package-lock=false
npm start
```

Open:

```text
http://127.0.0.1:4173
```

The server binds only to loopback by default. This authority does not establish a public production HTTP service.

## Supported deterministic examples

The selector loads three checked fixtures:

1. `forward-success.json` — successful checked forward evaluation.
2. `forward-nonconverged.json` plus its options file — bounded iterative stop with `converged: false`.
3. `reverse-tie.json` — an exact two-candidate likelihood tie that must remain set-valued.

The JSON editor may also be modified directly. Browser parsing provides syntax guidance only. The raw analytical JSON text is sent to Node and then to the existing checked qualified API; Browser code does not duplicate analytical validation semantics.

## Consumer response contract

The adapter returns a stable consumer envelope with one of these `outcome` values:

- `qualified_api_success` — the qualified handoff reports `status: success`;
- `qualified_api_failure` — the qualified handoff reports `status: failure`;
- `consumer_input_rejected` — the Workbench request envelope itself is invalid;
- `adapter_failure` — an unexpected integration/communication failure occurred outside the analytical result.

The complete original qualified handoff is retained under `analyticalResult`. Presentation facets expose, without relabeling:

- failure stage;
- convergence / bounded non-convergence for the selected forward API;
- reverse single-parameter tie status and the complete `bestCandidateValues` set;
- reverse multi-parameter identifiability and the complete `bestAssignments` set where returned;
- qualified warnings;
- qualified limitations.

The envelope deliberately does not reduce all states to a Boolean success flag.

## Semantic display rules

The Browser must preserve the package result:

- validation failure remains failure;
- ties remain tied candidate/assignment sets;
- no first tied value is selected for UI convenience;
- `relativeLikelihoodToBest` remains a likelihood ratio, not a posterior probability;
- `converged: false` remains non-convergence and returned numerical values remain the package's explicit last approximation;
- warnings and limitations remain visible;
- finite candidate/grid claims are not widened into unrestricted global inference;
- consumer or transport failures remain separate from analytical-engine failures.

The raw structured response is displayed below the summary so the Browser summary does not replace the authoritative returned structure.

## Validation boundary

Browser-side validation is restricted to UI syntax/shape assistance. The adapter validates only its own consumer request envelope. Analytical model, observation, parameter, solver, and estimation validation is delegated to the existing checked APIs in `universal-calc-engine@1.1.0`.

## Regression

Install the exact dependency and run:

```bash
npm run validate
```

Regression covers:

- exact package/root-import boundary;
- successful forward result;
- malformed analytical JSON reported by the qualified checked API;
- consumer-envelope rejection as a distinct state;
- exact reverse tie preservation;
- bounded forward non-convergence preservation;
- presentation-model propagation of structured state.

These are consumer-integration checks, not a new analytical qualification campaign.

## CI

`.github/workflows/consumer-workbench.yml` installs only this nested consumer dependency and verifies:

1. forbidden core/deep/local coupling is absent;
2. exact `universal-calc-engine@1.1.0` is installed;
3. deterministic consumer regression passes.

The repository's existing analytical/distribution CI remains separate.

## Current limitations

This first generation deliberately does not:

- expose every qualified root API;
- execute the analytical package directly in the Browser;
- create a hosted or production service;
- add authentication, persistence, remote access, or multi-user behavior;
- replace the existing package consumer documentation;
- create new analytical semantics or APIs;
- publish a new npm version;
- claim causal, Bayesian posterior, continuous/global, or guaranteed-convergence semantics beyond existing qualified contracts.

The Workbench is a bounded local consumer interface over the current qualified package.
