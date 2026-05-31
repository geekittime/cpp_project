const assert = require('node:assert/strict');
const test = require('node:test');

const { validateTemplateInput } = require('../../src/domain/template');

function automatedItem(key, rule) {
  return {
    key,
    title: `${key} title`,
    description: `${key} description`,
    kind: 'automated',
    severity: 'blocking',
    rule,
  };
}

function manualItem(key) {
  return {
    key,
    title: `${key} title`,
    description: `${key} description`,
    kind: 'manual',
    severity: 'advisory',
    rule: null,
  };
}

test('accepts and normalizes automated and manual template items', () => {
  assert.deepEqual(
    validateTemplateInput({
      name: ' Release checklist ',
      items: [
        automatedItem('readme', { type: 'file_exists', path: 'README.md' }),
        automatedItem('docker', {
          type: 'file_any_exists',
          paths: ['Dockerfile', 'docker-compose.yml'],
        }),
        automatedItem('ci', {
          type: 'directory_exists',
          path: '.github/workflows',
        }),
        automatedItem('description', { type: 'repository_has_description' }),
        manualItem('review'),
      ],
    }),
    {
      name: 'Release checklist',
      items: [
        automatedItem('readme', { type: 'file_exists', path: 'README.md' }),
        automatedItem('docker', {
          type: 'file_any_exists',
          paths: ['Dockerfile', 'docker-compose.yml'],
        }),
        automatedItem('ci', {
          type: 'directory_exists',
          path: '.github/workflows',
        }),
        automatedItem('description', { type: 'repository_has_description' }),
        manualItem('review'),
      ],
    },
  );
});

test('rejects templates without items', () => {
  assert.throws(
    () => validateTemplateInput({ name: 'Empty', items: [] }),
    { code: 'invalid_template', status: 400 },
  );
});

test('rejects duplicate item keys', () => {
  assert.throws(
    () => validateTemplateInput({
      name: 'Duplicate',
      items: [
        manualItem('review'),
        manualItem('review'),
      ],
    }),
    { code: 'invalid_template', status: 400 },
  );
});

test('rejects unsupported automated rule types', () => {
  assert.throws(
    () => validateTemplateInput({
      name: 'Unsupported',
      items: [
        automatedItem('license', { type: 'license_exists' }),
      ],
    }),
    { code: 'invalid_template', status: 400 },
  );
});

test('rejects automated items without rules', () => {
  assert.throws(
    () => validateTemplateInput({
      name: 'Missing rule',
      items: [
        automatedItem('readme', null),
      ],
    }),
    { code: 'invalid_template', status: 400 },
  );
});

test('rejects manual items with rules', () => {
  assert.throws(
    () => validateTemplateInput({
      name: 'Unexpected rule',
      items: [
        {
          ...manualItem('review'),
          rule: { type: 'file_exists', path: 'REVIEW.md' },
        },
      ],
    }),
    { code: 'invalid_template', status: 400 },
  );
});
