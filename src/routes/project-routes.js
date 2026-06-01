const express = require('express');

const { AppError } = require('../domain/errors');
const { normalizeGitHubUrl } = require('../domain/github-url');

function validateEvidenceInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw AppError.badRequest('invalid_evidence', 'Evidence input must be an object.');
  }

  const completed = Boolean(input.completed);
  const text = typeof input.text === 'string' ? input.text.trim() : '';
  if (completed && text === '') {
    throw AppError.badRequest(
      'invalid_evidence',
      'Completed evidence requires non-empty text.',
    );
  }

  let url = null;
  if (input.url !== undefined && input.url !== null && input.url !== '') {
    try {
      const parsed = new URL(input.url);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        throw new Error('bad protocol');
      }
      url = parsed.toString();
    } catch {
      throw AppError.badRequest(
        'invalid_evidence',
        'Evidence URLs must use http or https.',
      );
    }
  }

  return {
    text,
    url,
    completed,
  };
}

function validateProjectInput(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw AppError.badRequest(
      'invalid_project',
      'Project input must be an object.',
    );
  }

  if (typeof input.name !== 'string' || input.name.trim() === '') {
    throw AppError.badRequest(
      'invalid_project',
      'Project name must be a non-empty string.',
    );
  }

  if (typeof input.template_id !== 'string' || input.template_id.trim() === '') {
    throw AppError.badRequest(
      'invalid_project',
      'Template id must be a non-empty string.',
    );
  }

  const repo = normalizeGitHubUrl(input.repo_url);
  return {
    name: input.name.trim(),
    repo_url: repo.url,
    repo_owner: repo.owner,
    repo_name: repo.repository,
    template_id: input.template_id.trim(),
  };
}

function createProjectRouter({
  projectRepository,
  templateRepository,
  evidenceRepository,
}) {
  const router = express.Router();

  router.get('/', (request, response) => {
    response.json({ projects: projectRepository.list() });
  });

  router.post('/', (request, response, next) => {
    try {
      response.status(201).json({
        project: projectRepository.create(validateProjectInput(request.body)),
      });
    } catch (error) {
      next(error);
    }
  });

  router.get('/:id', (request, response, next) => {
    try {
      response.json({ project: projectRepository.get(request.params.id) });
    } catch (error) {
      next(error);
    }
  });

  router.put('/:id', (request, response, next) => {
    try {
      response.json({
        project: projectRepository.update(
          request.params.id,
          validateProjectInput(request.body),
        ),
      });
    } catch (error) {
      next(error);
    }
  });

  router.delete('/:id', (request, response, next) => {
    try {
      projectRepository.delete(request.params.id);
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  router.put('/:id/evidence/:itemKey', (request, response, next) => {
    try {
      const project = projectRepository.get(request.params.id);
      const template = templateRepository.get(project.template.id);
      const item = template.items.find((entry) => entry.key === request.params.itemKey);

      if (!item) {
        throw AppError.notFound(
          'template_item_not_found',
          'Template item not found.',
        );
      }
      if (item.kind !== 'manual') {
        throw AppError.conflict(
          'evidence_not_allowed',
          'Evidence can only be attached to manual checklist items.',
        );
      }

      response.json({
        evidence: evidenceRepository.upsert(
          request.params.id,
          request.params.itemKey,
          validateEvidenceInput(request.body),
        ),
      });
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = {
  createProjectRouter,
};
