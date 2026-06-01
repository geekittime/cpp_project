const { AppError } = require('./errors');

const ITEM_KEY_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ITEM_KINDS = new Set(['automated', 'manual']);
const ITEM_SEVERITIES = new Set(['blocking', 'advisory']);

function invalidTemplate(message, details) {
  return AppError.badRequest('invalid_template', message, details);
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function requireString(value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw invalidTemplate(`${field} must be a non-empty string.`);
  }
  return value.trim();
}

function validateRule(rule, itemKey) {
  if (!isObject(rule) || typeof rule.type !== 'string') {
    throw invalidTemplate(`Automated item "${itemKey}" must include a rule.`);
  }

  switch (rule.type) {
    case 'file_exists':
    case 'directory_exists':
      return {
        type: rule.type,
        path: requireString(rule.path, `Rule path for "${itemKey}"`),
      };
    case 'file_any_exists':
      if (!Array.isArray(rule.paths) || rule.paths.length === 0) {
        throw invalidTemplate(`Rule paths for "${itemKey}" must not be empty.`);
      }
      return {
        type: rule.type,
        paths: rule.paths.map((path) => (
          requireString(path, `Rule path for "${itemKey}"`)
        )),
      };
    case 'repository_has_description':
      return { type: rule.type };
    default:
      throw invalidTemplate(`Unsupported rule type "${rule.type}".`);
  }
}

function validateItem(item) {
  if (!isObject(item)) {
    throw invalidTemplate('Template items must be objects.');
  }

  const key = requireString(item.key, 'Item key');
  if (!ITEM_KEY_PATTERN.test(key)) {
    throw invalidTemplate(`Item key "${key}" must use kebab-case.`);
  }
  if (!ITEM_KINDS.has(item.kind)) {
    throw invalidTemplate(`Unsupported item kind "${item.kind}".`);
  }
  if (!ITEM_SEVERITIES.has(item.severity)) {
    throw invalidTemplate(`Unsupported item severity "${item.severity}".`);
  }

  if (item.kind === 'manual') {
    if (item.rule !== null && item.rule !== undefined) {
      throw invalidTemplate(`Manual item "${key}" must not include a rule.`);
    }
    return {
      key,
      title: requireString(item.title, `Item title for "${key}"`),
      description: requireString(
        item.description,
        `Item description for "${key}"`,
      ),
      kind: item.kind,
      severity: item.severity,
      rule: null,
    };
  }

  return {
    key,
    title: requireString(item.title, `Item title for "${key}"`),
    description: requireString(
      item.description,
      `Item description for "${key}"`,
    ),
    kind: item.kind,
    severity: item.severity,
    rule: validateRule(item.rule, key),
  };
}

function validateTemplateInput(input) {
  if (!isObject(input)) {
    throw invalidTemplate('Template input must be an object.');
  }
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw invalidTemplate('Template must include at least one item.');
  }

  const keys = new Set();
  const items = input.items.map((item) => {
    const validatedItem = validateItem(item);
    if (keys.has(validatedItem.key)) {
      throw invalidTemplate(`Duplicate item key "${validatedItem.key}".`);
    }
    keys.add(validatedItem.key);
    return validatedItem;
  });

  return {
    name: requireString(input.name, 'Template name'),
    items,
  };
}

module.exports = {
  validateTemplateInput,
};
