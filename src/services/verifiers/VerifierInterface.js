const path = require("path");

class VerifierInterface {
  /**
   * @param {Object} config
   * @param {string} filename - Optional filename to derive title from
   */
  constructor(config = {}, filename = null) {
    this.config = config;
    // Private title property - can be overridden by subclasses
    this._title = null;
    // Store filename for fallback
    this._filename = filename;
  }

  /**
   * Get the title of the verifier
   * If title is not set, returns the current file name (without extension)
   * @returns {string} The title of the verifier
   */
  getTitle() {
    if (this._title) {
      return this._title;
    }
    // If title not set, derive from filename
    if (this._filename) {
      return path.basename(this._filename, ".js");
    }
    // Fallback: try to get from module
    if (require.main && require.main.filename) {
      return path.basename(require.main.filename, ".js");
    }
    return "UnknownVerifier";
  }

  /**
   * Set the title of the verifier
   * @param {string} title - The title to set
   */
  setTitle(title) {
    this._title = title;
  }

  /**
   * Verifies a credential.
   * Should return:
   *   On success:
   *     { success: true, message: "Credential verified successfully." }
   *   On failure:
   *     { success: false, message: "...", errors: [{ error: "...", raw: "..." }] }
   * @param {Object} credential
   * @returns {Promise<Object>}
   */
  async verify(credential) {
    throw new Error("verify() must be implemented by subclass");
  }
}

module.exports = VerifierInterface;
