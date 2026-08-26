/**
 * back-end/model/User.js
 *
 * THIS FILE DID NOT EXIST. Five controllers in this repository — `authController`,
 * `registerController`, `refreshTokenController`, `logoutController`, `usersController` — all open
 * with `require('../model/User')`, and the module was never committed. Requiring any of them throws
 * `MODULE_NOT_FOUND` at load, which is why every auth route in `server.js` was commented out: the
 * process could not boot with them mounted. That is the same defect class as **G-44**, and it is the
 * real reason behind **G-45**, which had been recorded as a scope decision.
 *
 * So this is a new model written for PulseMind rather than a restoration of the tutorial's. The
 * tutorial's shape (`roles` as an object of numeric codes, a single `refreshToken` string) does not
 * fit a clinical sign-in with two factors and passkeys, and guessing at it would have produced a
 * model that satisfies the old controllers and nothing else. The old controllers stay untouched and
 * unmounted; `controllers/pulsemindAuthController.js` is what serves `/auth`.
 *
 * WHAT IS DELIBERATELY NOT HERE: any patient association. A user is a person who may sign in. Which
 * patients they may see is an authorisation question the handoff never answers (**G-46**), and
 * inventing a mapping here would put a made-up access rule in the database.
 */
const mongoose = require('mongoose');

const Schema = mongoose.Schema;

/**
 * One registered authenticator. `credential_id` and `public_key` are base64url TEXT, not Buffers:
 * they round-trip through JSON, through the seed, and through a Mongo export without a codec, and
 * every WebAuthn library on both sides speaks base64url already.
 */
const passkeySchema = new Schema(
    {
        credential_id: { type: String, required: true },
        public_key: { type: String, required: true },
        /**
         * The authenticator's own signature counter. A LOWER value than the one stored is the
         * standard cloned-authenticator signal. Many modern passkeys (iCloud Keychain, most
         * platform authenticators) always report 0 — that is not a clone, it is a device that does
         * not count, and the check has to allow it. See `pulsemindAuthController.js`.
         */
        counter: { type: Number, required: true, default: 0 },
        transports: { type: [String], default: [] },
        device_type: { type: String, default: null },
        backed_up: { type: Boolean, default: false },
        /** User-facing name so a clinician can tell two keys apart before revoking one. */
        label: { type: String, default: 'Passkey' },
        created_at: { type: Date, default: Date.now },
        last_used_at: { type: Date, default: null }
    },
    { _id: true }
);

const userSchema = new Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },
    display_name: { type: String, default: null },

    /**
     * bcrypt. NEVER a plain or reversibly-encoded password, and never a field named `password` —
     * the name is part of the guard, because `password_hash` reads wrong in any log line or
     * `JSON.stringify` that should not have it.
     */
    password_hash: { type: String, required: true },

    /**
     * `clinician` may mark a reading reviewed; `read_only` may not. That distinction is HARNESS —
     * the handoff describes no roles at all (**G-46**) — and it is stored rather than inferred so
     * the open question has somewhere to land when it is answered.
     */
    role: { type: String, enum: ['clinician', 'read_only'], default: 'clinician' },

    totp: {
        /** RFC 4648 base32, no padding. Present only once enrolment has been CONFIRMED. */
        secret_base32: { type: String, default: null },
        /** Set at the same moment as the secret. `secret && !enrolled_at` is not a valid state. */
        enrolled_at: { type: Date, default: null },
        /**
         * The last accepted time step. A TOTP code stays valid for its whole window, so without
         * this a code observed over someone's shoulder is replayable for up to 90 seconds. Storing
         * the step makes each code single-use.
         */
        last_used_step: { type: Number, default: null },
        /** Enrolment in progress: generated, shown to the user, not yet proven by a code. */
        pending_secret_base32: { type: String, default: null },
        pending_started_at: { type: Date, default: null }
    },

    /**
     * When this clinician last confirmed they had read the usage guide, or `null` if never.
     *
     * ON THE USER, not in `localStorage`, and that is the whole point. A ward workstation is shared:
     * marked per browser, the second clinician to use that machine would never be shown the guide,
     * and the same clinician moving to another terminal would be shown it again. Neither is what
     * "first sign-in" means.
     *
     * A TIMESTAMP rather than a boolean, so a revised guide can be re-shown by comparing against its
     * revision date instead of resetting a flag nobody can date.
     */
    guide_ack_at: { type: Date, default: null },

    passkeys: { type: [passkeySchema], default: [] },

    /**
     * The current WebAuthn challenge and its deadline. One slot, not a list: a user has one
     * ceremony in flight at a time, and keeping a list would mean an old challenge stays acceptable
     * after a newer one was issued.
     */
    webauthn_challenge: { type: String, default: null },
    webauthn_challenge_expires_at: { type: Date, default: null },

    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now }
});

userSchema.methods.toPublicJSON = function toPublicJSON() {
    return {
        username: this.username,
        display_name: this.display_name,
        role: this.role,
        totp_enrolled: Boolean(this.totp && this.totp.secret_base32),
        guide_ack_at: this.guide_ack_at,
        passkeys: (this.passkeys || []).map((k) => ({
            id: String(k._id),
            label: k.label,
            created_at: k.created_at,
            last_used_at: k.last_used_at,
            backed_up: k.backed_up,
            transports: k.transports
        }))
    };
};

module.exports = mongoose.model('User', userSchema);
