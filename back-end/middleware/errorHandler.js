const { logEvents } = require('./logEvents');

/**
 * The last resort. It answers JSON with a readable message and never the stack trace: the stack goes
 * to the log, where an operator can read it, and the client gets a status it can branch on.
 *
 * The frontend transport branches on `res.status` before it reads any body, so a `500` here surfaces
 * as its named `UPSTREAM_ERROR` state rather than as an anonymous exception on a triage screen.
 */
const errorHandler = (err, req, res, next) => {
    logEvents(`${err.name}: ${err.message}`, 'errLog.txt');
    console.error(err.stack);

    if (res.headersSent) return next(err);

    res.status(err.status || 500).json({
        message: err.message || 'Internal server error'
    });
};

module.exports = errorHandler;
