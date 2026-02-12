import bcrypt from 'bcrypt';

export interface UserSeedData {
  username: string;
  email?: string;
  passwordHash: string;
  pinHash?: string;
  fullName: string;
  role: 'ADMIN' | 'SELLER';
  phone?: string;
  status: 'active' | 'inactive';
  deviceId?: string;
  isDeviceBound?: boolean;
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
  },
  {
    username: 'seller1',
    email: 'seller1@stockpos.com',
    passwordHash: bcrypt.hashSync('Seller123!', 10),
    fullName: 'Seller One',
    role: 'SELLER',
    phone: '012345679',
    status: 'active',
  },
  {
    username: 'seller2',
    email: 'seller2@stockpos.com',
    passwordHash: bcrypt.hashSync('Seller123!', 10),
    fullName: 'Seller Two',
    role: 'SELLER',
    phone: '012345680',
    status: 'active',
  },
  {
    username: 'seller3',
    email: 'seller3@stockpos.com',
    passwordHash: bcrypt.hashSync('Seller123!', 10),
    fullName: 'Seller Three',
    role: 'SELLER',
    phone: '012345681',
    status: 'active',
  },
];