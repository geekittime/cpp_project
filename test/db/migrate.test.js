const assert = require('node:assert/strict');
const test = require('node:test');

const { migrateDatabase } = require('../../src/db/migrate');
const { createTestDatabase } = require('../helpers/database');

const expectedItems = [
  ['readme', 'README documentation', 'Repository contains README.md with delivery instructions.', 'automated', 'blocking', { type: 'file_exists', path: 'README.md' }],
  ['docker', 'Container definition', 'Repository contains Dockerfile or docker-compose.yml.', 'automated', 'blocking', { type: 'file_any_exists', paths: ['Dockerfile', 'docker-compose.yml'] }],
  ['ci-workflow', 'Continuous integration workflow', 'Repository contains at least one GitHub Actions workflow.', 'automated', 'blocking', { type: 'directory_exists', path: '.github/workflows' }],
  ['repository-description', 'Repository description', 'GitHub repository metadata includes a short description.', 'automated', 'advisory', { type: 'repository_has_description' }],
  ['spec-document', 'Reviewed product specification', 'Provide evidence that SPEC.md was reviewed before implementation.', 'manual', 'blocking', null],
  ['plan-document', 'Reviewed implementation plan', 'Provide evidence that PLAN.md was reviewed before implementation.', 'manual', 'blocking', null],
  ['cold-start-validation', 'Cold-start validation', 'Provide evidence from an isolated second-agent specification trial.', 'manual', 'blocking', null],
  ['agent-log', 'Agent workflow log', 'Provide evidence that AGENT_LOG.md records the development workflow.', 'manual', 'blocking', null],
  ['public-image', 'Public container image', 'Provide a public Docker Hub or GHCR image URL.', 'manual', 'blocking', null],
  ['reflection', 'Student reflection', 'Provide evidence that the student-authored reflection is present.', 'manual', 'advisory', null],
].map(([item_key, title, description, kind, severity, rule], position) => ({
  item_key,
  title,
  description,
  kind,
  severity,
  rule,
  position,
}));

function readItems(db) {
  return db
    .prepare(`
      SELECT item_key, title, description, kind, severity, rule_json, position
      FROM template_items
      WHERE template_id = 'ai4se-final-project'
      ORDER BY position
    `)
    .all()
    .map(({ rule_json, ...item }) => ({
      ...item,
      rule: rule_json === null ? null : JSON.parse(rule_json),
    }));
}

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

    assert.deepEqual(readItems(db), expectedItems);
    assert.equal(db.prepare('PRAGMA user_version').get().user_version, 1);
  } finally {
    db.close();
  }
});

test('repairs drifted built-in template rows and stays idempotent', () => {
  const db = createTestDatabase();

  try {
    migrateDatabase(db);
    db.prepare(`
      UPDATE templates
      SET name = 'Drifted', is_builtin = 0
      WHERE id = 'ai4se-final-project'
    `).run();
    db.prepare(`
      UPDATE template_items
      SET title = 'Drifted', kind = 'manual', severity = 'advisory',
          rule_json = NULL, position = 99
      WHERE id = 'ai4se-final-project:readme'
    `).run();
    db.prepare(`
      INSERT INTO template_items (
        id, template_id, item_key, title, description, kind, severity,
        rule_json, position
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      'ai4se-final-project:obsolete',
      'ai4se-final-project',
      'obsolete',
      'Obsolete',
      'Must be removed.',
      'manual',
      'advisory',
      null,
      100,
    );

    migrateDatabase(db);
    migrateDatabase(db);

    assert.deepEqual(
      { ...db.prepare(`
        SELECT name, is_builtin
        FROM templates
        WHERE id = 'ai4se-final-project'
      `).get() },
      { name: 'AI4SE Final Project', is_builtin: 1 },
    );
    assert.deepEqual(readItems(db), expectedItems);
  } finally {
    db.close();
  }
});

test('rolls back schema creation when initial seed fails', () => {
  const rawDb = createTestDatabase();
  const db = {
    exec(sql) {
      return rawDb.exec(sql);
    },
    prepare(sql) {
      const statement = rawDb.prepare(sql);
      if (sql.includes('INTO templates')) {
        return {
          run() {
            throw new Error('synthetic seed failure');
          },
        };
      }
      return statement;
    },
  };

  try {
    assert.throws(() => migrateDatabase(db), /synthetic seed failure/);
    const tables = rawDb.prepare(`
      SELECT name
      FROM sqlite_master
      WHERE type = 'table'
    `).all();
    assert.deepEqual(tables, []);
  } finally {
    rawDb.close();
  }
});
