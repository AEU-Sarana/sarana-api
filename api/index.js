"use strict";
module.exports = (req, res) => {
  try {
    const app = require("../dist/app.js").default;
    return app(req, res);
  } catch (error) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({
      error: error?.message || String(error),
      stack: error?.stack
    }));
  }
};
