const { AppError } = require('./errors');

function result(status, detail) {
  return { status, detail };
}

function evaluateRule(rule, { metadata = {}, paths = new Set() } = {}) {
  switch (rule.type) {
    case 'file_exists':
      return paths.has(rule.path)
        ? result('passed', `${rule.path} was found.`)
        : result('failed', `${rule.path} was not found.`);
    case 'file_any_exists': {
      const foundPath = rule.paths.find((path) => paths.has(path));
      return foundPath === undefined
        ? result('failed', `None of ${rule.paths.join(', ')} were found.`)
        : result('passed', `${foundPath} was found.`);
    }
    case 'directory_exists': {
      const prefix = `${rule.path}/`;
      const found = [...paths].some((path) => (
        path === rule.path || path.startsWith(prefix)
      ));
      return found
        ? result('passed', `${rule.path} was found.`)
        : result('failed', `${rule.path} was not found.`);
    }
    case 'repository_has_description':
      return typeof metadata.description === 'string'
        && metadata.description.trim() !== ''
        ? result('passed', 'Repository description is present.')
        : result('failed', 'Repository description is missing.');
    default:
      throw AppError.badRequest(
        'unsupported_rule',
        `Unsupported rule type "${rule.type}".`,
      );
  }
}

module.exports = {
  evaluateRule,
};
