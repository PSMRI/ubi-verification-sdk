const VerifierInterface = require("../VerifierInterface");
// private
class SignatureVerifier extends VerifierInterface {
  async verify(credential) {
    // Stubbed logic, replace with real signature verification logic
    const isValid = false;

    if (isValid) {
      return {
        success: true,
        message: "Credential verified using signature.",
      };
    } else {
      return {
        success: false,
        message: "Credential verification using signature failed.",
      };
    }
  }
}

module.exports = SignatureVerifier;
