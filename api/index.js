"use strict";
module.exports = (req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');

  let appError = null;
  let appLoaded = false;
  try {
    const app = require('../dist/app.js').default;
    appLoaded = true;
    return app(req, res);
  } catch (err) {
    appError = err;
  }

  res.end(JSON.stringify({
    ok: true,
    appLoaded,
    error: appError ? (appError.message || String(appError)) : null,
    stack: appError ? appError.stack : null,
  }));
};
