"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppSettingsSeeder = void 0;
const base_seeder_1 = require("../../base-seeder");
const client_1 = __importDefault(require("../../../database/client"));
const seeder_helper_1 = require("../utils/seeder-helper");
class AppSettingsSeeder extends base_seeder_1.BaseSeeder {
    constructor() {
        super(...arguments);
        this.name = 'App Settings';
    }
    async seed() {
        const adminUserId = await seeder_helper_1.SeederHelper.getAdminUserId();
        // Check if settings already exist
        const existingSettings = await client_1.default.appSetting.findFirst();
        if (existingSettings) {
            await client_1.default.appSetting.update({
                where: { settingId: existingSettings.settingId },
                data: {
                    autoBackup: true,
                    backupFrequency: 'daily',
                    stockSyncPolicy: 'allow_with_cached',
                    updatedBy: adminUserId,
                },
            });
            console.log('   Updated existing app settings');
        }
        else {
            await client_1.default.appSetting.create({
                data: {
                    autoBackup: true,
                    backupFrequency: 'daily',
                    stockSyncPolicy: 'allow_with_cached',
                    updatedBy: adminUserId,
                },
            });
            console.log('   Created app settings');
        }
    }
}
exports.AppSettingsSeeder = AppSettingsSeeder;
//# sourceMappingURL=app-settings.seeder.js.map