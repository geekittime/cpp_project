const fs = require('node:fs');
const path = require('node:path');

const { createApp } = require('./app');
const { readConfig } = require('./config');
const { openDatabase } = require('./db/database');
const { migrateDatabase } = require('./db/migrate');

async function startServer({
  port,
  databasePath,
  githubToken,
  logger = console,
  installSignalHandlers = false,
}) {
  fs.mkdirSync(path.dirname(databasePath), { recursive: true });

  const db = openDatabase(databasePath);
  migrateDatabase(db);

  const app = createApp({
    db,
    logger,
    githubToken,
  });
  const server = app.listen(port);

  await new Promise((resolve, reject) => {
    server.once('listening', resolve);
    server.once('error', reject);
  });

  let closed = false;
  const listeners = [];
  const runtime = {
    server,
    db,
    port: server.address().port,
    async close() {
      if (closed) {
        return;
      }
      closed = true;

      for (const [event, listener] of listeners) {
        process.off(event, listener);
      }

      await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      });
      db.close();
    },
  };

  if (installSignalHandlers) {
    const handleSignal = (signal) => async () => {
      logger.info(JSON.stringify({
        event: 'shutdown',
        signal,
      }));
      try {
        await runtime.close();
        process.exit(0);
      } catch (error) {
        logger.error(JSON.stringify({
          event: 'shutdown_error',
          signal,
          message: error.message,
        }));
        process.exit(1);
      }
    };

    for (const signal of ['SIGINT', 'SIGTERM']) {
      const listener = handleSignal(signal);
      listeners.push([signal, listener]);
      process.on(signal, listener);
    }
  }

  logger.info(JSON.stringify({
    event: 'server_started',
    port: runtime.port,
    database_path: databasePath,
  }));

  return runtime;
}

async function main() {
  try {
    await startServer({
      ...readConfig(),
      installSignalHandlers: true,
    });
  } catch (error) {
    console.error(JSON.stringify({
      event: 'startup_error',
      code: error.code || 'startup_failed',
      message: error.message,
    }));
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  startServer,
};
