const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');

const { startServer } = require('../src/server');

test('starts the server, creates the data directory, and serves health', async () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'shipcheck-'));
  const databasePath = path.join(tempDir, 'data', 'shipcheck.sqlite');

  const runtime = await startServer({
    port: 0,
    databasePath,
    githubToken: '',
    logger: { info() {}, error() {} },
  });

  try {
    assert.equal(fs.existsSync(path.dirname(databasePath)), true);

    const response = await fetch(`http://127.0.0.1:${runtime.port}/api/health`);
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { status: 'ok' });
  } finally {
    await runtime.close();
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});
