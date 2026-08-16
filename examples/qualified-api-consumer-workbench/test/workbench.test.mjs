import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { executeConsumerRequest, QUALIFIED_PACKAGE } from '../adapter.mjs';
import { toPresentationModel } from '../public/presentation.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));

async function fixture(name) {
  return readFile(join(root, 'fixtures', name), 'utf8');
}

test('forward checked success preserves qualified handoff and package identity', async () => {
  const response = executeConsumerRequest({
    schemaVersion: 1,
    operation: 'forward',
    documentText: await fixture('forward-success.json'),
    options: {}
  });

  assert.equal(response.outcome, 'qualified_api_success');
  assert.equal(response.package.name, 'universal-calc-engine');
  assert.equal(response.package.version, '1.1.0');
  assert.equal(response.package.importBoundary, 'package-name ESM root');
  assert.equal(QUALIFIED_PACKAGE.version, '1.1.0');
  assert.equal(response.analyticalResult.status, 'success');
  assert.equal(response.analyticalResult.converged, true);
  assert.equal(response.facets.convergence.state, 'converged');
  assert.ok(response.analyticalResult.limitations.length > 0);
});

test('malformed analytical JSON remains a qualified API failure', () => {
  const response = executeConsumerRequest({
    schemaVersion: 1,
    operation: 'forward',
    documentText: '{',
    options: {}
  });

  assert.equal(response.outcome, 'qualified_api_failure');
  assert.equal(response.consumerIssues.length, 0);
  assert.equal(response.analyticalResult.status, 'failure');
  assert.equal(response.analyticalResult.stage, 'json_syntax');
  assert.equal(response.facets.failureStage, 'json_syntax');
});

test('consumer envelope rejection is distinct from analytical failure', () => {
  const response = executeConsumerRequest({
    schemaVersion: 1,
    operation: 'forward',
    options: {}
  });

  assert.equal(response.outcome, 'consumer_input_rejected');
  assert.equal(response.analyticalResult, null);
  assert.ok(response.consumerIssues.some((issue) => issue.code === 'expected_document_text'));
});

test('reverse checked facade preserves an exact tied candidate set', async () => {
  const response = executeConsumerRequest({
    schemaVersion: 1,
    operation: 'reverse',
    documentText: await fixture('reverse-tie.json')
  });

  assert.equal(response.outcome, 'qualified_api_success');
  assert.equal(response.analyticalResult.status, 'success');
  assert.equal(response.analyticalResult.selection.status, 'tied_best_candidates');
  assert.deepEqual(response.analyticalResult.selection.bestCandidateValues, [0.25, 0.75]);
  assert.equal(response.analyticalResult.selection.estimatedValue, null);
  assert.equal(response.facets.ambiguity.state, 'tied_best_candidates');
  assert.deepEqual(response.facets.ambiguity.bestCandidateValues, [0.25, 0.75]);
  assert.ok(
    response.analyticalResult.warnings.some((warning) => warning.code === 'estimate_not_unique')
  );
  assert.ok(
    response.analyticalResult.limitations.some(
      (limitation) => limitation.code === 'relative_likelihood_is_not_posterior_probability'
    )
  );
});

test('bounded forward non-convergence remains explicit success with converged=false', async () => {
  const response = executeConsumerRequest({
    schemaVersion: 1,
    operation: 'forward',
    documentText: await fixture('forward-nonconverged.json'),
    options: JSON.parse(await fixture('forward-nonconverged.options.json'))
  });

  assert.equal(response.outcome, 'qualified_api_success');
  assert.equal(response.analyticalResult.status, 'success');
  assert.equal(response.analyticalResult.converged, false);
  assert.equal(response.facets.convergence.state, 'non_converged');
  assert.ok(
    response.analyticalResult.warnings.some(
      (warning) => warning.code === 'one_or_more_solvers_did_not_converge'
    )
  );
});

test('presentation model exposes warnings, limitations, failure stage and ambiguity without rewriting them', async () => {
  const response = executeConsumerRequest({
    schemaVersion: 1,
    operation: 'reverse',
    documentText: await fixture('reverse-tie.json')
  });
  const view = toPresentationModel(response);

  assert.equal(view.outcome, 'qualified_api_success');
  assert.equal(view.apiStatus, 'success');
  assert.equal(view.ambiguity.state, 'tied_best_candidates');
  assert.ok(view.warnings.some((warning) => warning.code === 'estimate_not_unique'));
  assert.ok(view.limitations.length > 0);
});

test('browser shell states the runtime and package boundary', async () => {
  const html = await readFile(join(root, 'public', 'index.html'), 'utf8');
  assert.match(html, /Browser input\/presentation only/);
  assert.match(html, /universal-calc-engine@1\.1\.0/);
  assert.match(html, /local Node adapter/);
});
