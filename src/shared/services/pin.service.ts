// File: src/shared/services/pin.service.ts
import bcrypt from 'bcryptjs';

export async function verifyPIN(pin: string, pinHash: string): Promise<boolean> {
  return await bcrypt.compare(pin, pinHash);
}

export async function hashPIN(pin: string): Promise<string> {
  return await bcrypt.hash(pin, 10);
}