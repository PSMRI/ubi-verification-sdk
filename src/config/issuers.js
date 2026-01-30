/**
 * Issuer Registry
 * Dynamically discovers issuers by reading verifier files from the file system
 */

const fs = require("fs");
const path = require("path");

/**
 * Convert verifier class name to issuer id
 * Example: "DhiwayVerifier" -> "dhiway"
 */
function verifierNameToIssuerId(fileName) {
  // Remove .js extension and "Verifier" suffix
  const name = fileName.replace(".js", "").replace("Verifier", "");
  // Convert to lowercase
  return name.toLowerCase();
}

/**
 * Convert verifier class name to display name
 * Example: "DhiwayVerifier" -> "Dhiway"
 */
function verifierNameToDisplayName(fileName) {
  // Remove .js extension and "Verifier" suffix
  return fileName.replace(".js", "").replace("Verifier", "");
}

/**
 * Discover all online verifiers from the online-verifiers directory
 */
function discoverOnlineVerifiers() {
  const onlineVerifiersPath = path.join(
    __dirname,
    "../services/verifiers/online-verifiers"
  );
  const issuers = [];

  try {
    const files = fs.readdirSync(onlineVerifiersPath);

    files.forEach((file) => {
      if (file.endsWith("Verifier.js")) {
        try {
          // Dynamically require and instantiate the verifier to get its title
          const VerifierClass = require(path.join(onlineVerifiersPath, file));
          const verifierInstance = new VerifierClass();

          // Get title from verifier instance (returns filename if not set)
          const title = verifierInstance.getTitle();
          const id = verifierNameToIssuerId(file);
          const filenameDerivedName = verifierNameToDisplayName(file);
          // Check if custom title is set by comparing with filename-derived title
          const filenameDerivedTitle = path.basename(file, ".js");
          // Use custom title for name if it differs from filename, otherwise use cleaner filename-derived name
          const displayName =
            title !== filenameDerivedTitle ? title : filenameDerivedName;

          issuers.push({
            id: id,
            name: displayName, // Use custom title if set, otherwise use filename-derived name
            title: title, // Use title from verifier instance (custom or filename-derived)
            type: "online",
            description: `${title} credential verification`,
          });
        } catch (error) {
          // Fallback: try to extract title from file if instantiation fails
          console.warn(
            `Warning: Could not instantiate verifier ${file}, attempting to extract title from file:`,
            error.message
          );
          const id = verifierNameToIssuerId(file);
          const filenameDerivedName = verifierNameToDisplayName(file);
          const filenameDerivedTitle = path.basename(file, ".js");
          let title = filenameDerivedTitle; // Default to filename-derived title

          // Try to extract _title constant from the file
          try {
            const filePath = path.join(onlineVerifiersPath, file);
            const fileContent = fs.readFileSync(filePath, "utf8");
            // Extract _title constant value using regex (handles both single and double quotes)
            const titleMatch = fileContent.match(
              /const\s+_title\s*=\s*["']([^"']+)["']/
            );
            if (titleMatch && titleMatch[1]) {
              title = titleMatch[1];
            }
          } catch (readError) {
            // If we can't read the file, use filename fallback
            console.warn(
              `Could not read file to extract title: ${readError.message}`
            );
          }

          // Use custom title for name if it differs from filename, otherwise use cleaner filename-derived name
          const displayName =
            title !== filenameDerivedTitle ? title : filenameDerivedName;

          issuers.push({
            id: id,
            name: displayName, // Use custom title if extracted, otherwise use filename-derived name
            title: title, // Use extracted title or filename-derived title
            type: "online",
            description: `${title} credential verification`,
          });
        }
      }
    });
  } catch (error) {
    console.error("Error discovering online verifiers:", error.message);
  }

  return issuers;
}

/**
 * Discover all offline verifiers from the offline-verifier directory
 */
function discoverOfflineVerifiers() {
  const offlineVerifiersPath = path.join(
    __dirname,
    "../services/verifiers/offline-verifier"
  );
  const issuers = [];

  try {
    const files = fs.readdirSync(offlineVerifiersPath);

    files.forEach((file) => {
      if (file.endsWith("Verifier.js")) {
        try {
          // Dynamically require and instantiate the verifier to get its title
          const VerifierClass = require(path.join(offlineVerifiersPath, file));
          const verifierInstance = new VerifierClass();

          // Get title from verifier instance (returns filename if not set)
          const title = verifierInstance.getTitle();
          const filenameDerivedName = verifierNameToDisplayName(file);
          // Check if custom title is set by comparing with filename-derived title
          const filenameDerivedTitle = path.basename(file, ".js");
          // Use custom title for name if it differs from filename, otherwise use cleaner filename-derived name
          const displayName =
            title !== filenameDerivedTitle ? title : filenameDerivedName;

          issuers.push({
            id: displayName.toLowerCase(),
            name: displayName, // Use custom title if set, otherwise use filename-derived name
            title: displayName, // Use title from verifier instance (custom or filename-derived)
            type: "offline",
            description: `${displayName} credential verification`,
          });
        } catch (error) {
          // Fallback: try to extract title from file if instantiation fails
          console.warn(
            `Warning: Could not instantiate verifier ${file}, attempting to extract title from file:`,
            error.message
          );
          const id = verifierNameToIssuerId(file);
          const filenameDerivedName = verifierNameToDisplayName(file);
          const filenameDerivedTitle = path.basename(file, ".js");
          let title = filenameDerivedTitle; // Default to filename-derived title

          // Try to extract _title constant from the file
          try {
            const filePath = path.join(offlineVerifiersPath, file);
            const fileContent = fs.readFileSync(filePath, "utf8");
            // Extract _title constant value using regex (handles both single and double quotes)
            const titleMatch = fileContent.match(
              /const\s+_title\s*=\s*["']([^"']+)["']/
            );
            if (titleMatch && titleMatch[1]) {
              title = titleMatch[1];
            }
          } catch (readError) {
            // If we can't read the file, use filename fallback
            console.warn(
              `Could not read file to extract title: ${readError.message}`
            );
          }

          // Use custom title for name if it differs from filename, otherwise use cleaner filename-derived name
          const displayName =
            title !== filenameDerivedTitle ? title : filenameDerivedName;

          issuers.push({
            id: displayName.toLowerCase(),
            name: displayName, // Use custom title if extracted, otherwise use filename-derived name
            title: title, // Use extracted title or filename-derived title
            type: "offline",
            description: `${title} credential verification`,
          });
        }
      }
    });
  } catch (error) {
    console.error("Error discovering offline verifiers:", error.message);
  }

  return issuers;
}

/**
 * Get all issuers (online + offline)
 */
function getAllIssuers() {
  const onlineIssuers = discoverOnlineVerifiers();
  const offlineIssuers = discoverOfflineVerifiers();
  return [...onlineIssuers, ...offlineIssuers];
}

module.exports = {
  /**
   * Get all issuers
   */
  getAllIssuers,

  /**
   * Get issuers by type (online/offline)
   * @param {string} type - 'online' or 'offline'
   */
  getIssuersByType(type) {
    if (type === "online") {
      return discoverOnlineVerifiers();
    } else if (type === "offline") {
      return discoverOfflineVerifiers();
    }
    return getAllIssuers();
  },

  /**
   * Get issuer by id
   * @param {string} id - issuer id
   */
  getIssuerById(id) {
    const allIssuers = getAllIssuers();
    return allIssuers.find((issuer) => issuer.id === id);
  },
};
