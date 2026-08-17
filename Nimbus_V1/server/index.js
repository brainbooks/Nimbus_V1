import express from "express";
import cors from "cors";
import config from "./config/env.js";
import authRoutes from "./routes/auth.js";
import userRoutes from "./routes/user.js";
import fileRoutes from "./routes/files.js";
import metaRoutes from "./routes/meta.js";

// ==================================================
// TELECLOUD NIMBUS — BACKEND SERVER
// ==================================================
// Secure gateway between the React frontend and
// Telegram's MTProto protocol. This server exists
// ONLY because browsers cannot securely store Telegram
// credentials (API_ID, API_HASH, session strings).
//
// REQUEST FLOW:
//   React → Express API → GramJS → Telegram MTProto
//   Telegram MTProto → GramJS → Express API → React
//
// THIS FILE IS RESPONSIBLE FOR:
//   • Express app setup
//   • Middleware registration
//   • Route mounting
//   • Server startup
//
// THIS FILE SHOULD NEVER CONTAIN:
//   • Route handlers
//   • Business logic
//   • Telegram client code
//   • Session management logic
// ==================================================

const app = express();

// ==================================================
// MIDDLEWARE
// ==================================================

// Parse JSON request bodies (all API communication is JSON)
app.use(express.json({ limit: "1mb" }));

// CORS — restrict to the configured frontend origin
app.use(
  cors({
    origin: config.corsOrigin,
    methods: ["GET", "POST", "DELETE"],
    allowedHeaders: ["Content-Type", "x-session-token"],
  }),
);

// ==================================================
// ROUTE MOUNTING
// ==================================================

app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/files", fileRoutes);
app.use("/api/meta", metaRoutes);

// ==================================================
// HEALTH CHECK
// ==================================================
// Simple endpoint for monitoring and debugging.
// Returns minimal info without exposing internals.
// ==================================================

app.get("/api/health", (_req, res) => {
  res.json({ status: "ok", timestamp: Date.now() });
});

// ==================================================
// 404 HANDLER
// ==================================================

app.use((_req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found.",
  });
});

// ==================================================
// GLOBAL ERROR HANDLER
// ==================================================
// Catches unhandled errors from route handlers.
// Never exposes internal error details to the client.
// ==================================================

app.use((err, _req, res, _next) => {
  void _next;
  console.error("Unhandled server error:", err);
  res.status(500).json({
    success: false,
    error: "Internal server error.",
  });
});

// ==================================================
// SERVER STARTUP
// ==================================================

app.listen(config.port, () => {
  console.log(`\n✅  TeleCloud Nimbus backend running on port ${config.port}`);
  console.log(`    CORS origin: ${config.corsOrigin}`);
  console.log(`    Client idle timeout: ${config.clientIdleTimeoutMs / 60000} minutes\n`);
});
