const { AppError } = require('../domain/errors');

class GitHubClient {
  constructor({
    fetchImpl = fetch,
    token = process.env.GITHUB_TOKEN ?? '',
    baseUrl = 'https://api.github.com',
  } = {}) {
    this.fetchImpl = fetchImpl;
    this.token = token;
    this.baseUrl = baseUrl.replace(/\/$/, '');
  }

  async getRepositorySnapshot(owner, repository) {
    const metadata = await this.requestJson(`/repos/${owner}/${repository}`);
    if (!metadata.default_branch) {
      return {
        metadata,
        tree: [],
        warnings: ['Repository has no default branch.'],
      };
    }

    let treeResponse;
    try {
      treeResponse = await this.requestJson(
        `/repos/${owner}/${repository}/git/trees/${encodeURIComponent(metadata.default_branch)}?recursive=1`,
      );
    } catch (error) {
      if (error.status === 409) {
        return {
          metadata,
          tree: [],
          warnings: ['Repository default branch is empty.'],
        };
      }
      throw error;
    }

    const warnings = [];
    if (treeResponse.truncated) {
      warnings.push('Repository tree response was truncated by GitHub.');
    }

    return {
      metadata,
      tree: Array.isArray(treeResponse.tree)
        ? treeResponse.tree.map(({ path, type }) => ({ path, type }))
        : [],
      warnings,
    };
  }

  async requestJson(path) {
    let response;
    try {
      response = await this.fetchImpl(`${this.baseUrl}${path}`, {
        headers: this.buildHeaders(),
      });
    } catch (error) {
      throw AppError.badGateway(
        'github_unavailable',
        'GitHub is currently unavailable.',
        { cause: error.message },
      );
    }

    const payload = await response.json();
    if (response.ok) {
      return payload;
    }

    if (response.status === 404) {
      throw AppError.unprocessableEntity(
        'github_repository_not_found',
        'GitHub repository was not found.',
      );
    }

    if (
      response.status === 403
      && response.headers.get('x-ratelimit-remaining') === '0'
    ) {
      throw AppError.tooManyRequests(
        'github_rate_limited',
        'GitHub API rate limit exceeded.',
      );
    }

    if (response.status === 409) {
      throw Object.assign(
        AppError.conflict('github_conflict', payload.message || 'GitHub conflict.'),
        { payload },
      );
    }

    throw AppError.badGateway(
      'github_unavailable',
      'GitHub is currently unavailable.',
      { status: response.status },
    );
  }

  buildHeaders() {
    const headers = {
      accept: 'application/vnd.github+json',
      'user-agent': 'shipcheck',
    };

    if (this.token.trim() !== '') {
      headers.authorization = `Bearer ${this.token}`;
    }

    return headers;
  }
}

module.exports = {
  GitHubClient,
};
