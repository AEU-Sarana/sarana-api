const { PrismaClient } = require('./src/database/generated');
const prisma = new PrismaClient();
async function main() {
  try {
    const res = await prisma.subscription.update({
      where: { id: 4 },
      data: {
        status: 'CANCELLED',
        closeReason: 'Test reason',
        effectiveCloseDate: new Date()
      }
    });
    console.log("Success:", res);
  } catch (e) {
    console.error("Error Name:", e.name);
    console.error("Error Message:", e.message);
  } finally {
    await prisma.$disconnect();
  }
}
main();
