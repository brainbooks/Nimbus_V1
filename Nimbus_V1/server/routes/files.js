import { Router } from "express";
import { requireSession } from "../middleware/session.js";
import { Api } from "telegram/tl/index.js";
import bigInt from "big-integer";
import multer from "multer";
import os from "os";
import path from "path";
import fs from "fs";
import crypto from "node:crypto";
import { Buffer } from "node:buffer";

const MAX_UPLOAD_SIZE = 2 * 1024 * 1024 * 1024;
const FILE_META_PREFIX = "__NIMBUS_FILE__\n";
const APP_METADATA_PREFIXES = [
  "__NIMBUS_META__\n",
  "__NIMBUS_META_FILE__",
  "NIMBUS_META_FILE",
  "NIMBUS_INTERNAL_METADATA_V2",
];
const APP_METADATA_FILE_NAMES = new Set([
  "nimbus-metadata.json",
  ".nimbus-system-metadata.json",
]);
const upload = multer({
  storage: multer.diskStorage({
    destination: os.tmpdir(),
    filename: (_req, file, callback) => {
      const extension = path.extname(file.originalname).slice(0, 20);
      callback(null, `${crypto.randomUUID()}${extension}`);
    },
  }),
  limits: { fileSize: MAX_UPLOAD_SIZE },
});

// ==================================================
// FILE OPERATION ROUTES
// ==================================================
// Endpoints for listing and accessing files stored
// in the user's Telegram Saved Messages.
//
// ENDPOINTS:
//   GET  /api/files/list               — List all files
//   GET  /api/files/thumbnail/:msgId   — Get thumbnail for a message
//
// ALL ROUTES REQUIRE AUTHENTICATION.
// ==================================================

const router = Router();

// ==================================================
// HELPER: Detect file type from MIME string
// ==================================================
function detectType(mimeType) {
  if (!mimeType) return "other";
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "music";
  if (mimeType === "application/pdf" || mimeType.includes("document") || mimeType.includes("text")) return "document";
  if (mimeType.includes("zip") || mimeType.includes("rar") || mimeType.includes("tar") || mimeType.includes("7z") || mimeType.includes("archive")) return "archive";
  return "other";
}

// ==================================================
// HELPER: Get extension from filename or MIME
// ==================================================
function getExtension(fileName, mimeType) {
  if (fileName) {
    const dot = fileName.lastIndexOf(".");
    if (dot >= 0) return fileName.slice(dot);
  }
  // Fallback: derive from MIME
  const mimeMap = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "video/mp4": ".mp4",
    "video/x-matroska": ".mkv",
    "audio/mpeg": ".mp3",
    "audio/flac": ".flac",
    "application/pdf": ".pdf",
    "application/zip": ".zip",
  };
  return mimeMap[mimeType] || "";
}

function messageDate(message) {
  return message.date ? new Date(message.date * 1000) : new Date();
}

function parseNimbusFileMeta(message) {
  if (!message.message?.startsWith(FILE_META_PREFIX)) return null;
  try {
    return JSON.parse(message.message.slice(FILE_META_PREFIX.length));
  } catch {
    return null;
  }
}

function documentFileName(message) {
  const attributes = message.media?.document?.attributes || [];
  return attributes.find((attribute) => attribute.fileName)?.fileName || "";
}

function isAppMetadataMessage(message) {
  const caption = message.message || "";
  const fileName = documentFileName(message).toLowerCase();
  return APP_METADATA_PREFIXES.some((prefix) => caption.startsWith(prefix))
    || APP_METADATA_FILE_NAMES.has(fileName);
}

function friendlyMediaName(message, type = "File") {
  const date = messageDate(message);
  const stamp = date.toISOString().slice(0, 16).replace("T", "_").replace(":", "-");
  return `${type}_${stamp}`;
}

function fileNameFromMessage(message) {
  const savedMeta = parseNimbusFileMeta(message);
  if (savedMeta?.name) return savedMeta.name;

  const attributeName = documentFileName(message);
  const stem = attributeName.replace(/\.[^/.]+$/, "");
  if (attributeName && !/^[a-f\d-]{20,}$/i.test(stem)) return attributeName;

  const mimeType = message.media?.document?.mimeType || "";
  const extension = getExtension(attributeName, mimeType);
  const label = detectType(mimeType);
  const friendlyLabel = label === "other" ? "File" : label[0].toUpperCase() + label.slice(1);
  return `${friendlyMediaName(message, friendlyLabel)}${extension}`;
}

function fileSizeFromMessage(message) {
  if (message.media?.document?.size) return Number(message.media.document.size);
  const sizes = message.media?.photo?.sizes || [];
  return Number(sizes.at(-1)?.size || 0);
}

function contentTypeFromMessage(message) {
  if (message.media?.document?.mimeType) return message.media.document.mimeType;
  if (message.media?.photo) return "image/jpeg";
  return "application/octet-stream";
}

function safeContentDispositionName(name) {
  return String(name || "download")
    .replace(/[\r\n]/g, "")
    .replace(/["\\]/g, "_")
    .replace(/[^\x20-\x7E]/g, "_");
}

function waitForDrain(response) {
  return new Promise((resolve) => {
    const done = () => {
      response.off("drain", done);
      response.off("close", done);
      resolve();
    };
    response.once("drain", done);
    response.once("close", done);
  });
}

// ==================================================
// LIST FILES
// ==================================================
// Scans all messages in Saved Messages and returns
// file metadata in the dashboard format.
// Paginated scan using offset — same pattern as storage.
// ==================================================

router.get("/list", requireSession, async (req, res) => {
  try {
    const client = req.telegramClient;
    const files = [];
    let offsetId = 0;
    let scanned = 0;
    const MAX_MESSAGES_TO_SCAN = 5000;
    const MAX_FILES = 2000;

    while (scanned < MAX_MESSAGES_TO_SCAN && files.length < MAX_FILES) {
      const messages = await client.getMessages("me", {
        limit: 100,
        offsetId,
      });

      if (!messages || messages.length === 0) break;

      for (const msg of messages) {
        if (!msg.media) continue;
        if (isAppMetadataMessage(msg)) continue;

        let fileData = null;

        if (msg.media.document) {
          const doc = msg.media.document;
          const mimeType = doc.mimeType || "";
          const size = Number(doc.size || 0);

          const fileName = fileNameFromMessage(msg);

          const type = detectType(mimeType);
          const extension = getExtension(fileName, mimeType);
          const name = fileName
            ? fileName.replace(/\.[^/.]+$/, "")
            : friendlyMediaName(msg);

          fileData = {
            id: `tg_${msg.id}`,
            messageId: msg.id,
            name,
            type,
            extension,
            size,
            mimeType,
            uploadDate: msg.date ? new Date(msg.date * 1000).toISOString() : new Date().toISOString(),
            thumbnail: null,
            tags: [],
            isFavorite: false,
          };

          // Check if it has a thumbnail
          if (type === "video" || type === "image") {
            fileData.thumbnail = `/api/files/thumbnail/${msg.id}`;
          }

        } else if (msg.media.photo) {
          const photo = msg.media.photo;
          fileData = {
            id: `tg_${msg.id}`,
            messageId: msg.id,
            name: friendlyMediaName(msg, "Photo"),
            type: "image",
            extension: ".jpg",
            size: photo.sizes?.at(-1)?.size || 0,
            mimeType: "image/jpeg",
            uploadDate: msg.date ? new Date(msg.date * 1000).toISOString() : new Date().toISOString(),
            thumbnail: `/api/files/thumbnail/${msg.id}`,
            tags: [],
            isFavorite: false,
          };
        }

        if (fileData) {
          files.push(fileData);
        }
      }

      scanned += messages.length;
      offsetId = messages[messages.length - 1].id;
      if (messages.length < 100 || files.length >= MAX_FILES) break;
    }

    return res.json({
      success: true,
      files,
      total: files.length,
    });

  } catch (err) {
    console.error("File list error:", err.message);
    return res.status(500).json({
      success: false,
      error: "Failed to list files.",
    });
  }
});

// ==================================================
// GET THUMBNAIL
// ==================================================
// Downloads and serves the thumbnail for a message's media.
// ==================================================

router.get("/thumbnail/:messageId", requireSession, async (req, res) => {
  try {
    const client = req.telegramClient;
    const messageId = parseInt(req.params.messageId);

    if (isNaN(messageId)) {
      return res.status(400).json({ success: false, error: "Invalid message ID." });
    }

    const messages = await client.getMessages("me", {
      ids: [messageId],
    });

    if (!messages || messages.length === 0 || !messages[0].media) {
      return res.status(404).json({ success: false, error: "Media not found." });
    }

    const msg = messages[0];

    const documentThumbs = msg.media.document?.thumbs || [];
    if (msg.media.document && documentThumbs.length === 0) {
      return res.status(404).json({ success: false, error: "Thumbnail not available." });
    }

    // Use Telegram's largest generated thumbnail. thumb: 0 is deliberately
    // avoided because it is the smallest, low-resolution placeholder.
    const buffer = await client.downloadMedia(msg.media, {
      thumb: msg.media.document ? documentThumbs.length - 1 : undefined,
    });

    if (!buffer) {
      return res.status(404).json({ success: false, error: "Thumbnail not available." });
    }

    // Set content type
    let contentType = "image/jpeg";
    if (msg.media.document?.mimeType?.startsWith("image/")) {
      contentType = msg.media.document.mimeType;
    }

    res.set("Content-Type", contentType);
    res.set("Cache-Control", "private, max-age=86400");
    res.send(Buffer.from(buffer));

  } catch (err) {
    console.error("Thumbnail error:", err.message);
    return res.status(500).json({
      success: false,
      error: "Failed to get thumbnail.",
    });
  }
});

// ==================================================
// UPLOAD FILE
// ==================================================
// Accepts a file and uploads it to the user's Saved Messages.
// ==================================================

router.post("/upload", requireSession, upload.single("file"), async (req, res) => {
  let tempFilePath = null;
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, error: "No file provided." });
    }

    const client = req.telegramClient;
    const { originalname, path: uploadedTempPath, mimetype, size } = req.file;
    tempFilePath = uploadedTempPath;
    const isVideo = mimetype.startsWith("video/");

    // Upload the file to "Saved Messages" ("me")
    const msg = await client.sendFile("me", {
      file: tempFilePath, // GramJS automatically streams from the file path
      caption: FILE_META_PREFIX + JSON.stringify({ name: originalname, uploadedAt: new Date().toISOString() }),
      parseMode: false,
      attributes: [new Api.DocumentAttributeFilename({ fileName: originalname })],
      forceDocument: !isVideo,
      supportsStreaming: mimetype === "video/mp4",
    });

    if (!msg) {
      throw new Error("Telegram API did not return a message object upon upload.");
    }

    const type = detectType(mimetype);
    const extension = getExtension(originalname, mimetype);
    const name = originalname ? originalname.replace(/\.[^/.]+$/, "") : `File_${msg.id}`;

    const fileData = {
      id: `tg_${msg.id}`,
      messageId: msg.id,
      name,
      type,
      extension,
      size,
      mimeType: mimetype,
      uploadDate: msg.date ? new Date(msg.date * 1000).toISOString() : new Date().toISOString(),
      thumbnail: (type === "video" || type === "image") ? `/api/files/thumbnail/${msg.id}` : null,
      tags: [],
      isFavorite: false,
    };

    return res.json({
      success: true,
      file: fileData,
    });

  } catch (err) {
    console.error("Upload error:", err.message);
    return res.status(500).json({
      success: false,
      error: "Failed to upload file.",
    });
  } finally {
    if (tempFilePath) {
      fs.unlink(tempFilePath, (unlinkError) => {
        if (unlinkError && unlinkError.code !== "ENOENT") {
          console.error("Failed to delete temp file:", unlinkError.message);
        }
      });
    }
  }
});

// ==================================================
// DOWNLOAD FILE
// ==================================================
// Downloads the full file from Telegram.
// ==================================================

router.get("/download/:messageId", requireSession, async (req, res) => {
  try {
    const client = req.telegramClient;
    const messageId = parseInt(req.params.messageId);

    if (isNaN(messageId)) {
      return res.status(400).json({ success: false, error: "Invalid message ID." });
    }

    const messages = await client.getMessages("me", {
      ids: [messageId],
    });

    if (!messages || messages.length === 0 || !messages[0].media) {
      return res.status(404).json({ success: false, error: "Media not found." });
    }

    const msg = messages[0];
    const contentType = contentTypeFromMessage(msg);
    const fileName = fileNameFromMessage(msg);
    const size = fileSizeFromMessage(msg);

    res.set("Content-Type", contentType);
    res.set("Accept-Ranges", "bytes");
    res.set("Cache-Control", "private, max-age=86400");
    res.set("Content-Disposition", `inline; filename="${safeContentDispositionName(fileName)}"`);

    // Telegram documents have a reliable size and can be streamed in bounded
    // chunks. Range responses make browser video/audio/PDF preview and seeking work.
    if (msg.media.document && size > 0) {
      const rangeMatch = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range || "");
      let start = 0;
      let end = size - 1;

      if (rangeMatch) {
        if (!rangeMatch[1] && rangeMatch[2]) {
          const suffixLength = Math.min(Number(rangeMatch[2]), size);
          start = size - suffixLength;
        } else {
          start = Number(rangeMatch[1] || 0);
          end = rangeMatch[2] ? Number(rangeMatch[2]) : end;
        }
        if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || start >= size || end < start) {
          res.set("Content-Range", `bytes */${size}`);
          return res.status(416).end();
        }
        end = Math.min(end, size - 1);
        res.status(206);
        res.set("Content-Range", `bytes ${start}-${end}/${size}`);
      }

      const contentLength = end - start + 1;
      res.set("Content-Length", String(contentLength));
      if (req.method === "HEAD") return res.end();

      const chunkSize = 512 * 1024;
      const iterator = client.iterDownload({
        file: msg.media,
        offset: bigInt(start),
        limit: Math.ceil(contentLength / chunkSize),
        chunkSize,
        requestSize: chunkSize,
        fileSize: bigInt(size),
        msgData: ["me", messageId],
      });
      let remaining = contentLength;
      let closed = false;
      res.once("close", () => { closed = true; });

      try {
        for await (const chunk of iterator) {
          if (closed || remaining <= 0) break;
          const output = chunk.length > remaining ? chunk.subarray(0, remaining) : chunk;
          remaining -= output.length;
          if (!res.write(output)) await waitForDrain(res);
        }
      } finally {
        await iterator.close();
      }
      if (!closed) res.end();
      return;
    }

    // Telegram photo messages do not expose the same document size metadata.
    const buffer = await client.downloadMedia(msg.media);
    if (!buffer) return res.status(404).json({ success: false, error: "File not available." });
    res.set("Content-Length", String(buffer.length));
    return res.send(Buffer.from(buffer));

  } catch (err) {
    console.error("Download error:", err.message);
    if (res.headersSent) {
      res.destroy();
      return;
    }
    return res.status(500).json({
      success: false,
      error: "Failed to download file.",
    });
  }
});

// ==================================================
// DELETE FILE (PERMANENT)
// ==================================================
// Permanently deletes a message from Saved Messages.
// This is IRREVERSIBLE — the file cannot be recovered.
// ==================================================

router.delete("/:messageId", requireSession, async (req, res) => {
  try {
    const client = req.telegramClient;
    const messageId = parseInt(req.params.messageId);

    if (isNaN(messageId)) {
      return res.status(400).json({ success: false, error: "Invalid message ID." });
    }

    // Delete the message from Saved Messages
    await client.deleteMessages("me", [messageId], { revoke: true });

    return res.json({
      success: true,
      deletedMessageId: messageId,
    });
  } catch (err) {
    console.error("Delete error:", err.message);
    return res.status(500).json({
      success: false,
      error: "Failed to delete file.",
    });
  }
});

export default router;
