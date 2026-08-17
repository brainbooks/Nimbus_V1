import { Router } from "express";
import { requireSession } from "../middleware/session.js";

// ==================================================
// USER DATA ROUTES
// ==================================================
// Returns user profile information, avatar, and
// storage usage statistics from Telegram.
//
// ENDPOINTS:
//   GET /api/user/profile  — Name, username, avatar flag
//   GET /api/user/avatar   — Profile photo binary
//   GET /api/user/storage  — Storage breakdown by type
// ==================================================

const router = Router();

// ==================================================
// USER PROFILE
// ==================================================
router.get("/profile", requireSession, async (req, res) => {
  try {
    const me = await req.telegramClient.getMe();
    const fullName =
      [me.firstName, me.lastName].filter(Boolean).join(" ") || "Telegram User";
    const username = me.username ? `@${me.username}` : "Cloud User";

    // Check if user has a profile photo
    let hasAvatar = false;
    try {
      if (me.photo) {
        hasAvatar = true;
      }
    } catch {
      // Ignore — no photo
    }

    return res.json({
      success: true,
      name: fullName,
      title: username,
      hasAvatar,
    });
  } catch (err) {
    console.error("profile error:", err.message);
    return res.json({
      success: true,
      name: "Nimbus User",
      title: "Connected",
      hasAvatar: false,
    });
  }
});

// ==================================================
// USER AVATAR (PROFILE PHOTO)
// ==================================================
// Downloads and serves the user's Telegram profile
// photo. Returns 404 if no photo is set.
// ==================================================
router.get("/avatar", requireSession, async (req, res) => {
  try {
    const client = req.telegramClient;
    const me = await client.getMe();

    if (!me.photo) {
      return res.status(404).json({
        success: false,
        error: "No profile photo available.",
      });
    }

    // Download the profile photo
    const buffer = await client.downloadProfilePhoto(me);

    if (!buffer || buffer.length === 0) {
      return res.status(404).json({
        success: false,
        error: "Profile photo download failed.",
      });
    }

    res.set("Content-Type", "image/jpeg");
    res.set("Cache-Control", "public, max-age=3600"); // Cache 1 hour
    res.send(Buffer.from(buffer));
  } catch (err) {
    console.error("avatar error:", err.message);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch profile photo.",
    });
  }
});

// ==================================================
// STORAGE USAGE BREAKDOWN
// ==================================================
router.get("/storage", requireSession, async (req, res) => {
  try {
    let imagesSize = 0;
    let videosSize = 0;
    let pdfsSize = 0;
    let othersSize = 0;
    let offsetId = 0;

    while (true) {
      const messages = await req.telegramClient.getMessages("me", {
        limit: 100,
        offsetId,
      });

      if (!messages || messages.length === 0) break;

      for (const msg of messages) {
        if (!msg.media) continue;

        if (msg.media.document) {
          const size = Number(msg.media.document.size || 0);
          const mime = msg.media.document.mimeType || "";

          if (mime.startsWith("video/")) {
            videosSize += size;
          } else if (mime === "application/pdf") {
            pdfsSize += size;
          } else {
            othersSize += size;
          }
        } else if (msg.media.photo) {
          const largestSize = msg.media.photo.sizes?.at(-1)?.size;
          imagesSize += Number(largestSize || 0);
        }
      }

      offsetId = messages[messages.length - 1].id;
      if (messages.length < 100) break;
    }

    const totalBytes = imagesSize + videosSize + pdfsSize + othersSize;

    const formatSize = (bytes) => {
      if (bytes === 0) return "0 B";
      const units = ["B", "KB", "MB", "GB", "TB"];
      const i = Math.floor(Math.log(bytes) / Math.log(1024));
      return `${(bytes / Math.pow(1024, i)).toFixed(i > 1 ? 1 : 0)} ${units[i]}`;
    };

    return res.json({
      success: true,
      categories: [
        { name: "Images", size: formatSize(imagesSize), bytes: imagesSize, color: "#3b82f6" },
        { name: "Videos", size: formatSize(videosSize), bytes: videosSize, color: "#ef4444" },
        { name: "Documents", size: formatSize(pdfsSize), bytes: pdfsSize, color: "#22c55e" },
        { name: "Others", size: formatSize(othersSize), bytes: othersSize, color: "#f59e0b" },
      ],
      totalBytes,
      totalFormatted: formatSize(totalBytes),
    });
  } catch (err) {
    console.error("storage scan error:", err.message);
    return res.status(500).json({
      success: false,
      error: "Failed to scan storage data.",
    });
  }
});

export default router;
