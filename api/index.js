"use strict";

let app;
let initError = null;

try {
  app = require("../dist/app.js").default;
} catch (err) {
  initError = err;
}

module.exports = (req, res) => {
  if (initError || !app) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    return res.end(
      JSON.stringify({
        success: false,
        message: "Server initialization error on Vercel",
        error: initError ? (initError.message || String(initError)) : "App not found",
        stack: initError ? initError.stack : null,
      })
    );
  }

  return app(req, res);
};
