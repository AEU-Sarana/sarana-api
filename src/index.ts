// Register module aliases FIRST (before any @src imports)
import 'module-alias/register';
import dotenv from 'dotenv';

// Load .env before anything else
dotenv.config();

import app from './app';
import { env } from '@src/shared/config/env';
import { getLocalNetworkIP } from '@src/shared/utils/helpers';

const PORT = env.PORT;
const HOST = env.HOST;

app.listen(PORT, HOST, () => {
  const networkIP = getLocalNetworkIP();
  
  console.log('\n🚀 Server is running!\n');
  console.log('📍 Local access:');
  console.log(`   http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   API v1: http://localhost:${PORT}/api/v1`);
  
  if (networkIP) {
    console.log('\n🌐 Network access (Wi-Fi):');
    console.log(`   http://${networkIP}:${PORT}`);
    console.log(`   Health: http://${networkIP}:${PORT}/health`);
    console.log(`   API v1: http://${networkIP}:${PORT}/api/v1`);
    console.log(`\n💡 Other devices on your network can access the API using: http://${networkIP}:${PORT}`);
  } else {
    console.log('\n⚠️  Could not detect network IP address. Server is listening on all interfaces.');
  }
  console.log('');
});