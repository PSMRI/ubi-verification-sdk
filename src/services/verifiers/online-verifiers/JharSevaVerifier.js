const axios = require("axios");
const VerifierInterface = require("../VerifierInterface");

// Private title - if not set, will use filename
const _title = "jharseva"; // Set to custom title if needed, e.g., "JharSeva Verification Service"

//TODO: Implement the JharSeva verifier
/**
 * JharSevaVerifier - Online verifier for JharSeva credentials
 *
 * This verifier follows the SDK's modular architecture pattern.
 * It extends VerifierInterface and implements the verify(credential) method
 * to integrate with the JharSeva verification API.
 *
 * Configuration:
 * - Required environment variables:
 *   - JHARSEVA_VERIFICATION_API: API endpoint URL
 *   - JHARSEVA_VERIFICATION_API_TOKEN: Bearer token for authentication
 *   - JHARSEVA_EXPIRY_FIELD: Field name for expiry check (optional, defaults to "validUntil")
 *
 *
 * @extends VerifierInterface
 */
class JharSevaVerifier extends VerifierInterface {
  constructor(config = {}, t) {
    super(config, t);
    // Load configuration from environment variables
    this.apiEndpoint = process.env.JHARSEVA_VERIFICATION_API;
    this.apiToken = process.env.JHARSEVA_VERIFICATION_API_TOKEN;
    this.expiryField = process.env.JHARSEVA_EXPIRY_FIELD || "validUntil";
  }

  /**
   * Error translator for JharSeva-specific error messages
   * Converts technical error messages to user-friendly descriptions
   * @returns {Object} Error message mapping
   */
  getErrorTranslator() {
    return {
      "Invalid credential": this.t('jharseva.errors.invalidCredential'),
      "Verification failed": this.t('jharseva.errors.verificationFailed'),
      "Service unavailable": this.t('jharseva.errors.serviceUnavailable'),
      "Invalid signature": this.t('jharseva.errors.invalidSignature'),
      "Expired credential": this.t('jharseva.errors.expiredCredential'),
    };
  }

  /**
   * Check if credential has expired
   * Similar pattern to DhiwayVerifier for consistency
   *
   * @param {Object} credential - The credential to check
   * @returns {Object} Validation result with isValid flag and optional error message
   */
  checkExpiry(credential) {
    try {
      // Check if credential exists
      if (!credential) {
        return {
          isValid: false,
          error: this.t('credential.invalidStructure')
        };
      }

      const validUpto = credential[this.expiryField];

      // If expiry field is not present, skip expiry check
      if (!validUpto) {
        return {
          isValid: true,
        };
      }

      // Parse the expiry date
      const expiryDate = new Date(validUpto);

      // Validate date format
      if (isNaN(expiryDate.getTime())) {
        return {
          isValid: false,
          error: this.t('credential.invalidExpiryFormat')
        };
      }

      const currentDate = new Date();

      // Check if expired
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

  /**
   * Translate API response to standardized format
   * Applies error translation for user-friendly messages
   *
   * @param {Object} response - Axios response object from JharSeva API
   * @returns {Object} Standardized verification result
   */
  translateResponse(response) {
    const error = response?.data?.error;
    const errorTranslator = this.getErrorTranslator();
    let formattedErrors = [];

    if (error && (Array.isArray(error) ? error.length > 0 : true)) {
      const pushError = (errObj) => ({
        error:
          errorTranslator[errObj.message] ||
          this.t('jharseva.errors.unknownErrorOccurred'),
        raw: errObj.message || this.t('jharseva.errors.unknownErrorRaw'),
      });

      if (Array.isArray(error)) {
        formattedErrors = error.map(pushError);
      } else {
        formattedErrors = [pushError(error)];
      }
    }

    // Return failure response if errors exist
    if (formattedErrors.length > 0) {
      return {
        success: false,
        message: this.t('verification.failed'),
        errors: formattedErrors,
      };
    }

    // Return success response
    return {
      success: true,
      message: this.t('verification.success'),
    };
  }

  /**
   * Verify a credential using the JharSeva verification API
   * Main entry point called by VerificationService
   *
   * @param {Object} credential - The credential to verify
   * @returns {Promise<Object>} Verification result
   *   - success: boolean indicating verification result
   *   - message: human-readable message
   *   - errors: array of error objects (only if success is false)
   */
  async verify(credential) {
    console.log("JharSeva verifier called");
    try {
      // Step 1: Check credential expiry before making API call
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

      // Step 2: If endpoints are not configured, return success response (same as Dhiway behavior)
      if (!this.apiEndpoint || !this.apiToken) {
        return {
          success: true,
          message: this.t('verification.success'),
        };
      }

      // Step 3: Make API call to JharSeva verification endpoint
      const response = await axios.post(this.apiEndpoint, credential, {
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          "Content-Type": "application/json",
        },
      });

      // Step 4: Translate and return response
      return this.translateResponse(response);
    } catch (error) {
      // Handle API errors (network issues, timeouts, etc.)
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

module.exports = JharSevaVerifier;