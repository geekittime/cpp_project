const { AppError } = require('./errors');

function invalidGitHubUrl() {
  return AppError.badRequest(
    'invalid_github_url',
    'Repository URL must use the form https://github.com/{owner}/{repository}.',
  );
}

function normalizeGitHubUrl(value) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw invalidGitHubUrl();
  }
  if (
    value.includes('?')
    || value.includes('#')
    || /\/\.{1,2}(?:\/|$)/.test(value)
  ) {
    throw invalidGitHubUrl();
  }

  let url;
  try {
    url = new URL(value);
  } catch {
    throw invalidGitHubUrl();
  }

  if (
    url.protocol !== 'https:'
    || url.hostname !== 'github.com'
    || url.port !== ''
    || url.username !== ''
    || url.password !== ''
    || url.search !== ''
    || url.hash !== ''
  ) {
    throw invalidGitHubUrl();
  }

  const pathname = url.pathname.endsWith('/')
    ? url.pathname.slice(0, -1)
    : url.pathname;
  const segments = pathname.split('/');

  if (segments.length !== 3 || segments[1] === '' || segments[2] === '') {
    throw invalidGitHubUrl();
  }

  const owner = segments[1];
  const repository = segments[2].endsWith('.git')
    ? segments[2].slice(0, -4)
    : segments[2];

  if (repository === '') {
    throw invalidGitHubUrl();
  }

  return {
    owner,
    repository,
    url: `https://github.com/${owner}/${repository}`,
  };
}

module.exports = {
  normalizeGitHubUrl,
};
