import { toPresentationModel } from './presentation.mjs';

const operationSelect = document.querySelector('#operation');
const exampleSelect = document.querySelector('#example');
const documentText = document.querySelector('#document-text');
const optionsText = document.querySelector('#options-text');
const runButton = document.querySelector('#run');
const outcomeValue = document.querySelector('#outcome-value');
const apiStatusValue = document.querySelector('#api-status-value');
const failureStageValue = document.querySelector('#failure-stage-value');
const convergenceValue = document.querySelector('#convergence-value');
const ambiguityValue = document.querySelector('#ambiguity-value');
const issuesList = document.querySelector('#issues');
const warningsList = document.querySelector('#warnings');
const limitationsList = document.querySelector('#limitations');
const rawResponse = document.querySelector('#raw-response');
const browserFeedback = document.querySelector('#browser-feedback');

const EXAMPLES = {
  'forward-success': {
    operation: 'forward',
    document: '/fixtures/forward-success.json',
    options: null
  },
  'forward-nonconverged': {
    operation: 'forward',
    document: '/fixtures/forward-nonconverged.json',
    options: '/fixtures/forward-nonconverged.options.json'
  },
  'reverse-tie': {
    operation: 'reverse',
    document: '/fixtures/reverse-tie.json',
    options: null
  }
};

function prettyText(value) {
  return value === null || value === undefined
    ? '—'
    : typeof value === 'string'
      ? value
      : JSON.stringify(value, null, 2);
}

function renderList(element, items) {
  element.replaceChildren();
  if (items.length === 0) {
    const li = document.createElement('li');
    li.textContent = 'none';
    element.append(li);
    return;
  }
  for (const item of items) {
    const li = document.createElement('li');
    li.textContent = item.code
      ? `${item.code}: ${item.message ?? ''}`
      : JSON.stringify(item);
    element.append(li);
  }
}

function render(response) {
  const view = toPresentationModel(response);
  outcomeValue.textContent = view.outcome;
  apiStatusValue.textContent = prettyText(view.apiStatus);
  failureStageValue.textContent = prettyText(view.failureStage);
  convergenceValue.textContent = prettyText(view.convergence);
  ambiguityValue.textContent = prettyText(view.ambiguity);
  renderList(issuesList, view.issues);
  renderList(warningsList, view.warnings);
  renderList(limitationsList, view.limitations);
  rawResponse.textContent = JSON.stringify(response, null, 2);
}

function browserRejected(code, path, message) {
  return {
    schemaVersion: 1,
    kind: 'qualified_api_consumer_workbench_response',
    operation: operationSelect.value,
    executionBoundary: 'browser_input_guidance_only',
    package: {
      name: 'universal-calc-engine',
      version: '1.1.0',
      importBoundary: 'package-name ESM root'
    },
    outcome: 'consumer_input_rejected',
    consumerIssues: [{ code, path, message }],
    analyticalResult: null,
    facets: {
      failureStage: null,
      convergence: null,
      ambiguity: null,
      warnings: [],
      limitations: []
    }
  };
}

async function loadExample(name) {
  const example = EXAMPLES[name];
  if (!example) return;

  operationSelect.value = example.operation;
  optionsText.disabled = example.operation === 'reverse';
  const docResponse = await fetch(example.document, { cache: 'no-store' });
  documentText.value = await docResponse.text();

  if (example.options) {
    const optionsResponse = await fetch(example.options, { cache: 'no-store' });
    optionsText.value = await optionsResponse.text();
  } else {
    optionsText.value = '{}';
  }

  browserFeedback.textContent =
    'Fixture loaded. Execution has not started until Run is pressed.';
}

exampleSelect.addEventListener('change', () => {
  void loadExample(exampleSelect.value);
});

operationSelect.addEventListener('change', () => {
  const reverse = operationSelect.value === 'reverse';
  optionsText.disabled = reverse;
  if (reverse) optionsText.value = '{}';
});

runButton.addEventListener('click', async () => {
  browserFeedback.textContent = '';

  try {
    JSON.parse(documentText.value);
  } catch (error) {
    browserFeedback.textContent =
      `Browser syntax guidance: ${error instanceof Error ? error.message : 'invalid JSON'}. ` +
      'The request will still be sent to the qualified checked API.';
  }

  let options = {};
  if (operationSelect.value === 'forward') {
    try {
      options = JSON.parse(optionsText.value || '{}');
    } catch (error) {
      render(
        browserRejected(
          'invalid_forward_options_json',
          '$.options',
          error instanceof Error ? error.message : 'Invalid forward options JSON.'
        )
      );
      return;
    }
  }

  const request = {
    schemaVersion: 1,
    operation: operationSelect.value,
    documentText: documentText.value,
    ...(operationSelect.value === 'forward' ? { options } : {})
  };

  try {
    const response = await fetch('/api/run', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request)
    });
    const body = await response.json();
    render(body);
  } catch (error) {
    render({
      schemaVersion: 1,
      kind: 'qualified_api_consumer_workbench_response',
      operation: operationSelect.value,
      executionBoundary: 'browser_to_local_node_communication',
      package: {
        name: 'universal-calc-engine',
        version: '1.1.0',
        importBoundary: 'package-name ESM root'
      },
      outcome: 'adapter_failure',
      consumerIssues: [
        {
          code: 'browser_adapter_communication_failure',
          path: '$',
          message: error instanceof Error ? error.message : 'Local adapter communication failed.'
        }
      ],
      analyticalResult: null,
      facets: {
        failureStage: null,
        convergence: null,
        ambiguity: null,
        warnings: [],
        limitations: []
      }
    });
  }
});

await loadExample('forward-success');
