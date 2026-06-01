const { randomUUID } = require('node:crypto');

function repositoryError(status, code, message, details = {}) {
  return Object.assign(new Error(message), { status, code, details });
}

function parseItem(row) {
  return {
    key: row.item_key,
    title: row.title,
    description: row.description,
    kind: row.kind,
    severity: row.severity,
    rule: row.rule_json === null ? null : JSON.parse(row.rule_json),
    position: row.position,
  };
}

function serializeTemplate(row, items) {
  return {
    id: row.id,
    name: row.name,
    is_builtin: Boolean(row.is_builtin),
    item_count: items.length,
    created_at: row.created_at,
    updated_at: row.updated_at,
    items,
  };
}

class TemplateRepository {
  constructor(db) {
    this.db = db;
    this.listStatement = db.prepare(`
      SELECT
        templates.id,
        templates.name,
        templates.is_builtin,
        templates.created_at,
        templates.updated_at,
        COUNT(template_items.id) AS item_count
      FROM templates
      LEFT JOIN template_items ON template_items.template_id = templates.id
      GROUP BY templates.id
      ORDER BY templates.is_builtin DESC, templates.created_at, templates.id
    `);
    this.findStatement = db.prepare(`
      SELECT id, name, is_builtin, created_at, updated_at
      FROM templates
      WHERE id = ?
    `);
    this.findItemsStatement = db.prepare(`
      SELECT item_key, title, description, kind, severity, rule_json, position
      FROM template_items
      WHERE template_id = ?
      ORDER BY position
    `);
    this.insertTemplateStatement = db.prepare(`
      INSERT INTO templates (id, name, is_builtin, created_at, updated_at)
      VALUES (?, ?, 0, ?, ?)
    `);
    this.insertItemStatement = db.prepare(`
      INSERT INTO template_items (
        id, template_id, item_key, title, description, kind, severity,
        rule_json, position
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    this.updateTemplateStatement = db.prepare(`
      UPDATE templates
      SET name = ?, updated_at = ?
      WHERE id = ?
    `);
    this.deleteItemsStatement = db.prepare(`
      DELETE FROM template_items
      WHERE template_id = ?
    `);
    this.countProjectsStatement = db.prepare(`
      SELECT COUNT(*) AS project_count
      FROM projects
      WHERE template_id = ?
    `);
    this.deleteTemplateStatement = db.prepare(`
      DELETE FROM templates
      WHERE id = ?
    `);
  }

  list() {
    return this.listStatement.all().map((row) => ({
      id: row.id,
      name: row.name,
      is_builtin: Boolean(row.is_builtin),
      item_count: row.item_count,
      created_at: row.created_at,
      updated_at: row.updated_at,
    }));
  }

  get(id) {
    const template = this.findStatement.get(id);
    if (!template) {
      throw repositoryError(404, 'template_not_found', 'Template not found.');
    }

    return serializeTemplate(
      template,
      this.findItemsStatement.all(id).map(parseItem),
    );
  }

  copy(id, name) {
    const source = this.get(id);
    const copy = {
      id: randomUUID(),
      name,
      created_at: new Date().toISOString(),
    };

    this.db.exec('BEGIN');
    try {
      this.insertTemplateStatement.run(copy.id, copy.name, copy.created_at, copy.created_at);
      this.insertItems(copy.id, source.items);
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }

    return this.get(copy.id);
  }

  update(id, input) {
    this.assertEditable(id);
    const updatedAt = new Date().toISOString();

    this.db.exec('BEGIN');
    try {
      this.updateTemplateStatement.run(input.name, updatedAt, id);
      this.deleteItemsStatement.run(id);
      this.insertItems(id, input.items);
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }

    return this.get(id);
  }

  delete(id) {
    this.assertEditable(id);
    if (this.countProjectsStatement.get(id).project_count > 0) {
      throw repositoryError(
        409,
        'template_in_use',
        'Templates referenced by projects cannot be deleted.',
      );
    }

    this.deleteTemplateStatement.run(id);
  }

  assertEditable(id) {
    const template = this.get(id);
    if (template.is_builtin) {
      throw repositoryError(
        409,
        'builtin_template_protected',
        'Built-in templates cannot be edited or deleted.',
      );
    }
  }

  insertItems(templateId, items) {
    items.forEach((item, position) => {
      this.insertItemStatement.run(
        randomUUID(),
        templateId,
        item.key,
        item.title,
        item.description,
        item.kind,
        item.severity,
        item.rule === null ? null : JSON.stringify(item.rule),
        position,
      );
    });
  }
}

module.exports = {
  TemplateRepository,
};
