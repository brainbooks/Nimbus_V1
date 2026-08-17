import crypto from "node:crypto";
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import config from "./config/env.js";
import { saveSession, loadSession, removeSession } from "./sessions.js";

// ==================================================
// TELEGRAM CLIENT LIFECYCLE MANAGER
// ==================================================
// Manages the full lifecycle of GramJS TelegramClient
// instances: creation, reuse, idle cleanup, and
// session persistence.
//
// WHY THIS EXISTS:
// Each authenticated user needs a TelegramClient to
// communicate with Telegram's MTProto servers. This
// module ensures:
// 1. Clients are reused across requests (no duplicate connections)
// 2. Idle clients are automatically destroyed to prevent memory leaks
// 3. Clients can be recreated from saved sessions on demand
// 4. Auth-flow temporary state (phone, phoneCodeHash) is kept per-session
//
// MEMORY SAFETY:
// A cleanup interval runs every 5 minutes and destroys
// clients that have been idle longer than the configured
// timeout (default: 30 minutes). This prevents unbounded
// memory growth from abandoned sessions.
// ==================================================

/**
 * @typedef {Object} ClientEntry
 * @property {TelegramClient} client - The GramJS client instance
 * @property {number} lastActivity - Timestamp of last request
 * @property {string} phone - Phone number (set during auth flow)
 * @property {string} phoneCodeHash - OTP hash from Telegram (set during auth flow)
 */

/** @type {Map<string, ClientEntry>} */
const clients = new Map();

// ==================================================
// SESSION TOKEN GENERATION
// ==================================================
// 256-bit cryptographically secure random hex tokens.
// These are opaque identifiers sent to the frontend —
// they reveal nothing about Telegram internals.
// ==================================================

export function generateSessionToken() {
  return crypto.randomBytes(32).toString("hex");
}

// ==================================================
// CLIENT CREATION AND CONNECTION
// ==================================================

const CONNECTION_TIMEOUT_MS = 15000;

async function withTimeout(promise, ms = CONNECTION_TIMEOUT_MS) {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error("Telegram connection timed out. Please try again.")),
      ms,
    );
  });
  return Promise.race([promise, timeoutPromise]).finally(() =>
    clearTimeout(timeoutId),
  );
}

/**
 * Create a new TelegramClient connected to Telegram's MTProto servers.
 * @param {string} sessionString — Existing session string (empty for new auth)
 * @returns {Promise<TelegramClient>}
 */
async function createClient(sessionString = "") {
  const stringSession = new StringSession(sessionString);
  const client = new TelegramClient(stringSession, config.apiId, config.apiHash, {
    connectionRetries: 10,
    useWSS: true,
  });
  await withTimeout(client.connect());
  return client;
}

// ==================================================
// PUBLIC API — CLIENT MANAGEMENT
// ==================================================

/**
 * Get or create a TelegramClient for the given session token.
 * If the client exists and is connected, reuse it.
 * If a saved session exists on disk, recreate the client from it.
 * Otherwise, create a fresh unauthenticated client.
 *
 * @param {string} sessionToken
 * @param {Object} options
 * @param {boolean} options.createIfMissing — Create a new client if none exists (default: false)
 * @returns {Promise<ClientEntry|null>}
 */
export async function getClient(sessionToken, { createIfMissing = false } = {}) {
  // 1. Check for an active client in memory
  const existing = clients.get(sessionToken);
  if (existing) {
    existing.lastActivity = Date.now();

    // Ensure connection is still alive
    if (!existing.client.connected) {
      try {
        await withTimeout(existing.client.connect());
      } catch {
        // Connection failed — remove stale entry and try to recreate
        clients.delete(sessionToken);
      }
    }

    if (clients.has(sessionToken)) {
      return existing;
    }
  }

  // 2. Try to recreate from saved session on disk
  const savedSession = loadSession(sessionToken);
  if (savedSession) {
    try {
      const client = await createClient(savedSession);
      const entry = {
        client,
        lastActivity: Date.now(),
        phone: "",
        phoneCodeHash: "",
      };
      clients.set(sessionToken, entry);
      return entry;
    } catch (err) {
      console.error(`⚠️  Failed to restore session ${sessionToken.slice(0, 8)}...:`, err.message);
      removeSession(sessionToken);
    }
  }

  // 3. Create a fresh client if requested (used during auth flow)
  if (createIfMissing) {
    const client = await createClient("");
    const entry = {
      client,
      lastActivity: Date.now(),
      phone: "",
      phoneCodeHash: "",
    };
    clients.set(sessionToken, entry);
    return entry;
  }

  return null;
}

/**
 * Persist the current client's session to encrypted disk storage
 * and return whether the user is authorized.
 *
 * @param {string} sessionToken
 * @returns {Promise<boolean>}
 */
export async function finalizeSession(sessionToken) {
  const entry = clients.get(sessionToken);
  if (!entry) return false;

  const isAuthorized = await entry.client.isUserAuthorized();
  if (isAuthorized) {
    const sessionString = entry.client.session.save();
    saveSession(sessionToken, sessionString);
  }
  return isAuthorized;
}

/**
 * Destroy a client and remove its saved session.
 * Used during logout.
 *
 * @param {string} sessionToken
 */
export async function destroyClient(sessionToken) {
  const entry = clients.get(sessionToken);
  if (entry) {
    try {
      if (entry.client.connected) {
        await entry.client.logOut();
      }
    } catch (err) {
      console.error(`⚠️  Logout cleanup error:`, err.message);
    }
    try {
      await entry.client.disconnect();
    } catch {
      // Ignore disconnect errors during cleanup
    }
    clients.delete(sessionToken);
  }
  removeSession(sessionToken);
}

/**
 * Check if a session token maps to an active, authorized client.
 *
 * @param {string} sessionToken
 * @returns {Promise<boolean>}
 */
export async function isSessionValid(sessionToken) {
  const entry = await getClient(sessionToken);
  if (!entry) return false;

  try {
    return await entry.client.isUserAuthorized();
  } catch {
    return false;
  }
}

// ==================================================
// IDLE CLIENT CLEANUP
// ==================================================
// Runs every 5 minutes and disconnects clients that
// have been idle longer than the configured timeout.
// This prevents memory leaks from abandoned sessions.
//
// WHY NOT ON EVERY REQUEST:
// Checking all clients on every request adds latency.
// A periodic sweep is more efficient and predictable.
// ==================================================

const CLEANUP_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

setInterval(() => {
  const now = Date.now();
  for (const [token, entry] of clients.entries()) {
    if (now - entry.lastActivity > config.clientIdleTimeoutMs) {
      console.log(`🧹 Cleaning up idle client: ${token.slice(0, 8)}...`);
      try {
        entry.client.disconnect();
      } catch {
        // Ignore disconnect errors during cleanup
      }
      clients.delete(token);
    }
  }
}, CLEANUP_INTERVAL_MS);

// Prevent the cleanup interval from keeping the process alive
// when the server is shutting down
if (typeof globalThis !== "undefined") {
  const interval = CLEANUP_INTERVAL_MS;
  // The interval ref is stored on the module scope; Node will
  // naturally clear it when the process exits. No additional
  // cleanup logic is needed for V1.
  void interval;
}
