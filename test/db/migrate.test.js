const assert = require('node:assert/strict');
const test = require('node:test');

const { migrateDatabase } = require('../../src/db/migrate');
const { createTestDatabase } = require('../helpers/database');

test('creates the schema and seeds the built-in AI4SE template', () => {
  const db = createTestDatabase();

  try {
    migrateDatabase(db);

    const tables = db
      .prepare(`
        SELECT name
        FROM sqlite_master
        WHERE type = 'table'
          AND name IN ('templates', 'template_items', 'projects', 'evidence', 'reports')
        ORDER BY name
      `)
      .all()
      .map(({ name }) => name);

    assert.deepEqual(tables, [
      'evidence',
      'projects',
      'reports',
      'template_items',
      'templates',
    ]);

    const builtInTemplates = db
      .prepare(`
        SELECT name
        FROM templates
        WHERE is_builtin = 1
      `)
      .all()
      .map(({ name }) => name);

    assert.deepEqual(builtInTemplates, ['AI4SE Final Project']);

    const builtInItems = db
      .prepare(`
        SELECT item_key, title, kind, severity, rule_json, position
        FROM template_items
        WHERE template_id = 'ai4se-final-project'
        ORDER BY position
      `)
      .all();

    assert.deepEqual(
      builtInItems.map(({ item_key, title, kind, severity, position }) => ({
        item_key,
        title,
        kind,
        severity,
        position,
      })),
      [
        ['readme', 'README documentation', 'automated', 'blocking'],
        ['docker', 'Container definition', 'automated', 'blocking'],
        ['ci-workflow', 'Continuous integration workflow', 'automated', 'blocking'],
        ['repository-description', 'Repository description', 'automated', 'advisory'],
        ['spec-document', 'Reviewed product specification', 'manual', 'blocking'],
        ['plan-document', 'Reviewed implementation plan', 'manual', 'blocking'],
        ['cold-start-validation', 'Cold-start validation', 'manual', 'blocking'],
        ['agent-log', 'Agent workflow log', 'manual', 'blocking'],
        ['public-image', 'Public container image', 'manual', 'blocking'],
        ['reflection', 'Student reflection', 'manual', 'advisory'],
      ].map(([item_key, title, kind, severity], position) => ({
        item_key,
        title,
        kind,
        severity,
        position,
      })),
    );

    assert.deepEqual(
      JSON.parse(builtInItems[0].rule_json),
      { type: 'file_exists', path: 'README.md' },
    );
    assert.equal(builtInItems[4].rule_json, null);
  } finally {
    db.close();
  }
});
