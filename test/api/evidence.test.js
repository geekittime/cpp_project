const assert = require('node:assert/strict');
const test = require('node:test');

const { createTestApp } = require('../helpers/app');

function assertError(result, status, code) {
  assert.equal(result.response.status, status);
  assert.equal(result.body.error.code, code);
}

test('upserts manual evidence and captures immutable snapshots across audits', async () => {
  const app = await createTestApp({
    githubClient: {
      async getRepositorySnapshot() {
        return {
          metadata: {
            full_name: 'obra/superpowers',
            description: 'Workflow helper',
            html_url: 'https://github.com/obra/superpowers',
            default_branch: 'main',
          },
          tree: [
            { path: 'README.md', type: 'blob' },
            { path: 'Dockerfile', type: 'blob' },
            { path: '.github/workflows', type: 'tree' },
          ],
          warnings: [],
        };
      },
    },
  });

  try {
    const project = await app.request('/api/projects', {
      method: 'POST',
      body: {
        name: 'ShipCheck',
        repo_url: 'https://github.com/obra/superpowers',
        template_id: 'ai4se-final-project',
      },
    });
    const projectId = project.body.project.id;

    const first = await app.request(`/api/projects/${projectId}/audits`, {
      method: 'POST',
    });

    const evidence = await app.request(`/api/projects/${projectId}/evidence/spec-document`, {
      method: 'PUT',
      body: {
        text: 'SPEC reviewed',
        url: 'https://example.com/spec',
        completed: true,
      },
    });
    assert.equal(evidence.response.status, 200);
    assert.equal(evidence.body.evidence.item_key, 'spec-document');

    const second = await app.request(`/api/projects/${projectId}/audits`, {
      method: 'POST',
    });
    assert.equal(
      first.body.report.items.find((item) => item.key === 'spec-document').status,
      'pending',
    );
    assert.equal(
      second.body.report.items.find((item) => item.key === 'spec-document').status,
      'passed',
    );
  } finally {
    await app.close();
  }
});

test('rejects invalid evidence updates', async () => {
  const app = await createTestApp();

  try {
    const project = await app.request('/api/projects', {
      method: 'POST',
      body: {
        name: 'ShipCheck',
        repo_url: 'https://github.com/obra/superpowers',
        template_id: 'ai4se-final-project',
      },
    });
    const projectId = project.body.project.id;

    assertError(
      await app.request(`/api/projects/${projectId}/evidence/spec-document`, {
        method: 'PUT',
        body: { text: '', completed: true },
      }),
      400,
      'invalid_evidence',
    );
    assertError(
      await app.request(`/api/projects/${projectId}/evidence/spec-document`, {
        method: 'PUT',
        body: { text: 'x', url: 'ftp://example.com', completed: true },
      }),
      400,
      'invalid_evidence',
    );
    assertError(
      await app.request(`/api/projects/${projectId}/evidence/readme`, {
        method: 'PUT',
        body: { text: 'x', completed: true },
      }),
      409,
      'evidence_not_allowed',
    );
    assertError(
      await app.request(`/api/projects/${projectId}/evidence/missing`, {
        method: 'PUT',
        body: { text: 'x', completed: true },
      }),
      404,
      'template_item_not_found',
    );
  } finally {
    await app.close();
  }
});
