"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = __importDefault(require("../client"));
async function main() {
    // Example: create default admin (uncomment when User model exists and you have bcrypt)
    // import bcrypt from 'bcryptjs';
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
    await client_1.default.$disconnect();
});
//# sourceMappingURL=seed.js.map