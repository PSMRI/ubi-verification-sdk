const axios = require("axios");
const VerifierInterface = require("../VerifierInterface");

// Private title - if not set, will use filename
const _title = "dhiway"; // Set to custom title if needed, e.g., "Dhiway Verification Service"

class DhiwayVerifier extends VerifierInterface {
  constructor(config = {}, t) {
    super(config, t);
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

  getErrorTranslator() {
    return {
      "Failed to verify CordProof2024": this.t('dhiway.errors.verifyFailed'),
      "Error verifyDisclosedAttributes": this.t('dhiway.errors.verifyDisclosedAttributes'),
      "Unknown error in check": this.t('dhiway.errors.unknownError'),
    };
  }

  checkExpiry(credential) {
    try {
      // Check if credential has the required structure
      if (!credential) {
        return {
          isValid: false,
          error: this.t('credential.invalidStructure')
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
          error: this.t('credential.invalidExpiryFormat')
        };
      }

      const currentDate = new Date();

      // Check if the credential is expired
      if (currentDate > expiryDate) {
        return {
          isValid: false,
          error: this.t('credential.expired')
        };
      }

      return {
        isValid: true,
      };
    } catch (error) {
      return {
        isValid: false,
        error: this.t('credential.expiryCheckError', { error: error.message })
      };
    }
  }

  translateResponse(response) {
    const error = response?.data?.error;
    const errorTranslator = this.getErrorTranslator();
    let formattedErrors = [];
    if (error && (Array.isArray(error) ? error.length > 0 : true)) {
      const pushError = (errObj) => ({
        error:
          errorTranslator[errObj.message] ||
          this.t('dhiway.errors.unknownErrorOccurred'),
        raw: errObj.message || this.t('dhiway.errors.unknownErrorRaw'),
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
        message: this.t('verification.failed'),
        errors: formattedErrors,
      };
    }

    return {
      success: true,
      message: this.t('verification.success'),
    };
  }

  async verify(credential) {
    try {
      // Check for VC expiry before proceeding with verification
      const expiryCheck = this.checkExpiry(credential);

      if (!expiryCheck.isValid) {
        return {
          success: false,
          message: this.t('verification.failed'),
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
        message: this.t('verification.apiError'),
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
