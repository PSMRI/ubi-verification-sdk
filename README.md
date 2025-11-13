# UBI Verification SDK (Node.js Library)

A lightweight, extensible Node.js library for credential verification, designed for easy integration and expansion.

## Features

- Supports multiple verification methods (currently "online"; "offline" can be added)
- Modular architecture: add new verifiers by implementing a class
- Built with Fastify for high performance and scalability
- Easily configurable for various use cases

## Documentation

Visit the following links hosted with Gitbook for detailed documentation on the UBI Verification SDK:

- [Verification SDK Overview](https://piramal-swasthya.gitbook.io/uba/toasters/verification-sdk)
- [Prerequisites](https://piramal-swasthya.gitbook.io/uba/toasters/verification-sdk/prerequisites)
- [Environment Variables](https://piramal-swasthya.gitbook.io/uba/toasters/verification-sdk/environment-variables)
- [Build and Run Guide](https://piramal-swasthya.gitbook.io/uba/toasters/verification-sdk/build-and-run-guide)

## Running the Server

To start the server, run:

```bash
node src/index.js
```

The server will be available at `http://localhost:{{PORT}}`, where `PORT` is taken from your environment variables (`.env`).  
If `PORT` is not set, it defaults to `3000`. For example, if you set `PORT=3010` in your `.env`, the server will run on `http://localhost:3010`.

## API Documentation

Interactive API docs are available at:  
[http://localhost:{{PORT}}/documentation](http://localhost:{{PORT}}/documentation)

## Health Check

You can check the health of the API by accessing the `/health` endpoint:

```bash
curl http://localhost:{{PORT}}/health
```

Response:

```json
{
  "status": "ok"
}
```

## Get Available Issuers

You can fetch the list of all supported issuers by accessing the `/issuers` endpoint. The SDK **automatically discovers** all available verifiers by reading the verifier files from the `online-verifiers` and `offline-verifier` directories.

```bash
curl http://localhost:{{PORT}}/issuers
```

Response:

```json
{
  "success": true,
  "count": 3,
  "data": [
    {
      "id": "dhiway",
      "name": "Dhiway",
      "type": "online",
      "description": "Dhiway credential verification"
    },
    {
      "id": "jharseva",
      "name": "JharSeva",
      "type": "online",
      "description": "JharSeva credential verification"
    },
    {
      "id": "signature",
      "name": "Signature",
      "type": "offline",
      "description": "Signature credential verification"
    }
  ]
}
```

### Filter by Type

You can filter issuers by type (online or offline):

```bash
# Get only online verifiers
curl http://localhost:{{PORT}}/issuers?type=online

# Get only offline verifiers
curl http://localhost:{{PORT}}/issuers?type=offline
```

### How Issuers are Discovered

The `/issuers` endpoint dynamically scans the following directories:

- `src/services/verifiers/online-verifiers/` - for online verifiers
- `src/services/verifiers/offline-verifier/` - for offline verifiers

Any file ending with `Verifier.js` is automatically detected and added to the issuers list:

- **File name**: `DhiwayVerifier.js` → **Issuer ID**: `dhiway`, **Display Name**: `Dhiway`
- **File name**: `JharSevaVerifier.js` → **Issuer ID**: `jharseva`, **Display Name**: `JharSeva`

This means when you add a new verifier file, it will automatically appear in the issuers list without any additional configuration!

## API Reference

### `/verification` Endpoint

#### Description

Verifies a credential using the specified method and verifier.
Currently, the SDK supports "online" verification for Verifiable Credentials (VC) using the "dhiway" verifier.
To add new verifiers, implement a new class and integrate it with the verification service.

#### Request Body

- **`credential`** (`object`, required):  
  The credential JSON to be verified.

- **`config`** (`object`, required):  
  Configuration object for verification.
  - **`method`** (`string`, required):  
    The verification method to use.
    - `"online"`: Verifies using a named online verifier (requires `issuerName`).
    - `"offline"`: (To be implemented by adding an offline verifier class)
  - **`issuerName`** (`string`, required if `method` is `"online"`):  
    Name of the verifier to use (currently supports `"dhiway"`).

#### Example Request

```json
{
  "credential": {
    "id": "12345",
    "type": "VerifiableCredential",
    "issuer": "https://example.com",
    "credentialSubject": {
      "id": "did:example:123",
      "name": "John Doe"
    }
  },
  "config": {
    "method": "online",
    "issuerName": "dhiway"
  }
}
```

#### Example Response (Success)

```json
{
  "success": true,
  "message": "Credential verified successfully."
}
```

#### Example Response (Failure)

```json
{
  "success": false,
  "message": "Credential verification failed.",
  "errors": [
    {
      "error": "Some information in the credential couldn't be verified. Please ensure the credential is complete and hasn't been modified.",
      "raw": "Error verifyDisclosedAttributes"
    }
  ]
}
```

#### Error Response (Bad Request)

```json
{
  "error": "Missing or empty required parameter: credential"
}
```

## Usage

### Example

```javascript
const axios = require("axios");

const VERIFY_ENDPOINT = "http://localhost:{{PORT}}/verification"; // Replace {{PORT}} with your server port

const credential = {
  // Your credential JSON here
};

const config = {
  // For method: 'online', you must also provide issuerName, e.g.:
  method: "online",
  issuerName: "dhiway",
};

async function verifyCredential() {
  try {
    const response = await axios.post(VERIFY_ENDPOINT, {
      credential,
      config,
    });
    console.log("✅ Verification Result:", response.data);
  } catch (error) {
    console.error(
      "❌ Verification Failed:",
      error.response?.data || error.message
    );
  }
}

verifyCredential();
```

## Developer Guide

### Architecture Overview

The SDK uses a modular, extensible architecture for credential verification, centered around the [`src/services`](src/services) directory:

- **[`verificationService.js`](src/services/verificationService.js):**
  Main entry point for verification logic. It receives the payload, selects the appropriate verifier, and returns the result.

- **[`verifiers/VerifierFactory.js`](src/services/verifiers/VerifierFactory.js):**
  Factory class that selects and instantiates the correct verifier based on the `config` (e.g., `method` and `issuerName`).

- **[`verifiers/VerifierInterface.js`](src/services/verifiers/VerifierInterface.js):**
  Abstract base class. All verifiers must extend this and implement the `verify(credential)` method.

- **Online Verifiers:**
  Implemented in [`verifiers/online-verifiers/`](src/services/verifiers/online-verifiers/).
  Example: [`DhiwayVerifier.js`](src/services/verifiers/online-verifiers/DhiwayVerifier.js)

- **Offline Verifiers:**
  Implemented in [`verifiers/offline-verifier/`](src/services/verifiers/offline-verifier/).
  Example: [`SignatureVerifier.js`](src/services/verifiers/offline-verifier/SignatureVerifier.js)

### How to Add a New Verifier

1. **Create a New Verifier Class:**

   - Extend [`VerifierInterface`](src/services/verifiers/VerifierInterface.js).
   - Implement the `verify(credential)` method with your logic.
   - Place your file in the appropriate folder (`online-verifiers` or `offline-verifier`).

2. **Naming Convention:**

   - Name your class as `<ProviderName>Verifier` (e.g., `AcmeVerifier`).
   - The filename should match the class name (e.g., `AcmeVerifier.js`).
   - **Important**: The file MUST end with `Verifier.js` to be automatically discovered.

3. **That's It! No Configuration Needed:**

   - Your new verifier will **automatically appear** in the `/issuers` endpoint.
   - The issuer ID is derived from the filename (e.g., `AcmeVerifier.js` → issuer ID: `acme`).
   - To use your verifier, set `method` and `issuerName` in the request config:
     ```json
     {
       "credential": {
         /* ... */
       },
       "config": {
         "method": "online",
         "issuerName": "acme"
       }
     }
     ```
   - **Note**: The `issuerName` is case-insensitive. You can use `"acme"`, `"Acme"`, or `"ACME"` - they all work!
   - The factory will automatically load your verifier based on the naming convention.

4. **(Optional) Add Error Translation:**
   - For online verifiers, you can add custom error translation logic as shown in [`DhiwayVerifier.js`](src/services/verifiers/online-verifiers/DhiwayVerifier.js).

### Example: Adding a New Online Verifier

1. Create `src/services/verifiers/online-verifiers/AcmeVerifier.js`:

   ```js
   const VerifierInterface = require("../VerifierInterface");
   class AcmeVerifier extends VerifierInterface {
     async verify(credential) {
       // Your verification logic here
       return { success: true, message: "Verified by Acme." };
     }
   }
   module.exports = AcmeVerifier;
   ```

2. Use it in your API request:

   ```json
   {
     "credential": {
       /* ... */
     },
     "config": {
       "method": "online",
       "issuerName": "acme"
     }
   }
   ```

   **Case-Insensitive**: All of these will work:

   ```json
   "issuerName": "acme"   // lowercase
   "issuerName": "Acme"   // capitalized
   "issuerName": "ACME"   // uppercase
   ```

---

**Tip:**
No changes to the factory or service are needed if you follow the naming and folder conventions.

For more details, see the code in [`src/services`](src/services).

---

> **Note:**
> This SDK is designed to enable interoperable, extensible, and standards-based credential verification.  
> To support new providers or offline verification, simply add a new class implementing the required logic and register it with the verification service.
