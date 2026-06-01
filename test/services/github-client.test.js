const assert = require('node:assert/strict');
const test = require('node:test');

const { GitHubClient } = require('../../src/services/github-client');

function createResponse(status, body, headers = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name) {
        return headers[name.toLowerCase()] ?? null;
      },
    },
    async json() {
      return body;
    },
  };
}

test('fetches repository metadata and recursive tree with expected headers', async () => {
  const calls = [];
  const client = new GitHubClient({
    token: 'secret-token',
    fetchImpl: async (url, options) => {
      calls.push({ url, options });
      if (url.endsWith('/repos/obra/superpowers')) {
        return createResponse(200, {
          full_name: 'obra/superpowers',
          description: 'Spec-driven workflow tools',
          html_url: 'https://github.com/obra/superpowers',
          default_branch: 'main',
        });
      }

      return createResponse(200, {
        truncated: false,
        tree: [
          { path: 'README.md', type: 'blob' },
          { path: '.github/workflows', type: 'tree' },
        ],
      });
    },
  });

  const snapshot = await client.getRepositorySnapshot('obra', 'superpowers');

  assert.equal(calls.length, 2);
  assert.equal(calls[0].options.headers.authorization, 'Bearer secret-token');
  assert.equal(calls[0].options.headers.accept, 'application/vnd.github+json');
  assert.match(calls[1].url, /\/git\/trees\/main\?recursive=1$/);
  assert.deepEqual(snapshot, {
    metadata: {
      full_name: 'obra/superpowers',
      description: 'Spec-driven workflow tools',
      html_url: 'https://github.com/obra/superpowers',
      default_branch: 'main',
    },
    tree: [
      { path: 'README.md', type: 'blob' },
      { path: '.github/workflows', type: 'tree' },
    ],
    warnings: [],
  });
});

test('returns an empty tree with a warning for empty repositories', async () => {
  const client = new GitHubClient({
    fetchImpl: async (url) => {
      if (url.endsWith('/repos/obra/empty')) {
        return createResponse(200, {
          full_name: 'obra/empty',
          description: '',
          html_url: 'https://github.com/obra/empty',
          default_branch: 'main',
        });
      }

      return createResponse(409, {
        message: 'Git Repository is empty.',
      });
    },
  });

  const snapshot = await client.getRepositorySnapshot('obra', 'empty');
  assert.deepEqual(snapshot.tree, []);
  assert.deepEqual(snapshot.warnings, ['Repository default branch is empty.']);
});

test('reports tree truncation as a warning', async () => {
  const client = new GitHubClient({
    fetchImpl: async (url) => {
      if (url.endsWith('/repos/obra/big')) {
        return createResponse(200, {
          full_name: 'obra/big',
          description: 'Large tree',
          html_url: 'https://github.com/obra/big',
          default_branch: 'main',
        });
      }

      return createResponse(200, {
        truncated: true,
        tree: [{ path: 'README.md', type: 'blob' }],
      });
    },
  });

  const snapshot = await client.getRepositorySnapshot('obra', 'big');
  assert.deepEqual(snapshot.warnings, ['Repository tree response was truncated by GitHub.']);
});

test('maps repository not found, rate limits, and upstream failures', async () => {
  const notFound = new GitHubClient({
    fetchImpl: async () => createResponse(404, { message: 'Not Found' }),
  });
  await assert.rejects(
    () => notFound.getRepositorySnapshot('obra', 'missing'),
    { code: 'github_repository_not_found', status: 422 },
  );

  const rateLimited = new GitHubClient({
    fetchImpl: async () => createResponse(
      403,
      { message: 'API rate limit exceeded' },
      { 'x-ratelimit-remaining': '0' },
    ),
  });
  await assert.rejects(
    () => rateLimited.getRepositorySnapshot('obra', 'slow'),
    { code: 'github_rate_limited', status: 429 },
  );

  const upstreamFailure = new GitHubClient({
    fetchImpl: async () => createResponse(500, { message: 'Oops' }),
  });
  await assert.rejects(
    () => upstreamFailure.getRepositorySnapshot('obra', 'broken'),
    { code: 'github_unavailable', status: 502 },
  );

  const networkFailure = new GitHubClient({
    fetchImpl: async () => {
      throw new Error('socket hang up');
    },
  });
  await assert.rejects(
    () => networkFailure.getRepositorySnapshot('obra', 'offline'),
    { code: 'github_unavailable', status: 502 },
  );
});
