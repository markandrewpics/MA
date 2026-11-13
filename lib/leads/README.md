# Lead Desk setup

This route deliberately fails closed until private access is configured. It does not connect to GoHighLevel, contact anyone, or persist preview edits.

Required server environment names (never put values in Git):
- LEADS_SESSION_SECRET: independent random secret, at least 48 characters.
- LEADS_ACCESS_SALT: random hex salt, 16–64 bytes.
- LEADS_ACCESS_HASH: 64-byte scrypt hash of an access code at least 16 characters long.
- LEADS_FAQ_JSON: private server-only array of {category, question, answer, needsConfirmation}. Do not put staff content in this public repository.

Session cookie is signed, HttpOnly, Secure and SameSite=Strict with eight-hour expiry. Use dedicated values, never critique credentials. Rotate the session secret to revoke sessions. Login throttling is per-process only; implement durable rate limiting and individual identity/audit attribution before loading real customer records. All current live mutation endpoints refuse requests.

Before enabling a real integration: confirm authorized users and lead scope, set up a scoped server-side integration credential, verify appointment/pipeline mapping and call permission, and test not-interested/DND behavior with a noncustomer test record. DND is distinct from bot activation, automation queue state and marketing consent. Never re-enable an opt-out automatically.

Private FAQ content and real lead records must remain outside this public source repository. All data endpoints require server-side authorization. A static login shell is not itself a data-access boundary.
