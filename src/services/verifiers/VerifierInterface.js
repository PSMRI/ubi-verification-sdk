const path = require("path");

class VerifierInterface {
  /**
   * @param {Object} config
   * @param {string} filename - Optional filename to derive title from
   * @param {Function} t - Translation function
   */
  constructor(config = {}, t) {
    this.config = config;
    this.t = t || (() => (key, replacements) => replacements?.message || key);
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
