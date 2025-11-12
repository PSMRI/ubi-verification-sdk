const fastify = require('fastify')({ logger: true, bodyLimit: 50 * 1024 * 1024 }); // 50 MB
const cors = require('@fastify/cors');
const swagger = require('@fastify/swagger');
const swaggerUI = require('@fastify/swagger-ui');
const path = require('path');
const verificationService = require('./services/verificationService');
const { getAllIssuers, getIssuersByType } = require('./config/issuers');
require('dotenv').config();
const PORT = process.env.PORT || 3010;
const HOST = process.env.HOST || '0.0.0.0';

// Register plugins
fastify.register(cors, {
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE']
});

fastify.register(swagger, {
  mode: 'static',
  specification: {
    path: path.join(__dirname, 'config', 'swagger.yaml'),
    postProcessor: function (swaggerObject) {
      return swaggerObject;
    }
  },
  swagger: {
    allowUnionTypes: true
  }
});

fastify.register(swaggerUI, {
  routePrefix: '/documentation',
  uiConfig: {
    docExpansion: 'list',
    deepLinking: false
  },
  staticCSP: true,
  transformStaticCSP: (header) => header
});

// Health check route
fastify.get('/health', {
  schema: {
    tags: ['System'],
    summary: 'Health check endpoint',
    description: 'Returns the health status of the API',
    response: {
      200: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['ok'],
            description: 'Health status'
          }
        }
      }
    }
  }
}, async (request, reply) => {
  return { status: 'ok' };
});

// Get all issuers endpoint
fastify.get('/issuers', {
  schema: {
    tags: ['Issuers'],
    summary: 'Get list of available issuers',
    description: 'Returns a list of all credential issuers supported by the verification SDK',
    querystring: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['online', 'offline'],
          description: 'Filter issuers by type (optional)'
        }
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: {
            type: 'boolean',
            description: 'Request success status'
          },
          count: {
            type: 'integer',
            description: 'Number of issuers returned'
          },
          data: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: {
                  type: 'string',
                  description: 'Unique identifier for the issuer'
                },
                name: {
                  type: 'string',
                  description: 'Display name of the issuer'
                },
                type: {
                  type: 'string',
                  enum: ['online', 'offline'],
                  description: 'Verification type'
                },
                description: {
                  type: 'string',
                  description: 'Description of the issuer'
                }
              },
              required: ['id', 'name', 'type']
            }
          }
        }
      }
    }
  }
}, async (request, reply) => {
  try {
    const { type } = request.query;
    
    let issuers;
    if (type) {
      issuers = getIssuersByType(type);
    } else {
      issuers = getAllIssuers();
    }
    
    return {
      success: true,
      count: issuers.length,
      data: issuers
    };
  } catch (error) {
    fastify.log.error(error);
    reply.code(500).send({ 
      success: false,
      error: error.message 
    });
  }
});

// Main verification endpoint
fastify.post('/verification', {
  schema: {
    tags: ['Verification'],
    summary: 'Verify beneficiary credentials',
    description: 'Verify if beneficiary credentials are valid and check eligibility for benefits',
    body: {
      type: 'object',
      required: ['credential', 'config'],
      properties: {
        credential: {
          type: 'object',
          description: 'The credential JSON to be verified'
        },
        config: {
          type: 'object',
          required: ['method'],
          description: 'Verification configuration',
          properties: {
            method: { type: 'string', description: 'Verification method (e.g. online)' },
            issuerName: { type: 'string', description: 'Name of the verifier (e.g. dhiway)' }
          },
          anyOf: [
            {
              properties: {
                method: { not: { const: "online" } },
              },
            },
            {
              properties: {
                method: { const: "online" },
              },
              required: ["issuerName"],
            },
          ]
        }
      }
    },
    response: {
      200: {
        type: 'object',
        properties: {
          success: { type: 'boolean' },
          message: { type: 'string' },
          errors: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                error: { type: 'string' },
                raw: { type: 'string' }
              }
            }
          }
        },
        required: ['success', 'message'],
        additionalProperties: false
      },
      400: {
        type: 'object',
        properties: {
          error: { type: 'string' }
        }
      }
    }
  }
}, async (request, reply) => {
  try {
    const payload = request.body;
console.log("-------------------------------- PAYLOAD -------------------------------- ",payload);
    if (!payload.credential || typeof payload.credential !== 'object' || Object.keys(payload.credential).length === 0) {
      reply.code(400).send({ error: 'Missing or empty required parameter: credential' });
      return;
    }

    if (!payload.config) {
      reply.code(400).send({ error: 'Missing required parameter: config' });
      return;
    }

    let results;
    try {
      results = await verificationService.verify(payload);
    } catch (error) {
      reply.code(400).send({ error: error.message });
      return;
    }

    // If verification failed and errors array is missing, return the error directly
    if (results && results.success === false && !Array.isArray(results.errors)) {
      reply.code(400).send({ error: results.message || 'Verification failed' });
      return;
    }

    let verificationOutcome;
    try {
      verificationOutcome = validateVerificationResult(results);
    } catch (error) {
      reply.code(400).send({ error: error.message });
      return;
    }
    return verificationOutcome;
  } catch (error) {
    fastify.log.error(error);
    reply.code(400).send({ error: error.message });
  }
});

fastify.setErrorHandler((error, request, reply) => {
  if (error.validation) {
    // Fastify validation error
    const missing = error.validation.map(v => v.message).join(', ');
    reply.status(400).send({ error: `Validation error: ${missing}` });
  } else {
    reply.status(error.statusCode || 500).send({ error: error.message });
  }
});

// Start server
const start = async () => {
  try {
    await fastify.ready();
    await fastify.listen({ port: PORT, host: HOST });
    fastify.log.info(`Server is running on ${fastify.server.address().port}`);
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();

function validateVerificationResult(result) {
  if (typeof result !== 'object' || result === null) {
    throw new Error('Invalid verification result: not an object');
  }

  if (typeof result.success !== 'boolean') {
    throw new Error('Invalid verification result: missing "success" boolean');
  }

  if (typeof result.message !== 'string') {
    throw new Error('Invalid verification result: missing "message"');
  }

  if (!result.success && !Array.isArray(result.errors)) {
    throw new Error('Invalid verification result: failed result must include "errors" array');
  }

  return result;
}
