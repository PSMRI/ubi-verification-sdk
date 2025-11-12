const axios = require("axios");
const VerifierInterface = require("../VerifierInterface");
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
  constructor() {
    super();
    // Load configuration from environment variables
    this.apiEndpoint = process.env.JHARSEVA_VERIFICATION_API;
    this.apiToken = process.env.JHARSEVA_VERIFICATION_API_TOKEN;
    this.expiryField = process.env.JHARSEVA_EXPIRY_FIELD || "validUntil";

    // Validate required configuration
    if (!this.apiEndpoint) {
      throw new Error(
        "JHARSEVA_VERIFICATION_API environment variable is not set."
      );
    }
    if (!this.apiToken) {
      throw new Error(
        "JHARSEVA_VERIFICATION_API_TOKEN environment variable is not set."
      );
    }
  }

  /**
   * Error translator for JharSeva-specific error messages
   * Converts technical error messages to user-friendly descriptions
   */
  errorTranslator = {
    "Invalid credential": "The credential format is invalid or incomplete.",
    "Verification failed":
      "The credential could not be verified. Please ensure it is valid and not expired.",
    "Service unavailable":
      "The JharSeva verification service is temporarily unavailable. Please try again later.",
    "Invalid signature":
      "The credential's signature is invalid or has been tampered with.",
    "Expired credential": "The credential has expired and is no longer valid.",
  };

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
          error: "Invalid credential structure: missing credential data",
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
          error: "Invalid expiry date format",
        };
      }

      const currentDate = new Date();

      // Check if expired
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

  /**
   * Translate API response to standardized format
   * Applies error translation for user-friendly messages
   *
   * @param {Object} response - Axios response object from JharSeva API
   * @returns {Object} Standardized verification result
   */
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

    // Return failure response if errors exist
    if (formattedErrors.length > 0) {
      return {
        success: false,
        message: "Credential verification failed.",
        errors: formattedErrors,
      };
    }

    // Return success response
    return {
      success: true,
      message: "Credential verified successfully.",
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
    try {
      // Step 1: Check credential expiry before making API call
      const expiryCheck = this.checkExpiry(credential);

      if (!expiryCheck.isValid) {
        return {
          success: false,
          message: "Credential verification failed.",
          errors: [
            {
              error: expiryCheck.error,
              raw: "Credential expiration check failed",
            },
          ],
        };
      }

      // Step 2: Make API call to JharSeva verification endpoint
      const response = await axios.post(this.apiEndpoint, credential, {
        headers: {
          Authorization: `Bearer ${this.apiToken}`,
          "Content-Type": "application/json",
        },
      });

      // Step 3: Translate and return response
      return this.translateResponse(response);
    } catch (error) {
      // Handle API errors (network issues, timeouts, etc.)
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

module.exports = JharSevaVerifier;
