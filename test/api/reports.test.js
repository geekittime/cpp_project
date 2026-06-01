const assert = require('node:assert/strict');
const test = require('node:test');

const { createTestApp } = require('../helpers/app');

function assertError(result, status, code) {
  assert.equal(result.response.status, status);
  assert.equal(result.body.error.code, code);
}

test('runs audits and lists immutable report snapshots newest first', async () => {
  const app = await createTestApp({
    githubClient: {
      async getRepositorySnapshot(owner, repository) {
        return {
          metadata: {
            full_name: `${owner}/${repository}`,
            description: 'Example repository',
            html_url: `https://github.com/${owner}/${repository}`,
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
    assert.equal(first.response.status, 201);
    assert.equal(first.body.report.status, 'blocked');

    await app.request(`/api/projects/${projectId}/evidence/spec-document`, {
      method: 'PUT',
      body: {
        text: 'Reviewed SPEC',
        url: 'https://example.com/spec',
        completed: true,
      },
    });

    const second = await app.request(`/api/projects/${projectId}/audits`, {
      method: 'POST',
    });
    assert.equal(second.response.status, 201);
    assert.notEqual(second.body.report.id, first.body.report.id);

    const summaries = await app.request(`/api/projects/${projectId}/reports`);
    assert.equal(summaries.response.status, 200);
    assert.equal(summaries.body.reports.length, 2);
    assert.equal(summaries.body.reports[0].id, second.body.report.id);
    assert.equal(summaries.body.reports[1].id, first.body.report.id);

    const fetched = await app.request(
      `/api/projects/${projectId}/reports/${first.body.report.id}`,
    );
    assert.equal(fetched.response.status, 200);
    assert.equal(fetched.body.report.id, first.body.report.id);
    assert.equal(fetched.body.report.items.length, 10);
  } finally {
    await app.close();
  }
});

test('surfaces upstream audit errors and unknown reports', async () => {
  const app = await createTestApp({
    githubClient: {
      async getRepositorySnapshot() {
        const error = new Error('missing');
        error.status = 422;
        error.code = 'github_repository_not_found';
        error.details = {};
        throw error;
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

    assertError(
      await app.request(`/api/projects/${projectId}/audits`, { method: 'POST' }),
      422,
      'github_repository_not_found',
    );
    assertError(
      await app.request(`/api/projects/${projectId}/reports/missing`),
      404,
      'report_not_found',
    );
  } finally {
    await app.close();
  }
});
