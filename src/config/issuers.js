/**
 * Issuer Registry
 * Dynamically discovers issuers by reading verifier files from the file system
 */

const fs = require('fs');
const path = require('path');

/**
 * Convert verifier class name to issuer id
 * Example: "DhiwayVerifier" -> "dhiway"
 */
function verifierNameToIssuerId(fileName) {
  // Remove .js extension and "Verifier" suffix
  const name = fileName.replace('.js', '').replace('Verifier', '');
  // Convert to lowercase
  return name.toLowerCase();
}

/**
 * Convert verifier class name to display name
 * Example: "DhiwayVerifier" -> "Dhiway"
 */
function verifierNameToDisplayName(fileName) {
  // Remove .js extension and "Verifier" suffix
  return fileName.replace('.js', '').replace('Verifier', '');
}

/**
 * Discover all online verifiers from the online-verifiers directory
 */
function discoverOnlineVerifiers() {
  const onlineVerifiersPath = path.join(__dirname, '../services/verifiers/online-verifiers');
  const issuers = [];
  
  try {
    const files = fs.readdirSync(onlineVerifiersPath);
    
    files.forEach(file => {
      if (file.endsWith('Verifier.js')) {
        const id = verifierNameToIssuerId(file);
        const name = verifierNameToDisplayName(file);
        
        issuers.push({
          id: id,
          name: name,
          type: "online",
          description: `${name} credential verification`
        });
      }
    });
  } catch (error) {
    console.error('Error discovering online verifiers:', error.message);
  }
  
  return issuers;
}

/**
 * Discover all offline verifiers from the offline-verifier directory
 */
function discoverOfflineVerifiers() {
  const offlineVerifiersPath = path.join(__dirname, '../services/verifiers/offline-verifier');
  const issuers = [];
  
  try {
    const files = fs.readdirSync(offlineVerifiersPath);
    
    files.forEach(file => {
      if (file.endsWith('Verifier.js')) {
        const id = verifierNameToIssuerId(file);
        const name = verifierNameToDisplayName(file);
        
        issuers.push({
          id: id,
          name: name,
          type: "offline",
          description: `${name} credential verification`
        });
      }
    });
  } catch (error) {
    console.error('Error discovering offline verifiers:', error.message);
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
    if (type === 'online') {
      return discoverOnlineVerifiers();
    } else if (type === 'offline') {
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
    return allIssuers.find(issuer => issuer.id === id);
  }
};

