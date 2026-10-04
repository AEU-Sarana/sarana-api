import path from 'path';
import moduleAlias from 'module-alias';

// Dynamically map @src alias to src directory for Vercel Serverless
moduleAlias.addAlias('@src', path.join(__dirname, '..', 'src'));

import app from '../src/app';

export default app;
