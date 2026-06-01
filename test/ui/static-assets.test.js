const assert = require('node:assert/strict');
const test = require('node:test');

const { createTestApp } = require('../helpers/app');

test('serves the dashboard shell and static assets', async () => {
  const app = await createTestApp();

  try {
    const index = await app.request('/');
    assert.equal(index.response.status, 200);
    assert.match(index.response.headers.get('content-type'), /text\/html/);
    assert.match(index.text, /ShipCheck/i);

    const styles = await app.request('/styles.css');
    assert.equal(styles.response.status, 200);
    assert.match(styles.response.headers.get('content-type'), /text\/css/);
    assert.match(styles.text, /--accent:/);

    const script = await app.request('/app.js');
    assert.equal(script.response.status, 200);
    assert.match(script.response.headers.get('content-type'), /javascript/);
    assert.match(script.text, /loadProjects/);
  } finally {
    await app.close();
  }
});
