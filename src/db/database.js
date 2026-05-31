const { DatabaseSync } = require('node:sqlite');

function openDatabase(path) {
  const db = new DatabaseSync(path);
  db.exec('PRAGMA foreign_keys = ON');
  return db;
}

module.exports = {
  openDatabase,
};
