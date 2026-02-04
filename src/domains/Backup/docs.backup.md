ឯកសារណែនាំអំពីប្រតិបត្តិការ Backup (Backup Operations Guide – Khmer Version)

ទិដ្ឋភាពទូទៅ (Overview) ឯកសារនេះពន្យល់អំពី របៀប Backup ទិន្នន័យ ក្នុង Stock POS System រួមមាន៖ ដំណើរការ Backup របៀបប្រើ កន្លែងផ្ទុកទិន្នន័យ Backup សម្រាប់ទាំង Server និង Device (Mobile App) 🎯 គោលបំណង ការពារការបាត់បង់ទិន្នន័យ (Sales / Orders / Stock) អាចស្ដារទិន្នន័យវិញ បើ Device ឬ Server មានបញ្ហា អនុញ្ញាតឲ្យ Admin គ្រប់គ្រង Backup / Restore បានដោយខ្លួនឯង
ប្រភេទ Backup 2.1 Backup Database នៅលើ Server (PostgreSQL) ទិន្នន័យដែល Backup Users Products Stock Orders Shifts Reports Settings 🔹 ប្រភព Backup Backup ស្វ័យប្រវត្តិ (Auto Backup) Backup ដោយ Admin (Manual Backup)
🔹 ការស្ដារទិន្នន័យ (Recovery) Restore ពី Backup ចុងក្រោយ Restore ពី Backup ដែល Admin ជ្រើស Point-in-Time Recovery (បើ Infrastructure គាំទ្រ) 2.2 Backup Local Database នៅលើ Device (SQLite – Flutter App) ទិន្នន័យដែល Backup Local cached data Orders ដែលធ្វើ Offline Draft / Pending Orders 🔹 ពេលធ្វើ Backup មុនពេលធ្វើ Operation សំខាន់ៗ Backup ជារៀងរាល់ពេល (Config បាន) Backup ដោយ User (បើបើក Feature)

🔹 ការស្ដារវិញ Restore Database ពី Backup ដែលបាន Encrypt Orders ដែលមិនទាន់ Sync នៅតែមាន

ដំណើរការ Backup (Server) 3.1 Auto Backup (ស្វ័យប្រវត្តិ) Scheduler / Cron ដំណើរការ (Default: រាល់ថ្ងៃ) Server Dump Database Encrypt Backup File Upload ទៅ Object Storage រក្សាទុក Metadata (backup_id, file_path, created_at) អនុវត្ត Retention Policy (លុប Backup ចាស់ៗ) 3.2 Manual Backup (Admin) Admin ហៅ API POST /api/v1/backup/create Server Dump + Encrypt + Upload API បញ្ជូនព័ត៌មាន Backup ត្រឡប់វិញ 3.3 Restore Backup (Admin) Admin ហៅ POST /api/v1/backup/restore Server ពិនិត្យ Backup File Restore Database System អាចចូល Maintenance Mode បណ្ដោះអាសន្ន
ដំណើរការ Backup (Device) Device Backup Local DB មុន Operation សំខាន់ Encrypt Backup File រក្សាទុកក្នុង Storage របស់ App បើ App Crash → Restore ពី Backup ចុងក្រោយ Pending Orders នៅតែ Queue សម្រាប់ Sync
កន្លែងផ្ទុក Backup 5.1 Backup នៅលើ Server Object Storage (S3 Compatible) Development: MinIO Production: Cloudflare R2 📂 Example Path: stock-pos-storage/backups/
5.2 Backup នៅលើ Device Android Local Storage SQLite Backup ដែល Encrypt រក្សាទុកក្នុង App Private Storage User មិនអាច Access ដោយផ្ទាល់បាន

API សម្រាប់ Admin Base Path: /api/v1/backup Method Endpoint Description POST /create បង្កើត Backup GET /list បង្ហាញ Backup ទាំងអស់ POST /restore Restore Backup GET /export Export Data

Settings & Policy ⚙️ Server Settings auto_backup : បើក / បិទ Auto Backup backup_frequency : daily / weekly / monthly

🧹 Retention Policy រក្សាទុក Backup ចុងក្រោយ ត្រូវមាន Backup មួយយ៉ាងហោចណាស់ជានិច្ច 🔐 Security Backup ទាំងអស់ត្រូវ Encrypt អនុញ្ញាតតែ Admin Encryption Key ត្រូវរក្សាទុកសុវត្ថិភាព 8) Checklist ប្រតិបត្តិការ 🗓️ រាល់ថ្ងៃ ពិនិត្យថា Backup បានជោគជ័យ ពិនិត្យ Storage Usage

🗓️ រាល់សប្តាហ៍ Test Restore នៅ Staging ពិនិត្យ Retention Cleanup

🗓️ រាល់ខែ ពិនិត្យ Backup Policy Rotate Encryption Key (បើចាំបាច់) 9) ការដោះស្រាយបញ្ហា (Failure Handling) Backup Fail → Log + Alert (Telegram) Restore Fail → Abort + Error Code Upload Fail → Retry (Backoff Strategy)

