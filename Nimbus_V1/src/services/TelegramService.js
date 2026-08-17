// ==================================================
// TELEGRAM SERVICE — BACKEND API CLIENT
// ==================================================
// Delegates all Telegram communication to the backend.
// Sends only an opaque session token for identification.
//
// PUBLIC API:
//   Auth:    sendOtp, verifyOtp, verifyPassword, generateQrToken, checkQrSessionStatus
//   Profile: fetchProfileData, getAvatarUrl
//   Files:   fetchFiles, uploadFile, deleteFile, getThumbnailUrl
//   Storage: fetchStorageData
//   Meta:    fetchMetadata, saveMetadata
//   Session: logout
// ==================================================

const API_BASE = "/api";
const MAX_UPLOAD_SIZE = 2 * 1024 * 1024 * 1024;

class TelegramService {
  constructor() {
    this.sessionToken = sessionStorage.getItem("tg_session_token") || "";
  }

  // ==================================================
  // INTERNAL HELPERS
  // ==================================================

  async _request(method, path, body = null) {
    const headers = { "Content-Type": "application/json" };

    if (this.sessionToken) {
      headers["x-session-token"] = this.sessionToken;
    }

    const options = { method, headers };
    if (body && method !== "GET") {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE}${path}`, options);
    const data = await response.json();

    if (!response.ok && !data.success) {
      throw new Error(data.error || "Request failed.");
    }

    return data;
  }

  _saveToken(token) {
    this.sessionToken = token;
    sessionStorage.setItem("tg_session_token", token);
  }

  _clearToken() {
    this.sessionToken = "";
    sessionStorage.removeItem("tg_session_token");
  }

  // ==================================================
  // PHONE LOGIN FLOW
  // ==================================================

  async sendOtp(phone) {
    const data = await this._request("POST", "/auth/send-otp", { phone });
    if (data.sessionToken) {
      this._saveToken(data.sessionToken);
    }
    return data;
  }

  async verifyOtp(code) {
    const data = await this._request("POST", "/auth/verify-otp", { code });
    return { status: data.status };
  }

  async verifyPassword(password) {
    const data = await this._request("POST", "/auth/verify-password", { password });
    return { status: data.status };
  }

  // ==================================================
  // QR LOGIN FLOW
  // ==================================================

  async generateQrToken() {
    const data = await this._request("POST", "/auth/qr/generate");

    if (data.sessionToken) {
      this._saveToken(data.sessionToken);
    }

    if (data.status === "SUCCESS") {
      return { status: "SUCCESS" };
    }

    return {
      url: data.url,
      expires: data.expires,
    };
  }

  async checkQrSessionStatus() {
    const data = await this._request("POST", "/auth/qr/check");
    return { status: data.status };
  }

  // ==================================================
  // PROFILE DATA
  // ==================================================

  /**
   * Fetch user profile: name, username, hasAvatar flag.
   * @returns {{ name: string, title: string, hasAvatar: boolean }}
   */
  async fetchProfileData() {
    const data = await this._request("GET", "/user/profile");
    return {
      name: data.name,
      title: data.title,
      hasAvatar: data.hasAvatar || false,
    };
  }

  /**
   * Get the avatar URL for the current user.
   * Returns the URL string or null if no avatar.
   * @returns {string|null}
   */
  getAvatarUrl() {
    if (!this.sessionToken) return null;
    return `/api/user/avatar?token=${this.sessionToken}`;
  }

  // ==================================================
  // STORAGE DATA
  // ==================================================

  async fetchStorageData() {
    const data = await this._request("GET", "/user/storage");
    return {
      categories: data.categories,
      totalBytes: data.totalBytes,
      totalFormatted: data.totalFormatted,
    };
  }

  // ==================================================
  // FILE OPERATIONS
  // ==================================================

  async fetchFiles() {
    const data = await this._request("GET", "/files/list");
    if (!data.files) return [];

    return data.files.map(file => {
      if (file.thumbnail) {
        file.thumbnail = `${file.thumbnail}?token=${this.sessionToken}`;
      }
      file.url = `/api/files/download/${file.messageId}?token=${this.sessionToken}`;
      return file;
    });
  }

  async uploadFile(file, onProgress) {
    if (!file) throw new Error("No file provided.");
    if (file.size > MAX_UPLOAD_SIZE) {
      throw new Error("File exceeds the 2GB upload limit.");
    }

    const formData = new FormData();
    formData.append("file", file);

    const data = await new Promise((resolve, reject) => {
      const request = new XMLHttpRequest();
      request.open("POST", `${API_BASE}/files/upload`);
      if (this.sessionToken) request.setRequestHeader("x-session-token", this.sessionToken);

      request.upload.addEventListener("progress", (event) => {
        if (!event.lengthComputable || typeof onProgress !== "function") return;
        onProgress(Math.round((event.loaded / event.total) * 100), event.loaded, event.total);
      });

      request.addEventListener("load", () => {
        let payload;
        try {
          payload = JSON.parse(request.responseText || "{}");
        } catch {
          reject(new Error("Upload returned an invalid response."));
          return;
        }
        if (request.status < 200 || request.status >= 300 || !payload.success) {
          reject(new Error(payload.error || "Upload failed."));
          return;
        }
        resolve(payload);
      });
      request.addEventListener("error", () => reject(new Error("Network error during upload.")));
      request.addEventListener("abort", () => reject(new Error("Upload was cancelled.")));
      request.send(formData);
    });

    const uploadedFile = data.file;
    if (uploadedFile.thumbnail) {
      uploadedFile.thumbnail = `${uploadedFile.thumbnail}?token=${this.sessionToken}`;
    }
    uploadedFile.url = `/api/files/download/${uploadedFile.messageId}?token=${this.sessionToken}`;
    return uploadedFile;
  }

  /**
   * Permanently delete a file from Telegram Saved Messages.
   * This is IRREVERSIBLE.
   * @param {number} messageId
   */
  async deleteFile(messageId) {
    return this._request("DELETE", `/files/${messageId}`);
  }

  getThumbnailUrl(messageId) {
    return `/api/files/thumbnail/${messageId}?token=${this.sessionToken}`;
  }

  // ==================================================
  // METADATA (CROSS-DEVICE SYNC)
  // ==================================================

  /**
   * Fetch app metadata stored in Telegram Saved Messages.
   * Contains virtual folders, tags, favorites, trash state.
   * @returns {Object}
   */
  async fetchMetadata() {
    const data = await this._request("GET", "/meta");
    return data.metadata || {
      virtualFolders: [],
      tags: {},
      favorites: [],
      trash: {},
      version: 1,
    };
  }

  /**
   * Save app metadata to Telegram Saved Messages.
   * @param {Object} metadata
   */
  async saveMetadata(metadata) {
    return this._request("POST", "/meta", { metadata });
  }

  // ==================================================
  // SESSION MANAGEMENT
  // ==================================================

  async logout() {
    try {
      await this._request("POST", "/auth/logout");
    } catch {
      // Ignore errors during logout — clear client-side state regardless
    } finally {
      this._clearToken();
    }
  }
}

export { MAX_UPLOAD_SIZE };

// Export a single instance across all React routes
export default new TelegramService();
