import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import config from "./config/env.js";

// ==================================================
// ENCRYPTED SESSION STORAGE
// ==================================================
// Persists Telegram StringSession data to disk using
// AES-256-GCM encryption. Each session is stored as
// a single file inside server/storage/sessions/.
//
// WHY ENCRYPTION:
// Telegram session strings grant full account access.
// Even if an attacker gains file system access, they
// cannot use the sessions without the encryption key.
//
// WHY FILE-BASED:
// Version 1 avoids database dependencies. The storage
// interface (save/load/remove/exists) is designed so
// switching to Firebase or any database later requires
// changing ONLY this file — no other module depends
// on the file system directly.
//
// ENCRYPTION DETAILS:
// - Algorithm: AES-256-GCM (authenticated encryption)
// - Key: 256-bit from SESSION_ENCRYPTION_KEY env var
// - Each file stores: IV (16 bytes) + AuthTag (16 bytes) + Ciphertext
// - A unique IV is generated per save operation
// ==================================================

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SESSIONS_DIR = path.join(__dirname, "storage", "sessions");

// Ensure the sessions directory exists on module load
if (!fs.existsSync(SESSIONS_DIR)) {
  fs.mkdirSync(SESSIONS_DIR, { recursive: true });
}

// Derive the encryption key buffer once at startup
const ENCRYPTION_KEY = Buffer.from(config.encryptionKey, "hex");

// ==================================================
// ENCRYPTION UTILITIES
// ==================================================

function encrypt(plaintext) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final(),
  ]);

  const authTag = cipher.getAuthTag();

  // Pack as: IV (16) + AuthTag (16) + Ciphertext (variable)
  return Buffer.concat([iv, authTag, encrypted]);
}

function decrypt(packed) {
  const iv = packed.subarray(0, 16);
  const authTag = packed.subarray(16, 32);
  const ciphertext = packed.subarray(32);

  const decipher = crypto.createDecipheriv("aes-256-gcm", ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);

  return Buffer.concat([
    decipher.update(ciphertext),
    decipher.final(),
  ]).toString("utf8");
}

// ==================================================
// SESSION FILE OPERATIONS
// ==================================================

function sessionPath(sessionToken) {
  // Sanitize token to prevent path traversal
  const safe = sessionToken.replace(/[^a-f0-9]/gi, "");
  return path.join(SESSIONS_DIR, `${safe}.session`);
}

/**
 * Save an encrypted Telegram session string to disk.
 * @param {string} sessionToken — The opaque session token (hex string)
 * @param {string} sessionString — The raw GramJS StringSession value
 */
export function saveSession(sessionToken, sessionString) {
  const encrypted = encrypt(sessionString);
  fs.writeFileSync(sessionPath(sessionToken), encrypted);
}

/**
 * Load and decrypt a Telegram session string from disk.
 * @param {string} sessionToken
 * @returns {string|null} — The decrypted session string, or null if not found
 */
export function loadSession(sessionToken) {
  const filePath = sessionPath(sessionToken);
  if (!fs.existsSync(filePath)) return null;

  try {
    const packed = fs.readFileSync(filePath);
    return decrypt(packed);
  } catch (err) {
    // Corrupted or tampered file — treat as missing
    console.error(`⚠️  Failed to decrypt session ${sessionToken}:`, err.message);
    return null;
  }
}

/**
 * Remove a session file from disk.
 * @param {string} sessionToken
 */
export function removeSession(sessionToken) {
  const filePath = sessionPath(sessionToken);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
}

/**
 * Check whether a saved session exists for the given token.
 * @param {string} sessionToken
 * @returns {boolean}
 */
export function sessionExists(sessionToken) {
  return fs.existsSync(sessionPath(sessionToken));
}
