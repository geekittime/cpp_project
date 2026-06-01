const { randomUUID } = require('node:crypto');
const express = require('express');

const { TemplateRepository } = require('./repositories/template-repository');
const { createTemplateRouter } = require('./routes/template-routes');

function createApp({ db, logger = console }) {
  const app = express();
  const templateRepository = new TemplateRepository(db);

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
  app.use('/api/templates', createTemplateRouter({ templateRepository }));

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
