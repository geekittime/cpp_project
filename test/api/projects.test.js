const assert = require('node:assert/strict');
const test = require('node:test');

const { createTestApp } = require('../helpers/app');

const builtInId = 'ai4se-final-project';

function assertError(result, status, code) {
  assert.equal(result.response.status, status);
  assert.equal(result.body.error.code, code);
  assert.equal(typeof result.body.error.message, 'string');
  assert.deepEqual(result.body.error.details, {});
}

function createProjectBody(overrides = {}) {
  return {
    name: 'ShipCheck',
    repo_url: 'https://github.com/obra/superpowers.git/',
    template_id: builtInId,
    ...overrides,
  };
}

test('creates, lists, fetches, updates, and deletes projects', async () => {
  const app = await createTestApp();

  try {
    const created = await app.request('/api/projects', {
      method: 'POST',
      body: createProjectBody(),
    });
    assert.equal(created.response.status, 201);
    assert.equal(created.body.project.name, 'ShipCheck');
    assert.equal(created.body.project.repo_url, 'https://github.com/obra/superpowers');
    assert.equal(created.body.project.repo_owner, 'obra');
    assert.equal(created.body.project.repo_name, 'superpowers');
    assert.equal(created.body.project.template.id, builtInId);
    assert.equal(created.body.project.latest_report, null);

    const listed = await app.request('/api/projects');
    assert.equal(listed.response.status, 200);
    assert.equal(listed.body.projects.length, 1);
    assert.equal(listed.body.projects[0].latest_report, null);

    const fetched = await app.request(`/api/projects/${created.body.project.id}`);
    assert.equal(fetched.response.status, 200);
    assert.equal(fetched.body.project.id, created.body.project.id);
    assert.equal(fetched.body.project.repo_url, 'https://github.com/obra/superpowers');

    const updated = await app.request(`/api/projects/${created.body.project.id}`, {
      method: 'PUT',
      body: createProjectBody({
        name: '  ShipCheck Release  ',
        repo_url: 'https://github.com/openai/codex',
      }),
    });
    assert.equal(updated.response.status, 200);
    assert.equal(updated.body.project.name, 'ShipCheck Release');
    assert.equal(updated.body.project.repo_owner, 'openai');
    assert.equal(updated.body.project.repo_name, 'codex');
    assert.equal(updated.body.project.repo_url, 'https://github.com/openai/codex');

    const deleted = await app.request(`/api/projects/${created.body.project.id}`, {
      method: 'DELETE',
    });
    assert.equal(deleted.response.status, 204);

    assertError(
      await app.request(`/api/projects/${created.body.project.id}`),
      404,
      'project_not_found',
    );
  } finally {
    await app.close();
  }
});

test('rejects invalid project input and unknown references', async () => {
  const app = await createTestApp();

  try {
    assertError(
      await app.request('/api/projects', {
        method: 'POST',
        body: createProjectBody({ name: '   ' }),
      }),
      400,
      'invalid_project',
    );

    assertError(
      await app.request('/api/projects', {
        method: 'POST',
        body: createProjectBody({ repo_url: 'https://gitlab.com/obra/superpowers' }),
      }),
      400,
      'invalid_github_url',
    );

    assertError(
      await app.request('/api/projects', {
        method: 'POST',
        body: createProjectBody({ template_id: 'missing-template' }),
      }),
      404,
      'template_not_found',
    );

    assertError(
      await app.request('/api/projects/missing'),
      404,
      'project_not_found',
    );

    assertError(
      await app.request('/api/projects/missing', {
        method: 'PUT',
        body: createProjectBody(),
      }),
      404,
      'project_not_found',
    );
  } finally {
    await app.close();
  }
});
