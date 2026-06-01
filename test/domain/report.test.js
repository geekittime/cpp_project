const assert = require('node:assert/strict');
const test = require('node:test');

const { createReportSnapshot } = require('../../src/domain/report');

test('rounds scores and blocks reports with pending blocking manual items', () => {
  const items = [
    { key: 'readme', severity: 'blocking', status: 'passed' },
    { key: 'description', severity: 'advisory', status: 'failed' },
    { key: 'spec-document', severity: 'blocking', status: 'pending' },
  ];

  assert.deepEqual(
    createReportSnapshot({
      items,
      github: { default_branch: 'main' },
      warnings: ['Tree was truncated.'],
      generatedAt: '2026-05-31T12:00:00.000Z',
    }),
    {
      generated_at: '2026-05-31T12:00:00.000Z',
      status: 'blocked',
      score: 33,
      counts: {
        total: 3,
        passed: 1,
        failed: 1,
        pending: 1,
      },
      github: { default_branch: 'main' },
      warnings: ['Tree was truncated.'],
      items,
    },
  );
});

test('marks reports ready when every blocking item passes', () => {
  const snapshot = createReportSnapshot({
    items: [
      { key: 'readme', severity: 'blocking', status: 'passed' },
      { key: 'description', severity: 'advisory', status: 'failed' },
    ],
    github: {},
    warnings: [],
    generatedAt: '2026-05-31T12:00:00.000Z',
  });

  assert.equal(snapshot.score, 50);
  assert.equal(snapshot.status, 'ready');
});

test('rounds scores to the nearest integer', () => {
  const snapshot = createReportSnapshot({
    items: [
      { key: 'one', severity: 'advisory', status: 'passed' },
      { key: 'two', severity: 'advisory', status: 'passed' },
      { key: 'three', severity: 'advisory', status: 'failed' },
    ],
  });

  assert.equal(snapshot.score, 67);
});
