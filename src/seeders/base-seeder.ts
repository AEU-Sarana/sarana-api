import prisma from '../database/client';

export abstract class BaseSeeder {
  abstract name: string;
  abstract seed(): Promise<void>;

  async run(): Promise<void> {
    console.log(`🌱 Seeding ${this.name}...`);
    try {
      await this.seed();
      console.log(`✅ ${this.name} seeded successfully\n`);
    } catch (error) {
      console.error(`❌ Error seeding ${this.name}:`, error);
      throw error;
    }
  }

  protected async clearTable(tableName: string): Promise<void> {
    try {
      await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tableName} RESTART IDENTITY CASCADE`);
    } catch (error) {
      console.warn(`⚠️  Could not clear table ${tableName}:`, error);
    }
  }
}