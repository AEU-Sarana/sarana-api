import prisma from '../client';

async function main() {
  // Example: create default admin (uncomment when User model exists and you have bcrypt)
  // import bcrypt from 'bcrypt';
  // await prisma.user.upsert({
  //   where: { username: 'admin' },
  //   update: {},
  //   create: {
  //     username: 'admin',
  //     password: await bcrypt.hash('ChangeMe123!', 10),
  //     role: 'admin',
  //   },
  // });
  console.log('Seed completed.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });