import { toGuidedDocumentText } from './guided-input.mjs';
import { toPresentationModel } from './presentation.mjs';

const operationSelect = document.querySelector('#operation');
const inputModeSelect = document.querySelector('#input-mode');
const exampleSelect = document.querySelector('#example');
const guidedInput = document.querySelector('#guided-input');
const fixtureInput = document.querySelector('#fixture-input');
const guidedForward = document.querySelector('#guided-forward');
const guidedReverse = document.querySelector('#guided-reverse');
const forwardReward = document.querySelector('#forward-reward');
const forwardElapsed = document.querySelector('#forward-elapsed');
const reverseCandidateA = document.querySelector('#reverse-candidate-a');
const reverseCandidateB = document.querySelector('#reverse-candidate-b');
const reverseCountA = document.querySelector('#reverse-count-a');
const reverseCountB = document.querySelector('#reverse-count-b');
const documentText = document.querySelector('#document-text');
const optionsText = document.querySelector('#options-text');
const optionsLabel = document.querySelector('#options-label');
const runButton = document.querySelector('#run');
const outcomeBanner = document.querySelector('#outcome-banner');
const outcomeBannerValue = document.querySelector('#outcome-banner-value');
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

const guidedControls = [
  forwardReward,
  forwardElapsed,
  reverseCandidateA,
  reverseCandidateB,
  reverseCountA,
  reverseCountB
];

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
  outcomeBanner.dataset.outcome = view.outcome;
  outcomeBannerValue.textContent = view.outcome;
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

function guidedValues() {
  if (operationSelect.value === 'reverse') {
    return {
      candidateA: reverseCandidateA.value,
      candidateB: reverseCandidateB.value,
      observedA: reverseCountA.value,
      observedB: reverseCountB.value
    };
  }
  return {
    reward: forwardReward.value,
    elapsedSeconds: forwardElapsed.value
  };
}

function syncOperationVisibility() {
  const reverse = operationSelect.value === 'reverse';
  guidedForward.hidden = reverse;
  guidedReverse.hidden = !reverse;
  optionsText.disabled = reverse;
  optionsLabel.hidden = reverse;
  if (reverse) optionsText.value = '{}';
}

function syncGuidedDocument() {
  syncOperationVisibility();
  documentText.value = toGuidedDocumentText(operationSelect.value, guidedValues());
  optionsText.value = '{}';
  browserFeedback.textContent =
    'Guided controls updated the checked JSON. Execution has not started until Run is pressed.';
}

async function loadExample(name) {
  const example = EXAMPLES[name];
  if (!example) return;

  operationSelect.value = example.operation;
  syncOperationVisibility();
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

function syncInputMode() {
  const guided = inputModeSelect.value === 'guided';
  guidedInput.hidden = !guided;
  fixtureInput.hidden = guided;
  if (guided) {
    syncGuidedDocument();
  } else {
    void loadExample(exampleSelect.value);
  }
}

exampleSelect.addEventListener('change', () => {
  void loadExample(exampleSelect.value);
});

inputModeSelect.addEventListener('change', syncInputMode);

operationSelect.addEventListener('change', () => {
  if (inputModeSelect.value === 'guided') {
    syncGuidedDocument();
  } else {
    syncOperationVisibility();
  }
});

for (const control of guidedControls) {
  control.addEventListener('input', () => {
    if (inputModeSelect.value === 'guided') syncGuidedDocument();
  });
}

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

syncInputMode();
