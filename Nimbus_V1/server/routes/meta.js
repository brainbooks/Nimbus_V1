import { Router } from "express";
import { Api } from "telegram/tl/index.js";
import { CustomFile } from "telegram/client/uploads.js";
import { requireSession } from "../middleware/session.js";
import { Buffer } from "node:buffer";

// ==================================================
// METADATA ROUTES
// ==================================================
// Stores and retrieves app metadata (virtual folders,
// tags, favorites, trash state) as a special JSON
// message in the user's Telegram Saved Messages.
//
// WHY TELEGRAM MESSAGES:
// This enables cross-device sync without needing a
// separate database. The metadata message has a
// recognizable prefix so we can find it quickly.
//
// FORMAT:
// Current metadata is stored in a reserved JSON document. The original text
// message format remains readable for backward compatibility.
//
// ENDPOINTS:
//   GET  /api/meta       — Fetch current metadata
//   POST /api/meta       — Save/update metadata
// ==================================================

const router = Router();
const META_PREFIX = "__NIMBUS_META__\n";
const META_FILE_MARKER = "NIMBUS_INTERNAL_METADATA_V2";
const LEGACY_META_FILE_MARKERS = ["__NIMBUS_META_FILE__", "NIMBUS_META_FILE"];
const META_FILE_NAME = ".nimbus-system-metadata.json";
const RESERVED_META_FILE_NAMES = new Set([META_FILE_NAME, "nimbus-metadata.json"]);
const MAX_METADATA_BYTES = 1024 * 1024;

function documentFileName(message) {
  const attributes = message.media?.document?.attributes || [];
  return attributes.find((attribute) => attribute.fileName)?.fileName || "";
}

function isMetadataMessage(message) {
  const caption = message.message || "";
  const reservedDocument = message.media?.document
    && RESERVED_META_FILE_NAMES.has(documentFileName(message).toLowerCase());
  return caption.startsWith(META_PREFIX)
    || caption.startsWith(META_FILE_MARKER)
    || LEGACY_META_FILE_MARKERS.some((marker) => caption.startsWith(marker))
    || reservedDocument;
}

// ==================================================
// HELPER: Find the metadata message
// ==================================================
async function findMetaMessages(client) {
  // Search recent messages for the meta prefix
  // We send it as a regular message to "me" (Saved Messages)
  let offsetId = 0;
  const matches = [];

  // Scan up to 500 messages to find it
  for (let batch = 0; batch < 5; batch++) {
    const messages = await client.getMessages("me", {
      limit: 100,
      offsetId,
    });

    if (!messages || messages.length === 0) break;

    for (const msg of messages) {
      if (isMetadataMessage(msg)) matches.push(msg);
    }

    offsetId = messages[messages.length - 1].id;
    if (messages.length < 100) break;
  }

  return matches;
}

// ==================================================
// GET METADATA
// ==================================================
router.get("/", requireSession, async (req, res) => {
  try {
    const client = req.telegramClient;
    const [metaMsg] = await findMetaMessages(client);

    if (!metaMsg) {
      // No metadata found — return empty defaults
      return res.json({
        success: true,
        metadata: {
          virtualFolders: [],
          tags: {},
          favorites: [],
          trash: {},
          version: 1,
        },
      });
    }

    // Read the current document format, while continuing to understand the
    // original text-message format so existing accounts migrate automatically.
    let jsonStr;
    if (metaMsg.media?.document) {
      const fileBuffer = await client.downloadMedia(metaMsg.media);
      if (!fileBuffer || fileBuffer.length > MAX_METADATA_BYTES) {
        throw new Error("Metadata document is missing or too large.");
      }
      jsonStr = Buffer.from(fileBuffer).toString("utf8");
    } else {
      jsonStr = metaMsg.message.slice(META_PREFIX.length);
    }
    let metadata;
    try {
      metadata = JSON.parse(jsonStr);
    } catch {
      // Corrupted metadata — return defaults
      return res.json({
        success: true,
        metadata: {
          virtualFolders: [],
          tags: {},
          favorites: [],
          trash: {},
          version: 1,
        },
      });
    }

    return res.json({
      success: true,
      metadata,
      messageId: metaMsg.id,
    });
  } catch (err) {
    console.error("meta fetch error:", err.message);
    return res.status(500).json({
      success: false,
      error: "Failed to fetch metadata.",
    });
  }
});

// ==================================================
// SAVE/UPDATE METADATA
// ==================================================
router.post("/", requireSession, async (req, res) => {
  try {
    const client = req.telegramClient;
    const { metadata } = req.body;

    if (!metadata) {
      return res.status(400).json({
        success: false,
        error: "Metadata object required.",
      });
    }

    // Ensure version stamp
    metadata.version = metadata.version || 1;
    metadata.updatedAt = new Date().toISOString();

    const metadataJson = JSON.stringify(metadata);
    const metadataBuffer = Buffer.from(metadataJson, "utf8");
    if (metadataBuffer.length > MAX_METADATA_BYTES) {
      return res.status(413).json({ success: false, error: "Metadata is too large to sync." });
    }
    const metadataFile = new CustomFile(META_FILE_NAME, metadataBuffer.length, "", metadataBuffer);

    // Save the replacement first, then remove the old copy. A failed upload can
    // therefore never destroy the last usable metadata snapshot.
    const existingMessages = await findMetaMessages(client);
    const result = await client.sendFile("me", {
      file: metadataFile,
      caption: META_FILE_MARKER,
      parseMode: false,
      forceDocument: true,
      attributes: [new Api.DocumentAttributeFilename({ fileName: META_FILE_NAME })],
    });

    const staleMessageIds = existingMessages
      .map((message) => message.id)
      .filter((messageId) => messageId !== result.id);
    if (staleMessageIds.length) {
      try {
        await client.deleteMessages("me", staleMessageIds, { revoke: true });
      } catch (cleanupError) {
        // The newest snapshot is already safe; a stale duplicate can be cleaned
        // during a later save without turning this successful sync into an error.
        console.warn("Could not remove previous metadata snapshot:", cleanupError.message);
      }
    }

    return res.json({
      success: true,
      messageId: result.id,
    });
  } catch (err) {
    console.error("meta save error:", err.message);
    return res.status(500).json({
      success: false,
      error: "Failed to save metadata.",
    });
  }
});

export default router;
