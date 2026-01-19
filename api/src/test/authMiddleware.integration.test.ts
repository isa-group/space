/**
 * Integration tests for API Key Authentication System
 * 
 * These tests demonstrate how to test the authentication and permission middlewares
 */

import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import request from 'supertest';
import express, { Express } from 'express';
import { authenticateApiKeyMiddleware } from '../main/middlewares/AuthMiddleware';

// Mock data
const mockUserApiKey = 'user_test_admin_key_123';
const mockOrgApiKey = 'org_test_org_key_456';

const mockUser = {
  id: '1',
  username: 'testuser',
  role: 'ADMIN',
  apiKey: mockUserApiKey,
  password: 'hashed',
};

const mockOrganization = {
  id: 'org1',
  name: 'Test Organization',
  owner: 'testuser',
  apiKeys: [
    { key: mockOrgApiKey, scope: 'MANAGEMENT' }
  ],
  members: [],
};

// Create a test Express app
function createTestApp(): Express {
  const app = express();
  app.use(express.json());
  
  // Apply authentication middlewares
  app.use(authenticateApiKeyMiddleware);
  
  // Test routes
  app.get('/api/v1/users/:username', (req, res) => {
    res.json({ 
      message: 'User fetched',
      username: req.params.username,
      requestedBy: req.user?.username 
    });
  });
  
  app.get('/api/v1/services/:id', (req, res) => {
    res.json({ 
      message: 'Service fetched',
      serviceId: req.params.id,
      authType: req.authType,
      user: req.user?.username,
      org: req.org?.name
    });
  });
  
  app.post('/api/v1/services', (req, res) => {
    res.json({ 
      message: 'Service created',
      authType: req.authType 
    });
  });
  
  app.delete('/api/v1/services/:id', (req, res) => {
    res.json({ 
      message: 'Service deleted',
      serviceId: req.params.id 
    });
  });
  
  app.get('/api/v1/features/:id', (req, res) => {
    res.json({ 
      message: 'Feature fetched',
      featureId: req.params.id 
    });
  });
  
  return app;
}

describe('API Key Authentication System', () => {
  let app: Express;

  beforeAll(() => {
    // Mock container.resolve for services
    vi.mock('../config/container', () => ({
      default: {
        resolve: (service: string) => {
          if (service === 'userService') {
            return {
              findByApiKey: async (apiKey: string) => {
                if (apiKey === mockUserApiKey) {
                  return mockUser;
                }
                throw new Error('Invalid API Key');
              }
            };
          }
          if (service === 'organizationService') {
            return {
              findByApiKey: async (apiKey: string) => {
                if (apiKey === mockOrgApiKey) {
                  return {
                    organization: mockOrganization,
                    apiKeyData: mockOrganization.apiKeys[0]
                  };
                }
                return null;
              }
            };
          }
          return null;
        }
      }
    }));

    app = createTestApp();
  });

  describe('Authentication (authenticateApiKey middleware)', () => {
    it('should reject requests without API key', async () => {
      const response = await request(app)
        .get('/api/v1/services/123')
        .expect(401);

      expect(response.body.error).toContain('API Key not found');
    });

    it('should reject API keys with invalid format', async () => {
      const response = await request(app)
        .get('/api/v1/services/123')
        .set('x-api-key', 'invalid_key_format')
        .expect(401);

      expect(response.body.error).toContain('Invalid API Key format');
    });

    it('should accept valid user API key', async () => {
      const response = await request(app)
        .get('/api/v1/services/123')
        .set('x-api-key', mockUserApiKey)
        .expect(200);

      expect(response.body.authType).toBe('user');
      expect(response.body.user).toBe('testuser');
    });

    it('should accept valid organization API key', async () => {
      const response = await request(app)
        .get('/api/v1/services/123')
        .set('x-api-key', mockOrgApiKey)
        .expect(200);

      expect(response.body.authType).toBe('organization');
      expect(response.body.org).toBe('Test Organization');
    });
  });

  describe('Authorization (checkPermissions middleware)', () => {
    describe('User-only routes', () => {
      it('should allow user API keys to access /users/**', async () => {
        const response = await request(app)
          .get('/api/v1/users/john')
          .set('x-api-key', mockUserApiKey)
          .expect(200);

        expect(response.body.username).toBe('john');
        expect(response.body.requestedBy).toBe('testuser');
      });

      it('should reject organization API keys from /users/**', async () => {
        const response = await request(app)
          .get('/api/v1/users/john')
          .set('x-api-key', mockOrgApiKey)
          .expect(403);

        expect(response.body.error).toContain('requires a user API key');
      });
    });

    describe('Shared routes with role-based access', () => {
      it('should allow user ADMIN to access services', async () => {
        await request(app)
          .get('/api/v1/services/123')
          .set('x-api-key', mockUserApiKey)
          .expect(200);
      });

      it('should allow org MANAGEMENT key to access services', async () => {
        await request(app)
          .get('/api/v1/services/123')
          .set('x-api-key', mockOrgApiKey)
          .expect(200);
      });

      it('should allow org MANAGEMENT to create services', async () => {
        await request(app)
          .post('/api/v1/services')
          .set('x-api-key', mockOrgApiKey)
          .send({ name: 'Test Service' })
          .expect(200);
      });
    });

    describe('Role-restricted operations', () => {
      it('should reject org MANAGEMENT key from deleting services', async () => {
        const response = await request(app)
          .delete('/api/v1/services/123')
          .set('x-api-key', mockOrgApiKey)
          .expect(403);

        expect(response.body.error).toContain('does not have permission');
      });

      it('should allow user ADMIN to delete services', async () => {
        await request(app)
          .delete('/api/v1/services/123')
          .set('x-api-key', mockUserApiKey)
          .expect(200);
      });
    });

    describe('Route pattern matching', () => {
      it('should match wildcard patterns correctly', async () => {
        // /services/* should match /services/123
        await request(app)
          .get('/api/v1/services/123')
          .set('x-api-key', mockUserApiKey)
          .expect(200);
      });

      it('should match double wildcard patterns correctly', async () => {
        // /features/** should match /features/123
        await request(app)
          .get('/api/v1/features/123')
          .set('x-api-key', mockUserApiKey)
          .expect(200);
      });
    });
  });

  describe('Request context population', () => {
    it('should populate req.user for user API keys', async () => {
      const response = await request(app)
        .get('/api/v1/services/123')
        .set('x-api-key', mockUserApiKey)
        .expect(200);

      expect(response.body.user).toBe('testuser');
      expect(response.body.authType).toBe('user');
    });

    it('should populate req.orgContext for organization API keys', async () => {
      const response = await request(app)
        .get('/api/v1/services/123')
        .set('x-api-key', mockOrgApiKey)
        .expect(200);

      expect(response.body.org).toBe('Test Organization');
      expect(response.body.authType).toBe('organization');
    });
  });
});

/**
 * Manual Testing Guide
 * ====================
 * 
 * 1. Start your server
 * 2. Create test API keys in your database
 * 3. Use curl or Postman to test:
 * 
 * # Test with user API key
 * curl -H "x-api-key: user_your_key_here" \
 *      http://localhost:3000/api/v1/users/john
 * 
 * # Test with organization API key (should fail for users route)
 * curl -H "x-api-key: org_your_key_here" \
 *      http://localhost:3000/api/v1/users/john
 * 
 * # Test with organization API key (should succeed for services)
 * curl -H "x-api-key: org_your_key_here" \
 *      http://localhost:3000/api/v1/services
 * 
 * # Test DELETE with MANAGEMENT org key (should fail)
 * curl -X DELETE \
 *      -H "x-api-key: org_management_key" \
 *      http://localhost:3000/api/v1/services/123
 * 
 * # Test DELETE with ALL org key (should succeed)
 * curl -X DELETE \
 *      -H "x-api-key: org_all_key" \
 *      http://localhost:3000/api/v1/services/123
 */
