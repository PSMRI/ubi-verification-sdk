const axios = require("axios");
const VerifierInterface = require("../VerifierInterface");

// Private title - if not set, will use filename
const _title = "dhiway"; // Set to custom title if needed, e.g., "Dhiway Verification Service"

class DhiwayVerifier extends VerifierInterface {
  constructor(config = {}) {
    super(config, __filename);
    // Set title if _title is defined
    if (_title) {
      this.setTitle(_title);
    }
    this.apiEndpoint = process.env.DHIWAY_VERIFIER_VERIFICATION_API;
    this.apiToken = process.env.DHIWAY_VERIFIER_VERIFICATION_API_TOKEN;
    this.expiryField = process.env.DHIWAY_VERIFIER_EXPIRY_FIELD || "validUntil";
    if (!this.apiEndpoint) {
      throw new Error(
        "DHIWAY_VERIFIER_VERIFICATION_API environment variable is not set."
      );
    }
    if (!this.apiToken) {
      throw new Error(
        "DHIWAY_VERIFIER_VERIFICATION_API_TOKEN environment variable is not set."
      );
    }
  }

  errorTranslator = {
    "Failed to verify CordProof2024":
      "The credential's authenticity couldn't be verified. It may be expired, revoked, altered, or issued by an untrusted source.",
    "Error verifyDisclosedAttributes":
      "Some information in the credential couldn't be verified. Please ensure the credential is complete and hasn't been modified.",
    "Unknown error in check":
      "An unexpected issue occurred during credential verification. Please try again later.",
  };

  checkExpiry(credential) {
    try {
      // Check if credential has the required structure
      if (!credential) {
        return {
          isValid: false,
          error: "Invalid credential structure: missing credentialSubject",
        };
      }

      const validUpto = credential[this.expiryField];

      // If expiry field is not present, skip expiry check and proceed with verification
      if (!validUpto) {
        return {
          isValid: true,
        };
      }

      // Parse the validupto value as a Date object
      const expiryDate = new Date(validUpto);

      // Check if the parsed date is valid
      if (isNaN(expiryDate.getTime())) {
        return {
          isValid: false,
          error: "Invalid validupto date format",
        };
      }

      const currentDate = new Date();

      // Check if the credential is expired
      if (currentDate > expiryDate) {
        return {
          isValid: false,
          error: "The credential has expired and is no longer valid.",
        };
      }

      return {
        isValid: true,
      };
    } catch (error) {
      return {
        isValid: false,
        error: "Error checking credential expiry: " + error.message,
      };
    }
  }

  translateResponse(response) {
    const error = response?.data?.error;
    let formattedErrors = [];
    if (error && (Array.isArray(error) ? error.length > 0 : true)) {
      const pushError = (errObj) => ({
        error:
          this.errorTranslator[errObj.message] ||
          "An unknown error occurred during verification.",
        raw: errObj.message || "An unknown error occurred",
      });
      if (Array.isArray(error)) {
        formattedErrors = error.map(pushError);
      } else {
        formattedErrors = [pushError(error)];
      }
    }

    if (formattedErrors.length > 0) {
      return {
        success: false,
        message: "Credential verification failed.",
        errors: formattedErrors,
      };
    }

    return {
      success: true,
      message: "Credential verified successfully.",
    };
  }

  async verify(credential) {
    try {
      // Check for VC expiry before proceeding with verification
      const expiryCheck = this.checkExpiry(credential);

      if (!expiryCheck.isValid) {
        return {
          success: false,
          message: "Credential verification failed.",
          errors: [
            {
              error: expiryCheck.error,
              raw: "VC expiration check failed",
            },
          ],
        };
      }

      const response = await axios.post(this.apiEndpoint, credential, {
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          "Content-Type": "application/json",
        },
      });
      return this.translateResponse(response);
    } catch (error) {
      return {
        success: false,
        message: "Verification API error",
        errors: [
          {
            error: error.message,
            raw: error.message,
          },
        ],
      };
    }
  }
}

module.exports = DhiwayVerifier;
