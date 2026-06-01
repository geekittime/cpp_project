const assert = require('node:assert/strict');
const test = require('node:test');

const { readConfig } = require('../src/config');

test('reads default config values', () => {
  const config = readConfig({});
  assert.deepEqual(config, {
    port: 3000,
    databasePath: 'data/shipcheck.sqlite',
    githubToken: '',
  });
});

test('reads explicit config values and rejects invalid ports', () => {
  const config = readConfig({
    PORT: '4123',
    DATABASE_PATH: 'var/shipcheck.sqlite',
    GITHUB_TOKEN: 'secret',
  });
  assert.deepEqual(config, {
    port: 4123,
    databasePath: 'var/shipcheck.sqlite',
    githubToken: 'secret',
  });

  assert.throws(
    () => readConfig({ PORT: '0' }),
    { code: 'invalid_config', status: 400 },
  );
});
