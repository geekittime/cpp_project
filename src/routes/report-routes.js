const express = require('express');

function createReportRouter({
  auditService,
  projectRepository,
  reportRepository,
}) {
  const router = express.Router({ mergeParams: true });

  function assertProjectExists(projectId) {
    projectRepository.get(projectId);
  }

  router.post('/audits', async (request, response, next) => {
    try {
      const report = await auditService.run(request.params.id);
      response.status(201).json({ report });
    } catch (error) {
      next(error);
    }
  });

  router.get('/reports', (request, response, next) => {
    try {
      assertProjectExists(request.params.id);
      response.json({ reports: reportRepository.listByProject(request.params.id) });
    } catch (error) {
      next(error);
    }
  });

  router.get('/reports/:reportId', (request, response, next) => {
    try {
      assertProjectExists(request.params.id);
      response.json({
        report: reportRepository.getByProject(request.params.id, request.params.reportId),
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = {
  createReportRouter,
};
