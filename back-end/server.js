require('dotenv').config();
const express = require('express');
const app = express();
const path = require('path');
const cors = require('cors');
const corsOptions = require('./config/corsOptions');
const { logger } = require('./middleware/logEvents');
const errorHandler = require('./middleware/errorHandler');
// const verifyJWT = require('./middleware/verifyJWT');   // G-45 — auth is out of scope until answered
const cookieParser = require('cookie-parser');
const credentials = require('./middleware/credentials');
const mongoose = require('mongoose');
const connectDB = require('./config/dbConn');
const PORT = process.env.PORT || 3500;

mongoose.set('strictQuery', false);

// custom middleware logger
app.use(logger);

// Handle options credentials check - before CORS!
// and fetch cookies credentials requirement
app.use(credentials);

// Cross Origin Resource Sharing
app.use(cors(corsOptions));

// built-in middleware to handle urlencoded form data
app.use(express.urlencoded({ extended: false }));

// built-in middleware for json
app.use(express.json());

//middleware for cookies
app.use(cookieParser());

//serve static files
app.use('/', express.static(path.join(__dirname, '/public')));

/**
 * Liveness + readiness in one place, and it answers whether or not MongoDB is up.
 *
 * This exists because the previous boot sequence made "the service is not installed", "the service
 * crashed at module load" and "the database is unreachable" all present to a client as the same
 * refused connection. They are different operational facts and an operator should not have to guess
 * between them.
 */
app.get('/health', (req, res) => {
    const state = mongoose.connection.readyState; // 0 disconnected · 1 connected · 2 connecting · 3 disconnecting
    res.status(state === 1 ? 200 : 503).json({
        service: 'pulsemind-backend',
        listening: true,
        database: ['disconnected', 'connected', 'connecting', 'disconnecting'][state] ?? 'unknown'
    });
});

/**
 * DATABASE READINESS GUARD.
 *
 * `app.listen` now runs unconditionally (see the bottom of this file), which is the fix for step 2
 * of "The order of failure" in `docs/spec/data-contract.md` section 4.1 — previously the only
 * `listen` call sat inside `mongoose.connection.once('open', …)`, so a missing database produced a
 * process that started, bound nothing, and never exited.
 *
 * Listening unconditionally is only an improvement if the answer is honest: without this guard the
 * handlers would sit on a Mongoose buffering timeout and eventually fail with a driver message. So a
 * request that arrives before the database is up gets an explicit `503` naming the reason, which the
 * frontend renders as its named `UPSTREAM_ERROR` state (`U-04`) rather than as an anonymous hang.
 */
app.use('/patient', (req, res, next) => {
    if (mongoose.connection.readyState === 1) return next();
    return res.status(503).json({
        message:
            'The assessment service is running but its database is not connected. ' +
            'Set MONGODB_URI, or start the service with `npm run dev:seeded` to use an in-process MongoDB.'
    });
});

/**
 * SAME READINESS GUARD FOR /auth. Every auth route reads or writes a user document, so without this
 * a sign-in attempt against a disconnected database would sit on a Mongoose buffering timeout and
 * then fail with a driver message — a login form that hangs, which is the least diagnosable failure
 * a user can be given.
 *
 * `/auth/session` is the one exception and answers unauthenticated instead of erroring: the SPA
 * calls it on every boot to decide whether to show the board or the login screen, and a 503 there
 * would replace a working fixture board with an error page over a question it can answer without
 * the database.
 */
app.use('/auth', (req, res, next) => {
    if (mongoose.connection.readyState === 1) return next();
    if (req.method === 'GET' && req.path === '/session') {
        return res.json({ authenticated: false, user: null, database: 'disconnected' });
    }
    return res.status(503).json({
        code: 'SERVICE_UNAVAILABLE',
        message:
            'The sign-in service is running but its database is not connected. ' +
            'Start the service with `npm run dev:seeded`.'
    });
});

// routes
// app.use('/', require('./routes/root'));            // the tutorial's five auth routes stay
// app.use('/register', require('./routes/register'));  //   unmounted: they require a `model/User`
// app.use('/auth', require('./routes/auth'));          //   that was never committed and would throw
// app.use('/refresh', require('./routes/refresh'));    //   at load. Registered as G-45; the real
// app.use('/logout', require('./routes/logout'));      //   /auth surface is the line below.
app.use('/auth', require('./routes/pulsemindAuth'));

/**
 * `verifyJWT` — the tutorial's — stays off. The clinical read model is deliberately still open, and
 * gating it is an authorisation decision the handoff does not make (**G-46**). The frontend's own
 * `PUBLIC_PULSEMIND_REQUIRE_AUTH` decides whether a user must sign in to reach the board; this
 * service's answer to that question belongs in the same register row, not in a quiet middleware.
 */
// app.use(verifyJWT);
app.use('/patient', require('./routes/api/patient'));

app.all('*', (req, res) => {
    res.status(404);
    if (req.accepts('html')) {
        res.sendFile(path.join(__dirname, 'views', '404.html'));
    } else if (req.accepts('json')) {
        res.json({ error: '404 Not Found' });
    } else {
        res.type('txt').send('404 Not Found');
    }
});

app.use(errorHandler);

/**
 * BOOT.
 *
 * The port binds first and the database connects second, so an operator always has something to talk
 * to. The connection outcome is reported rather than swallowed — `config/dbConn.js` returns it now
 * instead of logging it into the void.
 */
const server = app.listen(PORT, () => {
    console.log(`PulseMind backend listening on port ${PORT}`);
});

connectDB()
    .then(async (result) => {
        if (result.ok) {
            console.log(
                result.inMemory
                    ? 'Connected to an in-process MongoDB (PULSEMIND_MEMORY_DB). Data is not persisted.'
                    : 'Connected to MongoDB'
            );

            /**
             * Boot-time seeding, and the ONLY way an in-process MongoDB can ever hold data: an
             * ephemeral database dies with the process that created it, so the seed and the server
             * have to be the same process. `npm run dev:seeded` sets both variables.
             *
             * Against a real MongoDB this does nothing unless the collection is empty, so it can
             * never overwrite a populated deployment by accident. `PULSEMIND_SEED_FORCE=1` opts in
             * to re-seeding a non-empty database explicitly.
             */
            if (process.env.PULSEMIND_SEED_ON_BOOT) {
                const { applySeed, isEmpty } = require('./seed/apply');
                const force = Boolean(process.env.PULSEMIND_SEED_FORCE);
                if (force || (await isEmpty())) {
                    const seeded = await applySeed({ rebase: true, wipe: true });
                    console.log(
                        `Seeded ${seeded.inserted} patients / ${seeded.readings} readings ` +
                            '(instants rebased so the newest reading is now; relative spacing unchanged).'
                    );
                } else {
                    console.log('Database is not empty; skipping the seed. Set PULSEMIND_SEED_FORCE=1 to re-seed.');
                }

                /**
                 * Demo ACCOUNTS, seeded on the same switch and with the same "only when empty"
                 * rule. Without them the sign-in screen is a wall: an in-process MongoDB starts
                 * with no users, so there would be nothing to sign in as.
                 */
                const { applyUserSeed, demoSummary } = require('./seed/users');
                const users = await applyUserSeed({ force });
                const demo = demoSummary();
                if (users.skipped) {
                    console.log(`All ${users.existing} demo accounts already present.`);
                } else {
                    console.log(
                        `Seeded ${users.created} demo account(s): ${users.usernames.join(', ')} — password ${demo.password}`
                    );
                }
                console.log(`  Sign in as: ${demo.accounts.join(', ')} (password ${demo.password})`);
                console.log(
                    `  ${demo.totp_accounts.join(' and ')} also need a 6-digit code: npm run demo:code`
                );
            }
        } else {
            console.error(`MongoDB not connected: ${result.error?.message ?? 'unknown error'}`);
            console.error('The server is listening; /patient requests will answer 503 until it is.');
        }
    })
    .catch((err) => {
        console.error(`MongoDB connection failed: ${err.message}`);
    });

process.on('SIGINT', () => {
    server.close(() => process.exit(0));
});

module.exports = app;
