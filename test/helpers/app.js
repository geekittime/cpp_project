const { migrateDatabase } = require('../../src/db/migrate');
const { createApp } = require('../../src/app');
const { createTestDatabase } = require('./database');

async function createTestApp() {
  const db = createTestDatabase();
  migrateDatabase(db);

  const server = createApp({ db, logger: { info() {} } }).listen(0);
  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  const { port } = server.address();

  return {
    db,
    async request(path, options = {}) {
      const headers = { ...options.headers };
      let body = options.body;

      if (body !== undefined && typeof body !== 'string') {
        headers['content-type'] = 'application/json';
        body = JSON.stringify(body);
      }

      const response = await fetch(`http://127.0.0.1:${port}${path}`, {
        ...options,
        headers,
        body,
      });

      return {
        response,
        body: response.status === 204 ? null : await response.json(),
      };
    },
    async close() {
      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
      db.close();
    },
  };
}

module.exports = {
  createTestApp,
};
