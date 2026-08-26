/**
 * back-end/scripts/seed-users.js
 *
 * Creates the demo accounts against whatever MongoDB `MONGODB_URI` names. Use this against a real
 * database; the in-process one seeds itself at boot (`npm run dev:seeded`) because an ephemeral
 * database and the process that seeds it have to be the same process.
 *
 *   node scripts/seed-users.js            create only if no accounts exist
 *   node scripts/seed-users.js --force    delete every account and recreate them
 */
require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/dbConn');
const { applyUserSeed, demoSummary } = require('../seed/users');

(async () => {
    const result = await connectDB();
    if (!result.ok) {
        console.error(`MongoDB not connected: ${result.error?.message ?? 'unknown error'}`);
        process.exit(1);
    }

    const force = process.argv.includes('--force');
    try {
        const users = await applyUserSeed({ force });
        if (users.skipped) {
            console.log('Accounts already exist. Pass --force to replace them.');
        } else {
            const demo = demoSummary();
            console.log(`Created ${users.created} accounts: ${demo.accounts.join(', ')}`);
            console.log(`  password        ${demo.password}`);
            console.log(`  TOTP account    ${demo.totp_account}`);
            console.log(`  TOTP secret     ${demo.totp_secret_base32}`);
            console.log(`  otpauth URI     ${demo.otpauth_uri}`);
        }
    } catch (err) {
        console.error(err.message);
        process.exitCode = 1;
    }

    await mongoose.connection.close();
})();
