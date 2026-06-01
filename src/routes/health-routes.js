const express = require('express');

function createHealthRouter() {
  const router = express.Router();
  router.get('/', (request, response) => {
    response.json({ status: 'ok' });
  });
  return router;
}

module.exports = {
  createHealthRouter,
};
