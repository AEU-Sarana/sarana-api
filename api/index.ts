export default function handler(req: any, res: any) {
  try {
    const app = require('../src/app').default;
    return app(req, res);
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error?.message || String(error),
      stack: error?.stack,
    });
  }
}
