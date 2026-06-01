const { randomUUID } = require('node:crypto');

const { AppError } = require('../domain/errors');

function parseTemplate(row) {
  return {
    id: row.template_id,
    name: row.template_name,
    is_builtin: Boolean(row.template_is_builtin),
    item_count: row.template_item_count,
  };
}

function parseLatestReport(row) {
  if (row.latest_report_id === null) {
    return null;
  }

  return {
    id: row.latest_report_id,
    status: row.latest_report_status,
    score: row.latest_report_score,
    created_at: row.latest_report_created_at,
  };
}

function serializeProject(row) {
  return {
    id: row.id,
    name: row.name,
    repo_url: row.repo_url,
    repo_owner: row.repo_owner,
    repo_name: row.repo_name,
    template: parseTemplate(row),
    latest_report: parseLatestReport(row),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

class ProjectRepository {
  constructor(db) {
    this.db = db;
    this.listStatement = db.prepare(`
      SELECT
        projects.id,
        projects.name,
        projects.repo_url,
        projects.repo_owner,
        projects.repo_name,
        projects.created_at,
        projects.updated_at,
        templates.id AS template_id,
        templates.name AS template_name,
        templates.is_builtin AS template_is_builtin,
        (
          SELECT COUNT(*)
          FROM template_items
          WHERE template_items.template_id = templates.id
        ) AS template_item_count,
        reports.id AS latest_report_id,
        reports.status AS latest_report_status,
        reports.score AS latest_report_score,
        reports.created_at AS latest_report_created_at
      FROM projects
      JOIN templates ON templates.id = projects.template_id
      LEFT JOIN reports ON reports.id = (
        SELECT id
        FROM reports
        WHERE reports.project_id = projects.id
        ORDER BY created_at DESC, id DESC
        LIMIT 1
      )
      ORDER BY projects.created_at, projects.id
    `);
    this.findStatement = db.prepare(`
      SELECT
        projects.id,
        projects.name,
        projects.repo_url,
        projects.repo_owner,
        projects.repo_name,
        projects.created_at,
        projects.updated_at,
        templates.id AS template_id,
        templates.name AS template_name,
        templates.is_builtin AS template_is_builtin,
        (
          SELECT COUNT(*)
          FROM template_items
          WHERE template_items.template_id = templates.id
        ) AS template_item_count,
        reports.id AS latest_report_id,
        reports.status AS latest_report_status,
        reports.score AS latest_report_score,
        reports.created_at AS latest_report_created_at
      FROM projects
      JOIN templates ON templates.id = projects.template_id
      LEFT JOIN reports ON reports.id = (
        SELECT id
        FROM reports
        WHERE reports.project_id = projects.id
        ORDER BY created_at DESC, id DESC
        LIMIT 1
      )
      WHERE projects.id = ?
    `);
    this.templateExistsStatement = db.prepare(`
      SELECT id
      FROM templates
      WHERE id = ?
    `);
    this.insertStatement = db.prepare(`
      INSERT INTO projects (
        id,
        name,
        repo_url,
        repo_owner,
        repo_name,
        template_id,
        created_at,
        updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    this.updateStatement = db.prepare(`
      UPDATE projects
      SET name = ?, repo_url = ?, repo_owner = ?, repo_name = ?, template_id = ?, updated_at = ?
      WHERE id = ?
    `);
    this.deleteStatement = db.prepare(`
      DELETE FROM projects
      WHERE id = ?
    `);
  }

  list() {
    return this.listStatement.all().map(serializeProject);
  }

  get(id) {
    const project = this.findStatement.get(id);
    if (!project) {
      throw AppError.notFound('project_not_found', 'Project not found.');
    }
    return serializeProject(project);
  }

  create(input) {
    this.assertTemplateExists(input.template_id);
    const now = new Date().toISOString();
    const id = randomUUID();
    this.insertStatement.run(
      id,
      input.name,
      input.repo_url,
      input.repo_owner,
      input.repo_name,
      input.template_id,
      now,
      now,
    );
    return this.get(id);
  }

  update(id, input) {
    this.get(id);
    this.assertTemplateExists(input.template_id);
    this.updateStatement.run(
      input.name,
      input.repo_url,
      input.repo_owner,
      input.repo_name,
      input.template_id,
      new Date().toISOString(),
      id,
    );
    return this.get(id);
  }

  delete(id) {
    this.get(id);
    this.deleteStatement.run(id);
  }

  assertTemplateExists(id) {
    if (!this.templateExistsStatement.get(id)) {
      throw AppError.notFound('template_not_found', 'Template not found.');
    }
  }
}

module.exports = {
  ProjectRepository,
};
