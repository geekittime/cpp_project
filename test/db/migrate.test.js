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
  } finally {
    db.close();
  }
});
