import path from 'path';
import moduleAlias from 'module-alias';

try {
  moduleAlias.addAlias('@src', path.join(__dirname, '..', 'src'));
} catch (e) {}

import app from '../src/app';

export default app;
