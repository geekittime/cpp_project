const { AppError } = require('./domain/errors');

function readConfig(env = process.env) {
  const portValue = env.PORT ?? '3000';
  const port = Number(portValue);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    throw AppError.badRequest(
      'invalid_config',
      'PORT must be an integer between 1 and 65535.',
    );
  }

  return {
    port,
    databasePath: env.DATABASE_PATH || 'data/shipcheck.sqlite',
    githubToken: env.GITHUB_TOKEN || '',
  };
}

module.exports = {
  readConfig,
};
