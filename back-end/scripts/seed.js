#!/usr/bin/env node
/**
 * PulseMind — seed the sample unit into MongoDB.
 *
 *   node scripts/seed.js                 # seed MONGODB_URI
 *   node scripts/seed.js --rebase        # shift every instant so the newest reading is "now"
 *   node scripts/seed.js --keep          # do not wipe the collection first
 *
 * The data is `back-end/seed/patients.json`, produced deterministically by `seed/generate.js`, and
 * the insert itself is `seed/apply.js` — shared with the boot-time seeding `server.js` does for an
 * in-process MongoDB, so there is exactly one implementation of "what seeding means".
 *
 * NOTE: this CLI seeds a database that OUTLIVES the process. Against an in-process MongoDB
 * (`PULSEMIND_MEMORY_DB=1`) it will report success and then throw the database away when it exits —
 * an ephemeral database has to be seeded by the process that serves it, which is what
 * `npm run dev:seeded` does.
 */

'use strict';

require('dotenv').config();

const mongoose = require('mongoose');
const connectDB = require('../config/dbConn');
const { stopMemoryServer } = require('../config/dbConn');
const { applySeed } = require('../seed/apply');

const args = new Set(process.argv.slice(2));
const REBASE = args.has('--rebase');
const KEEP = args.has('--keep');

async function main() {
    if (!process.env.MONGODB_URI && !process.env.PULSEMIND_MEMORY_DB) {
        console.error(
            'No MONGODB_URI set. Either set one, or run `npm run dev:seeded`, which starts an ' +
                'in-process MongoDB and seeds it in the same process.'
        );
        process.exitCode = 1;
        return;
    }

    const connection = await connectDB();
    if (!connection.ok) {
        console.error(`Cannot seed: ${connection.error?.message ?? 'no database connection'}`);
        process.exitCode = 1;
        return;
    }
    console.log(connection.inMemory ? 'Seeding an in-process MongoDB.' : `Seeding ${connection.uri}`);

    if (connection.inMemory) {
        console.warn(
            'WARNING: this database is in-process and disappears when this script exits. ' +
                'Use `npm run dev:seeded` to seed and serve in one process.'
        );
    }

    const { inserted, readings, removed } = await applySeed({ rebase: REBASE, wipe: !KEEP });

    if (!KEEP) console.log(`Removed ${removed} existing patient documents.`);
    console.log(`Inserted ${inserted} patients / ${readings} readings.`);
    if (REBASE) {
        console.log('Instants were rebased so the newest reading is now. Relative spacing is unchanged.');
    }
}

main()
    .catch((err) => {
        console.error(err);
        process.exitCode = 1;
    })
    .finally(async () => {
        await mongoose.connection.close().catch(() => {});
        await stopMemoryServer().catch(() => {});
    });
