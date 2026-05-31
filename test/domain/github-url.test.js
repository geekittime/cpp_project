const assert = require('node:assert/strict');
const test = require('node:test');

const { normalizeGitHubUrl } = require('../../src/domain/github-url');

test('normalizes a public GitHub repository URL', () => {
  assert.deepEqual(
    normalizeGitHubUrl('https://github.com/obra/superpowers.git/'),
    {
      owner: 'obra',
      repository: 'superpowers',
      url: 'https://github.com/obra/superpowers',
    },
  );
});

test('rejects malformed or unsupported repository URLs', () => {
  const invalidUrls = [
    '',
    'https://github.com/',
    'https://github.com/obra',
    'https://github.com/obra/',
    'https://github.com//superpowers',
    'https://gitlab.com/obra/superpowers',
    'https://www.github.com/obra/superpowers',
    'https://github.com/obra/superpowers/issues',
    'https://github.com/obra/superpowers?tab=readme',
    'https://github.com/obra/superpowers#readme',
  ];

  for (const url of invalidUrls) {
    assert.throws(
      () => normalizeGitHubUrl(url),
      { code: 'invalid_github_url', status: 400 },
      url,
    );
  }
});
