"use strict";
module.exports = (req, res) => {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ status: 'ok', message: 'Vercel Serverless Function Baseline OK', time: new Date().toISOString() }));
};
