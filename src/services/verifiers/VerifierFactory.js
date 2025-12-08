const SignatureVerifier = require('./offline-verifier/SignatureVerifier');

class VerifierFactory {
  /**
   * Returns the appropriate Verifier based on config.
   * @param {Object} config - includes issuerName and other config
   * @param {Function} t - Translation function
   */
  static getVerifier(config = {}, t) {
    const { method = 'online', issuerName } = config;

    if (method === 'online') {
      if (!issuerName) {
        throw new Error('issuerName is required for online verification');
      }
      try {
        // Validate issuerName
        if (!/^[a-zA-Z]+$/.test(issuerName)) {
          throw new Error('Invalid verifier name format');
        }
        // Capitalize first letter and append 'Verifier'
        const className = issuerName.charAt(0).toUpperCase() + issuerName.slice(1) + 'Verifier';
        // Dynamically require the verifier class
        const VerifierClass = require(`./online-verifiers/${className}`);
        return new VerifierClass(config, t);
      } catch (err) {
        if (process.env.NODE_ENV !== 'production') {
          console.error(`Error loading verifier: ${err.message}`);
        }
        throw new Error(`Unknown online verifier: ${issuerName}`);
      }
    } else if (method === 'offline') {
      // For offline, default to SignatureVerifier or extend as needed
      return new SignatureVerifier(config, t);
    } else {
      throw new Error(`Unknown verification method: ${method}`);
    }
  }
}

module.exports = VerifierFactory;
