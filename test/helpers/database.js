const { DatabaseSync } = require('node:sqlite');

function createTestDatabase() {
  return new DatabaseSync(':memory:');
}

module.exports = {
  createTestDatabase,
};
