const SignatureVerifier = require("./offline-verifier/SignatureVerifier");
const fs = require("fs");
const path = require("path");

class VerifierFactory {
  /**
   * Returns the appropriate Verifier based on config.
   * @param {Object} config - includes issuerName and other config
   */
  static getVerifier(config = {}) {
    const { method = "online", issuerName } = config;

    if (method === "online") {
      if (!issuerName) {
        throw new Error("issuerName is required for online verification");
      }
      try {
        // Validate issuerName
        if (!/^[a-zA-Z]+$/.test(issuerName)) {
          throw new Error("Invalid verifier name format");
        }

        // Dynamically find the verifier file by scanning the directory
        const verifiersDir = path.join(__dirname, "online-verifiers");
        const files = fs.readdirSync(verifiersDir);

        // Normalize issuerName for comparison (remove special chars, lowercase)
        const normalizedIssuerName = issuerName.toLowerCase();

        // Find matching verifier file (case-insensitive match on the base name)
        const matchingFile = files.find((file) => {
          // Remove .js extension and 'Verifier' suffix, then compare
          const baseName = file
            .replace(/\.js$/i, "")
            .replace(/verifier$/i, "")
            .toLowerCase();
          return baseName === normalizedIssuerName;
        });

        if (!matchingFile) {
          throw new Error(`No verifier file found for issuer: ${issuerName}`);
        }

        // Remove .js extension to get the class name
        const className = matchingFile.replace(/\.js$/, "");

        // Dynamically require the verifier class
        const VerifierClass = require(`./online-verifiers/${className}`);
        return new VerifierClass(config);
      } catch (err) {
        if (process.env.NODE_ENV !== "production") {
          console.error(`Error loading verifier: ${err.message}`);
        }
        throw new Error(`Unknown online verifier: ${issuerName}`);
      }
    } else if (method === "offline") {
      // For offline, default to SignatureVerifier or extend as needed
      return new SignatureVerifier(config);
    } else {
      throw new Error(`Unknown verification method: ${method}`);
    }
  }
}

module.exports = VerifierFactory;
