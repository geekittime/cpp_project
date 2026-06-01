const { randomUUID } = require('node:crypto');

const { AppError } = require('../domain/errors');

class ReportRepository {
  constructor(db) {
    this.db = db;
    this.insertStatement = db.prepare(`
      INSERT INTO reports (id, project_id, status, score, snapshot_json, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    this.listStatement = db.prepare(`
      SELECT id, project_id, status, score, created_at
      FROM reports
      WHERE project_id = ?
      ORDER BY created_at DESC, id DESC
    `);
    this.findStatement = db.prepare(`
      SELECT id, project_id, status, score, snapshot_json, created_at
      FROM reports
      WHERE project_id = ? AND id = ?
    `);
  }

  create(projectId, snapshot) {
    const id = randomUUID();
    const createdAt = snapshot.generated_at;
    this.insertStatement.run(
      id,
      projectId,
      snapshot.status,
      snapshot.score,
      JSON.stringify(snapshot),
      createdAt,
    );
    return this.getByProject(projectId, id);
  }

  listByProject(projectId) {
    return this.listStatement.all(projectId).map((row) => ({
      id: row.id,
      project_id: row.project_id,
      status: row.status,
      score: row.score,
      created_at: row.created_at,
    }));
  }

  getByProject(projectId, reportId) {
    const row = this.findStatement.get(projectId, reportId);
    if (!row) {
      throw AppError.notFound('report_not_found', 'Report not found.');
    }

    return {
      id: row.id,
      project_id: row.project_id,
      status: row.status,
      score: row.score,
      created_at: row.created_at,
      snapshot_json: JSON.parse(row.snapshot_json),
      ...JSON.parse(row.snapshot_json),
    };
  }
}

module.exports = {
  ReportRepository,
};
