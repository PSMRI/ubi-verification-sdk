const VerifierFactory = require("./verifiers/VerifierFactory");

class VerificationService {
  /**
   * Main method to verify a credential using config and optional eligibility rules
   * @param {Object} payload - contains credential and config
   * @param {Function} t - Translation function
   */
  async verify(payload, t) {
    try {
      const { credential, config = {} } = payload;
      const verifier = VerifierFactory.getVerifier(config, t);
      const result = await verifier.verify(credential);
      console.log("Verification result:", result);
      return result;
    } catch (error) {
      const translator = t || (() => (key, replacements) => replacements?.message || key);
      return {
        success: false,
        message: translator('errors.genericError', { message: error.message }),
        error: error.message,
      };
    }
  }
}

module.exports = new VerificationService();
