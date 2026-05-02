import bcrypt from 'bcrypt';

export interface UserSeedData {
  username: string;
  email?: string;
  passwordHash: string;
  pinHash?: string;
  fullName: string;
  role: 'ADMIN' | 'CASHIER' | 'RECEIVER';
  phone?: string;
  status: 'active' | 'inactive';
  deviceId?: string;
  isDeviceBound?: boolean;
  tenantId: number;
  createdByUsername?: string;
}

export const userSeedData: UserSeedData[] = [
  {
    username: 'admin',
    email: 'admin@stockpos.com',
    passwordHash: bcrypt.hashSync('Admin123!', 10),
    fullName: 'System Administrator',
    role: 'ADMIN',
    phone: '012345678',
    status: 'active',
    tenantId: 1,
  },
  {
    username: 'test-admin',
    email: 'testadmin@stockpos.com',
    passwordHash: bcrypt.hashSync('Admin123!', 10),
    fullName: 'Test Administrator',
    role: 'ADMIN',
    phone: '0123456711',
    status: 'active',
    tenantId: 3,
  },
  {
    username: 'cashier1',
    email: 'cashier1@stockpos.com',
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
    email: 'cashier2@stockpos.com',
    passwordHash: bcrypt.hashSync('Cashier123!', 10),
    fullName: 'Cashier Two',
    role: 'CASHIER',
    phone: '012345680',
    status: 'active',
    tenantId: 1,
    createdByUsername: 'admin',
  },
  {
    username: 'cashier3',
    email: 'cashier3@stockpos.com',
    passwordHash: bcrypt.hashSync('Cashier123!', 10),
    fullName: 'Cashier Three',
    role: 'CASHIER',
    phone: '012345681',
    status: 'active',
    tenantId: 1,
    createdByUsername: 'admin',
  },
  {
    username: 'receiver1',
    email: 'receiver1@stockpos.com',
    passwordHash: bcrypt.hashSync('Receiver123!', 10),
    fullName: 'Receiver One',
    role: 'RECEIVER',
    phone: '012345685',
    status: 'active',
    tenantId: 1,
    createdByUsername: 'admin',
  },
];
