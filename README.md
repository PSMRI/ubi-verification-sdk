# UBI Verification SDK (Node.js Library)

A lightweight, extensible Node.js library for credential verification, designed for easy integration and expansion.

## Features

- Supports multiple verification methods (currently "online"; "offline" can be added)
- Modular architecture: add new providers by implementing a class
- Built with Fastify for high performance and scalability
- Easily configurable for various use cases

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

## API Reference

### `/verification` Endpoint

#### Description

Verifies a credential using the specified method and provider.  
Currently, the SDK supports "online" verification for Verifiable Credentials (VC) using the "dhiway" provider.  
To add new providers, implement a new class and integrate it with the verification service.

#### Request Body

- **`credential`** (`object`, required):  
  The credential JSON to be verified.

- **`config`** (`object`, required):  
  Configuration object for verification.  
  - **`method`** (`string`, required):  
    The verification method to use.  
    - `"online"`: Verifies using a named online verifier (requires `verifierName`).
    - `"offline"`: (To be implemented by adding an offline verifier class)
  - **`verifierName`** (`string`, required if `method` is `"online"`):  
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
    "verifierName": "dhiway"
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
const axios = require('axios');

const VERIFY_ENDPOINT = 'http://localhost:{{PORT}}/verification'; // Replace {{PORT}} with your server port

const credential = {
  // Your credential JSON here
};

const config = {
  // For method: 'online', you must also provide verifierName, e.g.:
  method: 'online',
  verifierName: 'dhiway'
};

async function verifyCredential() {
  try {
    const response = await axios.post(VERIFY_ENDPOINT, {
      credential,
      config,
    });
    console.log('✅ Verification Result:', response.data);
  } catch (error) {
    console.error('❌ Verification Failed:', error.response?.data || error.message);
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
  Factory class that selects and instantiates the correct verifier based on the `config` (e.g., `method` and `verifierName`).

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

3. **Update Configuration:**
   - To use your verifier, set `method` and `verifierName` in the request config:
     ```json
     {
       "credential": { /* ... */ },
       "config": {
         "method": "online",
         "verifierName": "acme"
       }
     }
     ```
   - The factory will automatically load your verifier if the naming matches.

4. **(Optional) Add Error Translation:**
   - For online verifiers, you can add custom error translation logic as shown in [`DhiwayVerifier.js`](src/services/verifiers/online-verifiers/DhiwayVerifier.js).

### Example: Adding a New Online Verifier

1. Create `src/services/verifiers/online-verifiers/AcmeVerifier.js`:
   ```js
   const VerifierInterface = require('../VerifierInterface');
   class AcmeVerifier extends VerifierInterface {
     async verify(credential) {
       // Your verification logic here
       return { success: true, message: 'Verified by Acme.' };
     }
   }
   module.exports = AcmeVerifier;
   ```

2. Use it in your API request:
   ```json
   {
     "credential": { /* ... */ },
     "config": {
       "method": "online",
       "verifierName": "acme"
     }
   }
   ```

---

**Tip:**
No changes to the factory or service are needed if you follow the naming and folder conventions.

For more details, see the code in [`src/services`](src/services).

---

> **Note:**
> This SDK is designed to enable interoperable, extensible, and standards-based credential verification.  
> To support new providers or offline verification, simply add a new class implementing the required logic and register it with the verification service.
