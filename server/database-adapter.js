// Database adapter — now delegates to CockroachDB via pg
// Kept for backwards compatibility with any remaining imports
module.exports = require('./db');
