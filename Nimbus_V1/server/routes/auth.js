import { Router } from "express";
import { Api } from "telegram/tl/index.js";
import config from "../config/env.js";
import {
  generateSessionToken,
  getClient,
  finalizeSession,
  destroyClient,
  isSessionValid,
} from "../telegram.js";
import { requireSession } from "../middleware/session.js";

// ==================================================
// AUTHENTICATION ROUTES
// ==================================================
// Handles the complete Telegram authentication flow:
//
//   Phone Login:  send-otp → verify-otp → [verify-password] → done
//   QR Login:     qr/generate → poll qr/check → [verify-password] → done
//
// WHY THESE ENDPOINTS:
// Each endpoint maps 1:1 to an existing TelegramService
// method in the frontend. The frontend's auth flow remains
// identical — only the transport changes (API calls instead
// of direct MTProto from the browser).
//
// SESSION TOKEN FLOW:
// 1. send-otp or qr/generate creates a fresh client and
//    returns a sessionToken to the frontend.
// 2. The frontend sends this token in the x-session-token
//    header for all subsequent auth steps.
// 3. On successful auth, the Telegram session is saved to
//    encrypted disk storage.
// ==================================================

const router = Router();

// ==================================================
// PHONE LOGIN — STEP 1: SEND OTP
// ==================================================
// Creates a new TelegramClient, sends an OTP to the
// provided phone number, and returns a sessionToken
// for tracking this auth flow.
// ==================================================

router.post("/send-otp", async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone || !/^\+\d{8,15}$/.test(phone)) {
      return res.status(400).json({
        success: false,
        error: "Invalid phone format. Must include country dial code prefix (e.g., +91XXXXXXXXXX).",
      });
    }

    const sessionToken = generateSessionToken();
    const entry = await getClient(sessionToken, { createIfMissing: true });

    const result = await entry.client.sendCode(
      { apiId: config.apiId, apiHash: config.apiHash },
      phone,
    );

    // Store auth flow state on the client entry
    entry.phone = phone;
    entry.phoneCodeHash = result.phoneCodeHash;

    return res.json({
      success: true,
      sessionToken,
    });
  } catch (err) {
    console.error("send-otp error:", err.message);
    return res.status(500).json({
      success: false,
      error: "Failed to send verification code. Please try again.",
    });
  }
});

// ==================================================
// PHONE LOGIN — STEP 2: VERIFY OTP
// ==================================================
// Verifies the OTP code against Telegram. On success,
// saves the session. If Telegram requests 2FA, returns
// PASSWORD_REQUIRED status so the frontend can show
// the password input.
// ==================================================

router.post("/verify-otp", async (req, res) => {
  try {
    const sessionToken = req.headers["x-session-token"];
    const { code } = req.body;

    if (!sessionToken) {
      return res.status(400).json({
        success: false,
        error: "Session token required.",
      });
    }

    if (!code || !/^\d{5,6}$/.test(code)) {
      return res.status(400).json({
        success: false,
        error: "Invalid code format. Must be 5-6 digits.",
      });
    }

    const entry = await getClient(sessionToken);
    if (!entry) {
      return res.status(401).json({
        success: false,
        error: "Session not found. Please restart login.",
      });
    }

    try {
      await entry.client.invoke(
        new Api.auth.SignIn({
          phoneNumber: entry.phone,
          phoneCodeHash: entry.phoneCodeHash,
          phoneCode: code,
        }),
      );

      const authorized = await finalizeSession(sessionToken);
      if (authorized) {
        return res.json({ success: true, status: "SUCCESS" });
      }

      return res.status(500).json({
        success: false,
        error: "Authentication completed but session verification failed.",
      });
    } catch (error) {
      const errMsg = error.errorMessage || error.message || "";

      if (errMsg.includes("SESSION_PASSWORD_NEEDED")) {
        return res.json({
          success: true,
          status: "PASSWORD_REQUIRED",
        });
      }

      if (errMsg.includes("PHONE_CODE_INVALID")) {
        return res.status(400).json({
          success: false,
          error: "Invalid verification code. Please check and try again.",
        });
      }

      if (errMsg.includes("PHONE_CODE_EXPIRED")) {
        return res.status(400).json({
          success: false,
          error: "Verification code expired. Please request a new one.",
        });
      }

      throw error;
    }
  } catch (err) {
    console.error("verify-otp error:", err.message);
    return res.status(500).json({
      success: false,
      error: "Verification failed. Please try again.",
    });
  }
});

// ==================================================
// PHONE LOGIN — STEP 3: VERIFY 2FA PASSWORD
// ==================================================
// Called when Telegram requires a cloud password (2FA).
// Completes authentication and saves the session.
// ==================================================

router.post("/verify-password", async (req, res) => {
  try {
    const sessionToken = req.headers["x-session-token"];
    const { password } = req.body;

    if (!sessionToken) {
      return res.status(400).json({
        success: false,
        error: "Session token required.",
      });
    }

    if (!password) {
      return res.status(400).json({
        success: false,
        error: "Password is required.",
      });
    }

    const entry = await getClient(sessionToken);
    if (!entry) {
      return res.status(401).json({
        success: false,
        error: "Session not found. Please restart login.",
      });
    }

    try {
      await entry.client.signInWithPassword(
        { apiId: config.apiId, apiHash: config.apiHash },
        {
          password: async () => password,
          onError: (err) => {
            const msg = err.errorMessage || err.message || "";
            if (msg.includes("PASSWORD_HASH_INVALID") || msg.includes("SRP_ID_INVALID")) {
              throw new Error("Incorrect 2FA Cloud Password provided.");
            }
            return false;
          },
        },
      );

      const authorized = await finalizeSession(sessionToken);
      if (authorized) {
        return res.json({ success: true, status: "SUCCESS" });
      }

      return res.status(500).json({
        success: false,
        error: "Password accepted but session verification failed.",
      });
    } catch (error) {
      const errMsg = error.message || "";
      if (errMsg.includes("Incorrect 2FA")) {
        return res.status(400).json({
          success: false,
          error: errMsg,
        });
      }
      throw error;
    }
  } catch (err) {
    console.error("verify-password error:", err.message);
    return res.status(500).json({
      success: false,
      error: "2FA verification failed. Please try again.",
    });
  }
});

// ==================================================
// QR LOGIN — STEP 1: GENERATE QR TOKEN
// ==================================================
// Creates a new TelegramClient, requests a login token
// from Telegram, and returns the QR URL for scanning.
//
// WHY A SEPARATE ENDPOINT:
// QR login creates its own client instance independent
// of the phone login flow. The frontend tracks both
// flows in parallel (QR on left, phone on right of
// the Login page).
// ==================================================

router.post("/qr/generate", async (req, res) => {
  try {
    // Allow reusing an existing session token if provided (for QR refresh)
    let sessionToken = req.headers["x-session-token"];
    let entry;

    if (sessionToken) {
      entry = await getClient(sessionToken);
    }

    if (!entry) {
      sessionToken = generateSessionToken();
      entry = await getClient(sessionToken, { createIfMissing: true });
    }

    const loginToken = await entry.client.invoke(
      new Api.auth.ExportLoginToken({
        apiId: config.apiId,
        apiHash: config.apiHash,
        exceptIds: [],
      }),
    );

    const isLoginToken =
      loginToken?.className === "auth.LoginToken" ||
      loginToken?.constructor?.name === "LoginToken";

    const isAlreadyAccepted =
      loginToken?.className === "auth.LoginTokenSuccess" ||
      loginToken?.constructor?.name === "LoginTokenSuccess";

    if (isLoginToken) {
      // Convert token bytes to URL-safe base64
      const binaryString = Array.from(loginToken.token)
        .map((b) => String.fromCharCode(b))
        .join("");
      const standardBase64 = Buffer.from(binaryString, "binary").toString("base64");
      const tokenBase64Url = standardBase64
        .replace(/\+/g, "-")
        .replace(/\//g, "_")
        .replace(/=+$/, "");

      return res.json({
        success: true,
        sessionToken,
        url: `tg://login?token=${tokenBase64Url}`,
        expires: loginToken.expires,
      });
    }

    if (isAlreadyAccepted) {
      const authorized = await finalizeSession(sessionToken);
      if (authorized) {
        return res.json({
          success: true,
          sessionToken,
          status: "SUCCESS",
        });
      }
    }

    return res.status(500).json({
      success: false,
      error: `Unexpected QR token state: ${loginToken?.className || "Unknown"}`,
    });
  } catch (err) {
    console.error("qr/generate error:", err.message);
    return res.status(500).json({
      success: false,
      error: "Failed to generate QR login token.",
    });
  }
});

// ==================================================
// QR LOGIN — STEP 2: CHECK QR STATUS
// ==================================================
// Polls Telegram to check if the QR code has been
// scanned. Handles DC migration (when the user's
// account lives on a different data center).
// ==================================================

router.post("/qr/check", async (req, res) => {
  try {
    const sessionToken = req.headers["x-session-token"];

    if (!sessionToken) {
      return res.status(400).json({
        success: false,
        error: "Session token required.",
      });
    }

    const entry = await getClient(sessionToken);
    if (!entry) {
      return res.status(401).json({
        success: false,
        error: "Session not found. Please regenerate QR code.",
      });
    }

    try {
      const check = await entry.client.invoke(
        new Api.auth.ExportLoginToken({
          apiId: config.apiId,
          apiHash: config.apiHash,
          exceptIds: [],
        }),
      );

      // Success — token was scanned and authorization is complete
      const isSuccess =
        check?.className === "auth.LoginTokenSuccess" ||
        check?.constructor?.name === "LoginTokenSuccess";

      if (isSuccess) {
        const authorized = await finalizeSession(sessionToken);
        if (authorized) {
          return res.json({ success: true, status: "SUCCESS" });
        }
      }

      // Migration — user's account lives on a different Data Center
      const isMigrate =
        check?.className === "auth.LoginTokenMigrateTo" ||
        check?.constructor?.name === "LoginTokenMigrateTo";

      if (isMigrate && check.dcId) {
        await entry.client._switchDC(check.dcId);

        try {
          const migratedResult = await entry.client.invoke(
            new Api.auth.ImportLoginToken({ token: check.token }),
          );

          const migratedSuccess =
            migratedResult?.className === "auth.LoginTokenSuccess" ||
            migratedResult?.constructor?.name === "LoginTokenSuccess";

          if (migratedSuccess) {
            const authorized = await finalizeSession(sessionToken);
            if (authorized) {
              return res.json({ success: true, status: "SUCCESS" });
            }
          }
        } catch (migrationError) {
          const errMsg = migrationError.errorMessage || migrationError.message || "";
          if (errMsg.includes("SESSION_PASSWORD_NEEDED")) {
            return res.json({ success: true, status: "PASSWORD_REQUIRED" });
          }
          throw migrationError;
        }

        return res.json({ success: true, status: "MIGRATED" });
      }

      // Still pending — QR not scanned yet
      return res.json({ success: true, status: "PENDING" });
    } catch (error) {
      const errMsg = error.errorMessage || error.message || "";

      if (errMsg.includes("SESSION_PASSWORD_NEEDED")) {
        return res.json({ success: true, status: "PASSWORD_REQUIRED" });
      }

      // If client is already authorized (edge case), finalize
      if (entry.client && (await entry.client.isUserAuthorized())) {
        const authorized = await finalizeSession(sessionToken);
        if (authorized) {
          return res.json({ success: true, status: "SUCCESS" });
        }
      }

      throw error;
    }
  } catch (err) {
    console.error("qr/check error:", err.message);
    return res.status(500).json({
      success: false,
      error: "Failed to check QR status.",
    });
  }
});

// ==================================================
// SESSION STATUS CHECK
// ==================================================
// Allows the frontend to verify if a stored session
// token is still valid (e.g., after page refresh).
// ==================================================

router.get("/status", async (req, res) => {
  try {
    const sessionToken = req.headers["x-session-token"];

    if (!sessionToken) {
      return res.json({ success: true, valid: false });
    }

    const valid = await isSessionValid(sessionToken);
    return res.json({ success: true, valid });
  } catch {
    return res.json({ success: true, valid: false });
  }
});

// ==================================================
// LOGOUT
// ==================================================
// Destroys the Telegram client and removes the
// encrypted session file from disk.
// ==================================================

router.post("/logout", requireSession, async (req, res) => {
  try {
    await destroyClient(req.sessionToken);
    return res.json({ success: true });
  } catch (err) {
    console.error("logout error:", err.message);
    // Still return success — the user should be logged out client-side
    // even if server cleanup partially fails
    return res.json({ success: true });
  }
});

export default router;
