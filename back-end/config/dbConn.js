const mongoose = require('mongoose');

/**
 * Connect to MongoDB and REPORT THE OUTCOME to the caller.
 *
 * The previous version swallowed every failure into a `console.error` and returned `undefined`,
 * which mattered because `server.js` only called `app.listen` inside
 * `mongoose.connection.once('open', …)`. With no reachable database the process therefore started,
 * logged, bound no port, and never exited — the client saw a refused connection and had no way to
 * tell that from "the service is not installed". That is step 2 of "The order of failure" in
 * `docs/spec/data-contract.md` section 4.1.
 *
 * Two things changed:
 *   1. The result is returned (`{ ok, uri, inMemory, error }`) instead of being logged and dropped,
 *      so the caller can decide what to do.
 *   2. `server.js` now listens unconditionally, so a database outage produces a server that answers
 *      `503` with a named reason instead of a socket that refuses to connect.
 *
 * When `MONGODB_URI` is unset and `PULSEMIND_MEMORY_DB` is truthy, an in-process MongoDB is started
 * through `mongodb-memory-server`. That is what makes `npm run dev:seeded` work on a machine with no
 * MongoDB installed and no Docker.
 */

let memoryServer = null;

async function resolveUri() {
    if (process.env.MONGODB_URI) {
        return { uri: process.env.MONGODB_URI, inMemory: false };
    }

    if (!process.env.PULSEMIND_MEMORY_DB) {
        return { uri: null, inMemory: false };
    }

    // Required lazily: it is a devDependency, and a production deployment that supplies
    // MONGODB_URI must not need it installed at all.
    const { MongoMemoryServer } = require('mongodb-memory-server');
    memoryServer = await MongoMemoryServer.create({ instance: { dbName: 'pulsemind' } });
    return { uri: memoryServer.getUri(), inMemory: true };
}

const connectDB = async () => {
    const { uri, inMemory } = await resolveUri();

    if (!uri) {
        return {
            ok: false,
            uri: null,
            inMemory: false,
            error: new Error(
                'No MongoDB connection string. Set MONGODB_URI, or set PULSEMIND_MEMORY_DB=1 to run ' +
                    'an in-process MongoDB (see back-end/README.md).'
            )
        };
    }

    try {
        await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });
        return { ok: true, uri, inMemory, error: null };
    } catch (err) {
        return { ok: false, uri, inMemory, error: err };
    }
};

/** Shut the in-process MongoDB down, if one was started. Used by the seed script. */
const stopMemoryServer = async () => {
    if (memoryServer) {
        await memoryServer.stop();
        memoryServer = null;
    }
};

module.exports = connectDB;
module.exports.connectDB = connectDB;
module.exports.stopMemoryServer = stopMemoryServer;
