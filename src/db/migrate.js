const BUILT_IN_TEMPLATE_ID = 'ai4se-final-project';

const BUILT_IN_TEMPLATE_ITEMS = [
  {
    key: 'readme',
    title: 'README documentation',
    description: 'Repository contains README.md with delivery instructions.',
    kind: 'automated',
    severity: 'blocking',
    rule: { type: 'file_exists', path: 'README.md' },
  },
  {
    key: 'docker',
    title: 'Container definition',
    description: 'Repository contains Dockerfile or docker-compose.yml.',
    kind: 'automated',
    severity: 'blocking',
    rule: {
      type: 'file_any_exists',
      paths: ['Dockerfile', 'docker-compose.yml'],
    },
  },
  {
    key: 'ci-workflow',
    title: 'Continuous integration workflow',
    description: 'Repository contains at least one GitHub Actions workflow.',
    kind: 'automated',
    severity: 'blocking',
    rule: { type: 'directory_exists', path: '.github/workflows' },
  },
  {
    key: 'repository-description',
    title: 'Repository description',
    description: 'GitHub repository metadata includes a short description.',
    kind: 'automated',
    severity: 'advisory',
    rule: { type: 'repository_has_description' },
  },
  {
    key: 'spec-document',
    title: 'Reviewed product specification',
    description: 'Provide evidence that SPEC.md was reviewed before implementation.',
    kind: 'manual',
    severity: 'blocking',
    rule: null,
  },
  {
    key: 'plan-document',
    title: 'Reviewed implementation plan',
    description: 'Provide evidence that PLAN.md was reviewed before implementation.',
    kind: 'manual',
    severity: 'blocking',
    rule: null,
  },
  {
    key: 'cold-start-validation',
    title: 'Cold-start validation',
    description: 'Provide evidence from an isolated second-agent specification trial.',
    kind: 'manual',
    severity: 'blocking',
    rule: null,
  },
  {
    key: 'agent-log',
    title: 'Agent workflow log',
    description: 'Provide evidence that AGENT_LOG.md records the development workflow.',
    kind: 'manual',
    severity: 'blocking',
    rule: null,
  },
  {
    key: 'public-image',
    title: 'Public container image',
    description: 'Provide a public Docker Hub or GHCR image URL.',
    kind: 'manual',
    severity: 'blocking',
    rule: null,
  },
  {
    key: 'reflection',
    title: 'Student reflection',
    description: 'Provide evidence that the student-authored reflection is present.',
    kind: 'manual',
    severity: 'advisory',
    rule: null,
  },
];

function migrateDatabase(db) {
  db.exec('PRAGMA foreign_keys = ON');
  db.exec('BEGIN');
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL CHECK (length(trim(name)) > 0),
        is_builtin INTEGER NOT NULL CHECK (is_builtin IN (0, 1)),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS template_items (
        id TEXT PRIMARY KEY,
        template_id TEXT NOT NULL REFERENCES templates(id) ON DELETE CASCADE,
        item_key TEXT NOT NULL,
        title TEXT NOT NULL CHECK (length(trim(title)) > 0),
        description TEXT NOT NULL CHECK (length(trim(description)) > 0),
        kind TEXT NOT NULL CHECK (kind IN ('automated', 'manual')),
        severity TEXT NOT NULL CHECK (severity IN ('blocking', 'advisory')),
        rule_json TEXT,
        position INTEGER NOT NULL CHECK (position >= 0),
        UNIQUE (template_id, item_key)
      );

      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL CHECK (length(trim(name)) > 0),
        repo_url TEXT NOT NULL,
        repo_owner TEXT NOT NULL CHECK (length(repo_owner) > 0),
        repo_name TEXT NOT NULL CHECK (length(repo_name) > 0),
        template_id TEXT NOT NULL REFERENCES templates(id),
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS evidence (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        item_key TEXT NOT NULL,
        text TEXT NOT NULL,
        url TEXT,
        completed INTEGER NOT NULL CHECK (completed IN (0, 1)),
        updated_at TEXT NOT NULL,
        UNIQUE (project_id, item_key)
      );

      CREATE TABLE IF NOT EXISTS reports (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        status TEXT NOT NULL CHECK (status IN ('ready', 'blocked')),
        score INTEGER NOT NULL CHECK (score BETWEEN 0 AND 100),
        snapshot_json TEXT NOT NULL,
        created_at TEXT NOT NULL
      );
    `);

    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO templates (
        id, name, is_builtin, created_at, updated_at
      ) VALUES (?, ?, 1, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        name = excluded.name,
        is_builtin = 1,
        updated_at = excluded.updated_at
    `).run(BUILT_IN_TEMPLATE_ID, 'AI4SE Final Project', now, now);

    const insertItem = db.prepare(`
      INSERT INTO template_items (
        id,
        template_id,
        item_key,
        title,
        description,
        kind,
        severity,
        rule_json,
        position
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        template_id = excluded.template_id,
        item_key = excluded.item_key,
        title = excluded.title,
        description = excluded.description,
        kind = excluded.kind,
        severity = excluded.severity,
        rule_json = excluded.rule_json,
        position = excluded.position
    `);

    BUILT_IN_TEMPLATE_ITEMS.forEach((item, position) => {
      insertItem.run(
        `${BUILT_IN_TEMPLATE_ID}:${item.key}`,
        BUILT_IN_TEMPLATE_ID,
        item.key,
        item.title,
        item.description,
        item.kind,
        item.severity,
        item.rule === null ? null : JSON.stringify(item.rule),
        position,
      );
    });

    const itemKeys = BUILT_IN_TEMPLATE_ITEMS.map(({ key }) => key);
    db.prepare(`
      DELETE FROM template_items
      WHERE template_id = ?
        AND item_key NOT IN (${itemKeys.map(() => '?').join(', ')})
    `).run(BUILT_IN_TEMPLATE_ID, ...itemKeys);

    db.exec('PRAGMA user_version = 1');
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

module.exports = {
  migrateDatabase,
};
