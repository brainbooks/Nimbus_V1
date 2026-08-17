import { getClient } from "../telegram.js";

// ==================================================
// SESSION VALIDATION MIDDLEWARE
// ==================================================
// Extracts the session token from the x-session-token
// header and validates that it maps to an active,
// connected Telegram client.
//
// WHY A HEADER (NOT A COOKIE):
// Headers are explicitly set by the frontend, making
// the contract clear. Cookies introduce CSRF concerns
// and auto-send behavior that complicates the security
// model. The session token is opaque — it reveals
// nothing about Telegram internals.
//
// USAGE:
// Apply this middleware to any route that requires
// an authenticated Telegram session:
//
//   router.get("/profile", requireSession, handler);
//
// After this middleware runs, req.sessionToken and
// req.telegramClient are available to the handler.
// ==================================================

export async function requireSession(req, res, next) {
  // Support both header (API calls) and query param (img src, etc.)
  const sessionToken = req.headers["x-session-token"] || req.query.token;

  if (!sessionToken) {
    return res.status(401).json({
      success: false,
      error: "Session token required. Please log in.",
    });
  }

  try {
    const entry = await getClient(sessionToken);

    if (!entry) {
      return res.status(401).json({
        success: false,
        error: "Session expired or invalid. Please log in again.",
      });
    }

    const isAuthorized = await entry.client.isUserAuthorized();
    if (!isAuthorized) {
      return res.status(401).json({
        success: false,
        error: "Session is no longer authorized. Please log in again.",
      });
    }

    // Attach to request for downstream handlers
    req.sessionToken = sessionToken;
    req.telegramClient = entry.client;
    next();
  } catch (err) {
    console.error("Session middleware error:", err.message);
    return res.status(401).json({
      success: false,
      error: "Session validation failed. Please log in again.",
    });
  }
}
