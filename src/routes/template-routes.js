const express = require('express');

const ITEM_KINDS = new Set(['automated', 'manual']);
const ITEM_SEVERITIES = new Set(['blocking', 'advisory']);
const PATH_RULES = new Set(['file_exists', 'directory_exists']);

function routeError(status, code, message, details = {}) {
  return Object.assign(new Error(message), { status, code, details });
}

function invalidTemplate(message) {
  throw routeError(400, 'invalid_template', message);
}

function trimRequired(value, label) {
  if (typeof value !== 'string' || value.trim() === '') {
    invalidTemplate(`${label} is required.`);
  }
  return value.trim();
}

function normalizeRule(rule) {
  if (!rule || typeof rule !== 'object' || Array.isArray(rule)) {
    invalidTemplate('Automated items require a supported rule.');
  }

  if (PATH_RULES.has(rule.type)) {
    return { type: rule.type, path: trimRequired(rule.path, 'Rule path') };
  }

  if (rule.type === 'file_any_exists') {
    if (
      !Array.isArray(rule.paths)
      || rule.paths.length === 0
      || rule.paths.some((path) => typeof path !== 'string' || path.trim() === '')
    ) {
      invalidTemplate('file_any_exists rules require at least one path.');
    }
    return { type: rule.type, paths: rule.paths.map((path) => path.trim()) };
  }

  if (rule.type === 'repository_has_description') {
    return { type: rule.type };
  }

  invalidTemplate('Automated items require a supported rule.');
}

function normalizeItem(item, keys) {
  if (!item || typeof item !== 'object' || Array.isArray(item)) {
    invalidTemplate('Template items must be objects.');
  }

  const key = trimRequired(item.key, 'Item key');
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(key)) {
    invalidTemplate('Item keys must use kebab-case.');
  }
  if (keys.has(key)) {
    invalidTemplate('Template item keys must be unique.');
  }
  keys.add(key);

  if (!ITEM_KINDS.has(item.kind)) {
    invalidTemplate('Template items require a supported kind.');
  }
  if (!ITEM_SEVERITIES.has(item.severity)) {
    invalidTemplate('Template items require a supported severity.');
  }

  let rule;
  if (item.kind === 'automated') {
    rule = normalizeRule(item.rule);
  } else {
    if (item.rule !== null && item.rule !== undefined) {
      invalidTemplate('Manual items cannot define automated rules.');
    }
    rule = null;
  }

  return {
    key,
    title: trimRequired(item.title, 'Item title'),
    description: trimRequired(item.description, 'Item description'),
    kind: item.kind,
    severity: item.severity,
    rule,
  };
}

function normalizeTemplate(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    invalidTemplate('Template input is required.');
  }
  if (!Array.isArray(input.items) || input.items.length === 0) {
    invalidTemplate('Templates require at least one item.');
  }

  const keys = new Set();
  return {
    name: trimRequired(input.name, 'Template name'),
    items: input.items.map((item) => normalizeItem(item, keys)),
  };
}

function normalizeCopy(input) {
  return {
    name: trimRequired(input && input.name, 'Template name'),
  };
}

function createTemplateRouter({ templateRepository }) {
  const router = express.Router();

  router.get('/', (request, response) => {
    response.json({ templates: templateRepository.list() });
  });

  router.get('/:id', (request, response, next) => {
    try {
      response.json({ template: templateRepository.get(request.params.id) });
    } catch (error) {
      next(error);
    }
  });

  router.post('/:id/copy', (request, response, next) => {
    try {
      const input = normalizeCopy(request.body);
      response.status(201).json({
        template: templateRepository.copy(request.params.id, input.name),
      });
    } catch (error) {
      next(error);
    }
  });

  router.put('/:id', (request, response, next) => {
    try {
      templateRepository.assertEditable(request.params.id);
      response.json({
        template: templateRepository.update(
          request.params.id,
          normalizeTemplate(request.body),
        ),
      });
    } catch (error) {
      next(error);
    }
  });

  router.delete('/:id', (request, response, next) => {
    try {
      templateRepository.delete(request.params.id);
      response.status(204).end();
    } catch (error) {
      next(error);
    }
  });

  return router;
}

module.exports = {
  createTemplateRouter,
};
