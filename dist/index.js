"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv_1 = __importDefault(require("dotenv"));
// Load .env before anything else
dotenv_1.default.config();
// Register module aliases only in production (dev uses tsconfig paths via tsx)
if (process.env.NODE_ENV === 'production') {
    require('module-alias/register');
}
const app_1 = __importDefault(require("./app"));
const env_1 = require("./shared/config/env");
const helpers_1 = require("./shared/utils/helpers");
const PORT = env_1.env.PORT;
// In production, always listen on 0.0.0.0 to accept connections from any interface
const HOST = env_1.env.NODE_ENV === 'production' ? '0.0.0.0' : (env_1.env.HOST || '0.0.0.0');
// Global error handlers to prevent silent crashes
process.on('unhandledRejection', (reason, promise) => {
    console.error('⚠️  Unhandled Promise Rejection:', reason);
});
process.on('uncaughtException', (error) => {
    console.error('⚠️  Uncaught Exception:', error);
    // In production, log and continue; in development, exit
    if (env_1.env.NODE_ENV !== 'production') {
        process.exit(1);
    }
});
if (!process.env.VERCEL) {
    app_1.default.listen(PORT, HOST, () => {
        const networkIP = (0, helpers_1.getLocalNetworkIP)();
        console.log('\n🚀 Server is running!\n');
        console.log(`📌 Environment: ${env_1.env.NODE_ENV}`);
        console.log(`📌 Listening on: ${HOST}:${PORT}\n`);
        console.log('📍 Local access:');
        console.log(`   http://localhost:${PORT}`);
        console.log(`   Health: http://localhost:${PORT}/health`);
        console.log(`   API v1: http://localhost:${PORT}/api/v1`);
        if (networkIP && env_1.env.NODE_ENV !== 'production') {
            console.log('\n🌐 Network access (Wi-Fi):');
            console.log(`   http://${networkIP}:${PORT}`);
            console.log(`   Health: http://${networkIP}:${PORT}/health`);
            console.log(`   API v1: http://${networkIP}:${PORT}/api/v1`);
            console.log(`\n💡 Other devices on your network can access the API using: http://${networkIP}:${PORT}`);
        }
        else if (env_1.env.NODE_ENV === 'production') {
            console.log('\n🌐 Production mode:');
            console.log(`   Server is listening on all interfaces (0.0.0.0:${PORT})`);
            console.log(`   Access via reverse proxy (Nginx)`);
        }
        else {
            console.log('\n⚠️  Could not detect network IP address. Server is listening on all interfaces.');
        }
        console.log('');
    });
}
// // Register module aliases FIRST (before any @src imports)
// import 'module-alias/register';
// import dotenv from 'dotenv';
// // Load .env before anything else
// dotenv.config();
// import app from './app';
// import { env } from './shared/config/env';
// import { getLocalNetworkIP } from './shared/utils/helpers';
// const PORT = env.PORT;
// const HOST = env.HOST;
// app.listen(PORT, HOST, () => {
//   const networkIP = getLocalNetworkIP();
//   console.log('\n🚀 Server is running!\n');
//   console.log('📍 Local access:');
//   console.log(`   http://localhost:${PORT}`);
//   console.log(`   Health: http://localhost:${PORT}/health`);
//   console.log(`   API v1: http://localhost:${PORT}/api/v1`);
//   if (networkIP) {
//     console.log('\n🌐 Network access (Wi-Fi):');
//     console.log(`   http://${networkIP}:${PORT}`);
//     console.log(`   Health: http://${networkIP}:${PORT}/health`);
//     console.log(`   API v1: http://${networkIP}:${PORT}/api/v1`);
//     console.log(`\n💡 Other devices on your network can access the API using: http://${networkIP}:${PORT}`);
//   } else {
//     console.log('\n⚠️  Could not detect network IP address. Server is listening on all interfaces.');
//   }
//   console.log('');
// });
//# sourceMappingURL=index.js.map