import bcrypt from 'bcrypt';

export interface UserSeedData {
  username: string;
  email?: string;
  passwordHash: string;
  pinHash?: string;
  fullName: string;
  role: 'ADMIN' | 'CASHIER';
  phone?: string;
  status: 'active' | 'inactive';
  deviceId?: string;
  tenantId: number;
  createdByUsername?: string;
}

export const userSeedData: UserSeedData[] = [
  {
    username: 'admin',
    email: 'admin@gmail.com',
    passwordHash: bcrypt.hashSync('Admin123!', 10),
    fullName: 'System Administrator',
    role: 'ADMIN',
    phone: '012345678',
    status: 'active',
    tenantId: 1,
  },
  {
    username: 'cashier1',
    email: 'cashier1@gmail.com',
    passwordHash: bcrypt.hashSync('Cashier123!', 10),
    fullName: 'Cashier One',
    role: 'CASHIER',
    phone: '012345679',
    status: 'active',
    tenantId: 1,
    createdByUsername: 'admin',
  },
  {
    username: 'cashier2',
    email: 'cashier2@gmail.com',
    passwordHash: bcrypt.hashSync('Cashier123!', 10),
    fullName: 'Cashier Two',
    role: 'CASHIER',
    phone: '012345680',
    status: 'active',
    tenantId: 1,
    createdByUsername: 'admin',
  },
];
