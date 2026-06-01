const { randomUUID } = require('node:crypto');
const path = require('node:path');
const express = require('express');

const { EvidenceRepository } = require('./repositories/evidence-repository');
const { ProjectRepository } = require('./repositories/project-repository');
const { ReportRepository } = require('./repositories/report-repository');
const { TemplateRepository } = require('./repositories/template-repository');
const { createHealthRouter } = require('./routes/health-routes');
const { createProjectRouter } = require('./routes/project-routes');
const { createReportRouter } = require('./routes/report-routes');
const { createTemplateRouter } = require('./routes/template-routes');
const { GitHubClient } = require('./services/github-client');
const { AuditService } = require('./services/audit-service');

function createApp({
  db,
  logger = console,
  githubClient = null,
  githubToken = '',
}) {
  const app = express();
  const evidenceRepository = new EvidenceRepository(db);
  const projectRepository = new ProjectRepository(db);
  const reportRepository = new ReportRepository(db);
  const templateRepository = new TemplateRepository(db);
  const auditService = new AuditService({
    projectRepository,
    templateRepository,
    evidenceRepository,
    reportRepository,
    githubClient: githubClient ?? new GitHubClient({ token: githubToken }),
    logger,
  });

  app.use((request, response, next) => {
    const startedAt = Date.now();
    request.id = randomUUID();
    response.set('x-request-id', request.id);
    response.on('finish', () => {
      logger.info(JSON.stringify({
        request_id: request.id,
        method: request.method,
        path: request.originalUrl,
        status: response.statusCode,
        duration_ms: Date.now() - startedAt,
      }));
    });
    next();
  });

  app.use(express.json({ limit: '100kb' }));
  app.use('/api/health', createHealthRouter());
  app.use('/api/projects', createProjectRouter({
    projectRepository,
    templateRepository,
    evidenceRepository,
  }));
  app.use('/api/projects/:id', createReportRouter({
    auditService,
    projectRepository,
    reportRepository,
  }));
  app.use('/api/templates', createTemplateRouter({ templateRepository }));
  app.use('/api', (request, response) => {
    response.status(404).json({
      error: {
        code: 'not_found',
        message: 'Route not found.',
        details: {},
      },
    });
  });
  app.use(express.static(path.join(__dirname, 'public')));

  app.use((error, request, response, next) => {
    if (response.headersSent) {
      next(error);
      return;
    }

    const status = Number.isInteger(error.status) ? error.status : 500;
    response.status(status).json({
      error: {
        code: status !== 500 && typeof error.code === 'string'
          ? error.code
          : 'internal_error',
        message: status === 500 ? 'Internal server error.' : error.message,
        details: error.details && typeof error.details === 'object'
          ? error.details
          : {},
      },
    });
  });

  return app;
}

module.exports = {
  createApp,
};
