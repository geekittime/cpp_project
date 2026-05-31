const assert = require('node:assert/strict');
const test = require('node:test');

const { evaluateRule } = require('../../src/domain/rules');

test('evaluates all supported automated rules against metadata and tree paths', () => {
  const snapshot = {
    metadata: { description: 'A delivery readiness dashboard.' },
    paths: new Set([
      'README.md',
      'docker-compose.yml',
      '.github/workflows/test.yml',
    ]),
  };

  assert.equal(
    evaluateRule({ type: 'file_exists', path: 'README.md' }, snapshot).status,
    'passed',
  );
  assert.equal(
    evaluateRule({
      type: 'file_any_exists',
      paths: ['Dockerfile', 'docker-compose.yml'],
    }, snapshot).status,
    'passed',
  );
  assert.equal(
    evaluateRule({
      type: 'directory_exists',
      path: '.github/workflows',
    }, snapshot).status,
    'passed',
  );
  assert.equal(
    evaluateRule({ type: 'repository_has_description' }, snapshot).status,
    'passed',
  );
});

test('reports failed rules with useful detail', () => {
  const snapshot = {
    metadata: { description: '  ' },
    paths: new Set(),
  };

  assert.deepEqual(
    evaluateRule({ type: 'file_exists', path: 'README.md' }, snapshot),
    {
      status: 'failed',
      detail: 'README.md was not found.',
    },
  );
  assert.deepEqual(
    evaluateRule({
      type: 'file_any_exists',
      paths: ['Dockerfile', 'docker-compose.yml'],
    }, snapshot),
    {
      status: 'failed',
      detail: 'None of Dockerfile, docker-compose.yml were found.',
    },
  );
  assert.deepEqual(
    evaluateRule({
      type: 'directory_exists',
      path: '.github/workflows',
    }, snapshot),
    {
      status: 'failed',
      detail: '.github/workflows was not found.',
    },
  );
  assert.deepEqual(
    evaluateRule({ type: 'repository_has_description' }, snapshot),
    {
      status: 'failed',
      detail: 'Repository description is missing.',
    },
  );
});
