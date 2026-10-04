export default function handler(req: any, res: any) {
  try {
    const app = require('../src/app').default;
    return app(req, res);
  } catch (error: any) {
    return res.status(200).json({
      success: false,
      error: error?.message || String(error),
      stack: error?.stack,
    });
  }
}
