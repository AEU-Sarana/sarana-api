import bcrypt from 'bcrypt';

export interface UserSeedData {
  username: string;
  email?: string;
  passwordHash: string;
  pinHash?: string;
  fullName: string;
  role: 'ADMIN' | 'SELLER' | 'SUPER_ADMIN';
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
    username: 'super-admin',
    email: 'superadmin@stockpos.com',
    passwordHash: bcrypt.hashSync('Admin123!', 10),
    fullName: 'Super Administrator',
    role: 'SUPER_ADMIN',
    phone: '0123456710',
    status: 'active',
    tenantId: 0, // Platform level
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
    username: 'seller1',
    email: 'seller1@stockpos.com',
    passwordHash: bcrypt.hashSync('Seller123!', 10),
    fullName: 'Seller One',
    role: 'SELLER',
    phone: '012345679',
    status: 'active',
    tenantId: 1,
    createdByUsername: 'admin',
  },
  {
    username: 'seller2',
    email: 'seller2@stockpos.com',
    passwordHash: bcrypt.hashSync('Seller123!', 10),
    fullName: 'Seller Two',
    role: 'SELLER',
    phone: '012345680',
    status: 'active',
    tenantId: 1,
    createdByUsername: 'admin',
  },
  {
    username: 'seller3',
    email: 'seller3@stockpos.com',
    passwordHash: bcrypt.hashSync('Seller123!', 10),
    fullName: 'Seller Three',
    role: 'SELLER',
    phone: '012345681',
    status: 'active',
    tenantId: 1,
    createdByUsername: 'admin',
  },
  {
    username: 'seller4',
    email: 'seller4@stockpos.com',
    passwordHash: bcrypt.hashSync('Seller123!', 10),
    fullName: 'Seller Four',
    role: 'SELLER',
    phone: '012345682',
    status: 'active',
    tenantId: 2,
    createdByUsername: 'super-admin',
  },
  {
    username: 'seller5',
    email: 'seller5@stockpos.com',
    passwordHash: bcrypt.hashSync('Seller123!', 10),
    fullName: 'Seller Five',
    role: 'SELLER',
    phone: '012345683',
    status: 'active',
    tenantId: 2,
    createdByUsername: 'super-admin',
  },
  {
    username: 'seller6',
    email: 'seller6@stockpos.com',
    passwordHash: bcrypt.hashSync('Seller123!', 10),
    fullName: 'Seller Six',
    role: 'SELLER',
    phone: '012345684',
    status: 'active',
    tenantId: 2,
    createdByUsername: 'super-admin',
  },
];
