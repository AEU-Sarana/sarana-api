import path from 'path';
import moduleAlias from 'module-alias';

try {
  moduleAlias.addAlias('@src', path.join(__dirname, '..', 'src'));
} catch (e) {
  // ignore if already registered
}

export default async function handler(req: any, res: any) {
  try {
    // Dynamically import app so any initialization error is caught cleanly
    const appModule = await import('../src/app');
    const app = appModule.default || appModule;
    return app(req, res);
  } catch (error: any) {
    console.error('Vercel serverless invocation error:', error);
    return res.status(500).json({
      success: false,
      error: 'SERVERLESS_INVOCATION_ERROR',
      message: error?.message || String(error),
      stack: error?.stack,
    });
  }
}
