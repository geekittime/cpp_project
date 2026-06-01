const assert = require('node:assert/strict');
const test = require('node:test');
const { randomUUID } = require('node:crypto');

const { createTestApp } = require('../helpers/app');

const builtInId = 'ai4se-final-project';

function customItems() {
  return [
    {
      key: 'release-notes',
      title: 'Release notes',
      description: 'Repository contains release notes.',
      kind: 'automated',
      severity: 'blocking',
      rule: { type: 'file_exists', path: 'CHANGELOG.md' },
    },
    {
      key: 'demo',
      title: 'Recorded demo',
      description: 'Provide a link to a recorded demonstration.',
      kind: 'manual',
      severity: 'advisory',
      rule: null,
    },
  ];
}

function assertError(result, status, code) {
  assert.equal(result.response.status, status);
  assert.equal(result.body.error.code, code);
  assert.equal(typeof result.body.error.message, 'string');
  assert.deepEqual(result.body.error.details, {});
}

test('lists the built-in template summary and fetches its ordered items', async () => {
  const app = await createTestApp();

  try {
    const listed = await app.request('/api/templates');
    assert.equal(listed.response.status, 200);
    assert.deepEqual(listed.body, {
      templates: [
        {
          id: builtInId,
          name: 'AI4SE Final Project',
          is_builtin: true,
          item_count: 10,
          created_at: listed.body.templates[0].created_at,
          updated_at: listed.body.templates[0].updated_at,
        },
      ],
    });

    const fetched = await app.request(`/api/templates/${builtInId}`);
    assert.equal(fetched.response.status, 200);
    assert.equal(fetched.body.template.id, builtInId);
    assert.equal(fetched.body.template.item_count, 10);
    assert.equal(fetched.body.template.items.length, 10);
    assert.deepEqual(
      fetched.body.template.items.slice(0, 2).map(({ key, position }) => ({
        key,
        position,
      })),
      [
        { key: 'readme', position: 0 },
        { key: 'docker', position: 1 },
      ],
    );
  } finally {
    await app.close();
  }
});

test('copies the built-in template, edits the custom copy, and deletes it while unused', async () => {
  const app = await createTestApp();

  try {
    const copied = await app.request(`/api/templates/${builtInId}/copy`, {
      method: 'POST',
      body: { name: 'Release checklist' },
    });
    assert.equal(copied.response.status, 201);
    assert.equal(copied.body.template.name, 'Release checklist');
    assert.equal(copied.body.template.is_builtin, false);
    assert.equal(copied.body.template.item_count, 10);
    assert.equal(copied.body.template.items.length, 10);

    const id = copied.body.template.id;
    const edited = await app.request(`/api/templates/${id}`, {
      method: 'PUT',
      body: {
        name: '  Lean release checklist  ',
        items: customItems(),
      },
    });
    assert.equal(edited.response.status, 200);
    assert.equal(edited.body.template.name, 'Lean release checklist');
    assert.equal(edited.body.template.item_count, 2);
    assert.deepEqual(edited.body.template.items, customItems().map((item, position) => ({
      ...item,
      position,
    })));

    const deleted = await app.request(`/api/templates/${id}`, {
      method: 'DELETE',
    });
    assert.equal(deleted.response.status, 204);

    assertError(await app.request(`/api/templates/${id}`), 404, 'template_not_found');
  } finally {
    await app.close();
  }
});

test('rejects mutation of the protected built-in template', async () => {
  const app = await createTestApp();

  try {
    assertError(
      await app.request(`/api/templates/${builtInId}`, {
        method: 'PUT',
        body: { name: 'Nope', items: customItems() },
      }),
      409,
      'builtin_template_protected',
    );
    assertError(
      await app.request(`/api/templates/${builtInId}`, { method: 'DELETE' }),
      409,
      'builtin_template_protected',
    );
  } finally {
    await app.close();
  }
});

test('checks PUT template identity before validating the payload', async () => {
  const app = await createTestApp();

  try {
    const invalidPayload = { name: 'Invalid', items: [] };
    assertError(
      await app.request('/api/templates/missing', {
        method: 'PUT',
        body: invalidPayload,
      }),
      404,
      'template_not_found',
    );
    assertError(
      await app.request(`/api/templates/${builtInId}`, {
        method: 'PUT',
        body: invalidPayload,
      }),
      409,
      'builtin_template_protected',
    );
  } finally {
    await app.close();
  }
});

test('rejects deletion of a custom template referenced by a project', async () => {
  const app = await createTestApp();

  try {
    const copied = await app.request(`/api/templates/${builtInId}/copy`, {
      method: 'POST',
      body: { name: 'Used checklist' },
    });
    const templateId = copied.body.template.id;
    const now = new Date().toISOString();
    app.db.prepare(`
      INSERT INTO projects (
        id, name, repo_url, repo_owner, repo_name, template_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      randomUUID(),
      'Referenced project',
      'https://github.com/obra/superpowers',
      'obra',
      'superpowers',
      templateId,
      now,
      now,
    );

    assertError(
      await app.request(`/api/templates/${templateId}`, { method: 'DELETE' }),
      409,
      'template_in_use',
    );
  } finally {
    await app.close();
  }
});

test('returns stable errors for unknown templates and invalid edits', async () => {
  const app = await createTestApp();

  try {
    assertError(await app.request('/api/templates/missing'), 404, 'template_not_found');
    assertError(
      await app.request(`/api/templates/${builtInId}/copy`, {
        method: 'POST',
        body: { name: '   ' },
      }),
      400,
      'invalid_template',
    );

    const copied = await app.request(`/api/templates/${builtInId}/copy`, {
      method: 'POST',
      body: { name: 'Editable' },
    });
    const duplicateItems = customItems();
    duplicateItems.push({ ...duplicateItems[0] });

    assertError(
      await app.request(`/api/templates/${copied.body.template.id}`, {
        method: 'PUT',
        body: { name: 'Editable', items: duplicateItems },
      }),
      400,
      'invalid_template',
    );
  } finally {
    await app.close();
  }
});

test('rejects invalid checklist item combinations', async () => {
  const app = await createTestApp();

  try {
    const copied = await app.request(`/api/templates/${builtInId}/copy`, {
      method: 'POST',
      body: { name: 'Validation target' },
    });
    const templateId = copied.body.template.id;
    const invalidCases = [
      {
        name: 'empty templates',
        items: [],
      },
      {
        name: 'unsupported rule types',
        items: [{
          ...customItems()[0],
          rule: { type: 'shell_command', command: 'test -f README.md' },
        }],
      },
      {
        name: 'automated items without rules',
        items: [{
          ...customItems()[0],
          rule: null,
        }],
      },
      {
        name: 'manual items with rules',
        items: [{
          ...customItems()[1],
          rule: { type: 'file_exists', path: 'DEMO.md' },
        }],
      },
    ];

    for (const invalidCase of invalidCases) {
      assertError(
        await app.request(`/api/templates/${templateId}`, {
          method: 'PUT',
          body: {
            name: invalidCase.name,
            items: invalidCase.items,
          },
        }),
        400,
        'invalid_template',
      );
    }
  } finally {
    await app.close();
  }
});
