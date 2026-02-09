import jwt from 'jsonwebtoken';
import { TokenService as TokenServiceV2 } from './src/domains/Auth/services/V2/token.service';
import { env } from './src/shared/config/env';

const payload = {
    userId: 123,
    role: 'ADMIN' as const,
    deviceId: 'test-device'
};

const token = TokenServiceV2.generateAccessToken(payload);
const decoded = jwt.verify(token, env.JWT_SECRET) as any;

console.log('Decoded Payload:', JSON.stringify(decoded, null, 2));

if (decoded.userId === 123) {
    console.log('✅ Success: userId correctly populated in JWT payload!');
} else {
    console.error('❌ Failure: userId missing or incorrect in JWT payload.');
    process.exit(1);
}

if (decoded.deviceId === 'test-device') {
    console.log('✅ Success: deviceId correctly populated in JWT payload!');
} else {
    console.error('❌ Failure: deviceId missing or incorrect in JWT payload.');
    process.exit(1);
}

console.log('✅ JWT normalization verified successfully!');
