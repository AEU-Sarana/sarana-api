"use strict";

let app;
let initError = null;

try {
  app = require("../dist/app.js").default;
} catch (err) {
  initError = err;
  console.error("Vercel App Init Error:", err);
}

module.exports = (req, res) => {
  const origin = req.headers.origin || "*";

  // Always set CORS headers so browser never gets an opaque CORS error on Vercel
  res.setHeader("Access-Control-Allow-Origin", origin);
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS, HEAD");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Origin, X-Requested-With, Content-Type, Accept, Authorization, Range, X-Total-Count"
  );
  res.setHeader("Access-Control-Expose-Headers", "Content-Range, X-Total-Count");

  // Handle browser preflight OPTIONS immediately
  if (req.method === "OPTIONS") {
    res.statusCode = 204;
    return res.end();
  }

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
