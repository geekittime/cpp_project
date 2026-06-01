const { randomUUID } = require('node:crypto');

class EvidenceRepository {
  constructor(db) {
    this.db = db;
    this.findStatement = db.prepare(`
      SELECT id, project_id, item_key, text, url, completed, updated_at
      FROM evidence
      WHERE project_id = ? AND item_key = ?
    `);
    this.listStatement = db.prepare(`
      SELECT id, project_id, item_key, text, url, completed, updated_at
      FROM evidence
      WHERE project_id = ?
    `);
    this.insertStatement = db.prepare(`
      INSERT INTO evidence (id, project_id, item_key, text, url, completed, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    this.updateStatement = db.prepare(`
      UPDATE evidence
      SET text = ?, url = ?, completed = ?, updated_at = ?
      WHERE project_id = ? AND item_key = ?
    `);
  }

  get(projectId, itemKey) {
    const row = this.findStatement.get(projectId, itemKey);
    return row ? this.serialize(row) : null;
  }

  listByProject(projectId) {
    return this.listStatement.all(projectId).map((row) => this.serialize(row));
  }

  upsert(projectId, itemKey, input) {
    const existing = this.get(projectId, itemKey);
    const updatedAt = new Date().toISOString();

    if (existing) {
      this.updateStatement.run(
        input.text,
        input.url,
        input.completed ? 1 : 0,
        updatedAt,
        projectId,
        itemKey,
      );
    } else {
      this.insertStatement.run(
        randomUUID(),
        projectId,
        itemKey,
        input.text,
        input.url,
        input.completed ? 1 : 0,
        updatedAt,
      );
    }

    return this.get(projectId, itemKey);
  }

  serialize(row) {
    return {
      id: row.id,
      project_id: row.project_id,
      item_key: row.item_key,
      text: row.text,
      url: row.url,
      completed: Boolean(row.completed),
      updated_at: row.updated_at,
    };
  }
}

module.exports = {
  EvidenceRepository,
};
