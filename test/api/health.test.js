const assert = require('node:assert/strict');
const test = require('node:test');

const { createTestApp } = require('../helpers/app');

test('returns a simple health payload', async () => {
  const app = await createTestApp();

  try {
    const result = await app.request('/api/health');
    assert.equal(result.response.status, 200);
    assert.deepEqual(result.body, { status: 'ok' });
  } finally {
    await app.close();
  }
});
