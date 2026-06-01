const assert = require('node:assert/strict');
const test = require('node:test');

const { migrateDatabase } = require('../../src/db/migrate');
const { ProjectRepository } = require('../../src/repositories/project-repository');
const { TemplateRepository } = require('../../src/repositories/template-repository');
const { EvidenceRepository } = require('../../src/repositories/evidence-repository');
const { ReportRepository } = require('../../src/repositories/report-repository');
const { AuditService } = require('../../src/services/audit-service');
const { createTestDatabase } = require('../helpers/database');

test('creates and stores an immutable report snapshot', async () => {
  const db = createTestDatabase();
  migrateDatabase(db);

  try {
    const projectRepository = new ProjectRepository(db);
    const templateRepository = new TemplateRepository(db);
    const evidenceRepository = new EvidenceRepository(db);
    const reportRepository = new ReportRepository(db);
    const service = new AuditService({
      projectRepository,
      templateRepository,
      evidenceRepository,
      reportRepository,
      githubClient: {
        async getRepositorySnapshot() {
          return {
            metadata: {
              full_name: 'obra/superpowers',
              description: 'Workflow helper',
              html_url: 'https://github.com/obra/superpowers',
              default_branch: 'main',
            },
            tree: [
              { path: 'README.md', type: 'blob' },
              { path: 'Dockerfile', type: 'blob' },
            ],
            warnings: ['Repository tree response was truncated by GitHub.'],
          };
        },
      },
    });

    const project = projectRepository.create({
      name: 'ShipCheck',
      repo_url: 'https://github.com/obra/superpowers',
      repo_owner: 'obra',
      repo_name: 'superpowers',
      template_id: 'ai4se-final-project',
    });

    evidenceRepository.upsert(project.id, 'spec-document', {
      text: 'SPEC reviewed',
      url: 'https://example.com/spec-review',
      completed: true,
    });

    const report = await service.run(project.id);

    assert.equal(report.project_id, project.id);
    assert.equal(report.status, 'blocked');
    assert.equal(report.score, 40);
    assert.deepEqual(report.counts, {
      total: 10,
      passed: 4,
      failed: 1,
      pending: 5,
    });
    assert.deepEqual(report.github, {
      full_name: 'obra/superpowers',
      description: 'Workflow helper',
      html_url: 'https://github.com/obra/superpowers',
      default_branch: 'main',
    });
    assert.deepEqual(report.warnings, ['Repository tree response was truncated by GitHub.']);
    assert.equal(report.items.find((item) => item.key === 'docker').status, 'passed');
    assert.equal(report.items.find((item) => item.key === 'ci-workflow').status, 'failed');
    assert.equal(report.items.find((item) => item.key === 'spec-document').status, 'passed');
    assert.equal(report.items.find((item) => item.key === 'plan-document').status, 'pending');

    const summaries = reportRepository.listByProject(project.id);
    assert.equal(summaries.length, 1);
    assert.equal(summaries[0].id, report.id);

    const stored = reportRepository.getByProject(project.id, report.id);
    assert.equal(stored.snapshot_json.items.length, 10);
  } finally {
    db.close();
  }
});
