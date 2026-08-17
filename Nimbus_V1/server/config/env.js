import "dotenv/config";

// ==================================================
// ENVIRONMENT CONFIGURATION
// ==================================================
// Single source of truth for all server configuration.
// Reads from .env file via dotenv, validates required
// variables, and exports a frozen object.
//
// WHY THIS EXISTS:
// Centralizes environment validation so the server
// fails fast on startup if misconfigured, rather than
// crashing mid-request when a missing variable is
// first accessed.
//
// FUTURE EXPANSION:
// Add new variables here when needed (e.g., Firebase
// credentials, database URLs). This file is the only
// place environment variables should be read.
// ==================================================

const required = ["API_ID", "API_HASH", "SESSION_ENCRYPTION_KEY"];

for (const key of required) {
  if (!process.env[key]) {
    console.error(`\n❌  Missing required environment variable: ${key}`);
    console.error(`    Copy server/.env.example to server/.env and fill in all values.\n`);
    process.exit(1);
  }
}

// Validate encryption key format (must be 64 hex chars = 32 bytes = 256 bits)
if (!/^[0-9a-fA-F]{64}$/.test(process.env.SESSION_ENCRYPTION_KEY)) {
  console.error(`\n❌  SESSION_ENCRYPTION_KEY must be exactly 64 hex characters (256 bits).`);
  console.error(`    Generate one with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"\n`);
  process.exit(1);
}

const config = Object.freeze({
  // Telegram API credentials — NEVER exposed to frontend
  apiId: parseInt(process.env.API_ID, 10),
  apiHash: process.env.API_HASH,

  // Server
  port: parseInt(process.env.PORT, 10) || 3001,
  corsOrigin: process.env.CORS_ORIGIN || "http://localhost:5173",

  // Session encryption
  encryptionKey: process.env.SESSION_ENCRYPTION_KEY,

  // Client lifecycle — idle timeout before auto-disconnect (milliseconds)
  clientIdleTimeoutMs: (parseInt(process.env.CLIENT_IDLE_TIMEOUT_MINUTES, 10) || 30) * 60 * 1000,
});

export default config;
