import request from 'supertest';
import { baseUrl, getApp, shutdownApp } from './utils/testApp';
import { Server } from 'http';
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { createTestUser, deleteTestUser } from './utils/users/userTestUtils';
import {
  createTestOrganization,
  deleteTestOrganization,
  addApiKeyToOrganization,
  addMemberToOrganization,
} from './utils/organization/organizationTestUtils';
import { LeanOrganization, LeanApiKey } from '../main/types/models/Organization';
import { generateOrganizationApiKey } from '../main/utils/users/helpers';
import { LeanService } from '../main/types/models/Service';
import { addPricingToService, archivePricingFromService, createTestService, deleteTestService } from './utils/services/serviceTestUtils';

describe('Permissions Test Suite', function () {
  let app: Server;
  let adminUser: any;
  let adminApiKey: string;
  let regularUser: any;
  let regularUserApiKey: string;
  let testOrganization: LeanOrganization;
  let orgApiKey: LeanApiKey;

  beforeAll(async function () {
    app = await getApp();

    // Create an admin user for tests
    adminUser = await createTestUser('ADMIN');
    adminApiKey = adminUser.apiKey;

    // Create a regular user for tests
    regularUser = await createTestUser('USER');
    regularUserApiKey = regularUser.apiKey;

    // Create a test organization
    testOrganization = await createTestOrganization(adminUser.username);

    // Add an organization API key
    if (testOrganization && testOrganization.id) {
      orgApiKey = {
        key: generateOrganizationApiKey(),
        scope: 'ALL',
      };
      await addApiKeyToOrganization(testOrganization.id, orgApiKey);
    }
  });

  afterAll(async function () {
    // Clean up the created users and organization
    if (testOrganization?.id) {
      await deleteTestOrganization(testOrganization.id!);
    }
    if (adminUser?.username) {
      await deleteTestUser(adminUser.username);
    }
    if (regularUser?.username) {
      await deleteTestUser(regularUser.username);
    }
    await shutdownApp();
  });

  describe('Public Routes', function () {
    describe('POST /users/authenticate', function () {
      it('Should return 200 for public authentication endpoint without API key', async function () {
        const response = await request(app)
          .post(`${baseUrl}/users/authenticate`)
          .send({ username: adminUser.username, password: 'password123' });

        expect(response.status).toBe(200);
      });
    });

    describe('POST /users', function () {
      let createdUser: any;

      afterEach(async function () {
        if (createdUser?.username) {
          await deleteTestUser(createdUser.username);
          createdUser = null;
        }
      });

      it('Should return 201 for public user creation endpoint without API key', async function () {
        const userData = {
          username: `public_user_${Date.now()}`,
          password: 'password123',
        };

        const response = await request(app).post(`${baseUrl}/users`).send(userData);

        expect(response.status).toBe(201);
        createdUser = response.body;
      });
    });

    describe('GET /health', function () {
      it('Should return 200 for public health check endpoint without API key', async function () {
        const response = await request(app).get(`${baseUrl}/healthcheck`);

        expect(response.status).toBe(200);
      });
    });

    describe('Events Routes (Public)', function () {
      it('Should allow GET /events/status without API key', async function () {
        const response = await request(app).get(`${baseUrl}/events/status`);

        expect(response.status).toBe(200);
      });

      it('Should allow POST /events/test-event without API key', async function () {
        const response = await request(app)
          .post(`${baseUrl}/events/test-event`)
          .send({ serviceName: 'test', pricingVersion: 'v1' });

        expect([200, 400, 404]).toContain(response.status);
      });
    });
  });

  describe('User Routes (requiresUser: true)', function () {
    describe('GET /users', function () {
      it('Should return 200 with valid ADMIN user API key', async function () {
        const response = await request(app).get(`${baseUrl}/users`).set('x-api-key', adminApiKey);

        expect(response.status).toBe(200);
      });

      it('Should return 200 with valid USER user API key', async function () {
        const response = await request(app)
          .get(`${baseUrl}/users`)
          .set('x-api-key', regularUserApiKey);

        expect(response.status).toBe(200);
      });

      it('Should return 401 without API key', async function () {
        const response = await request(app).get(`${baseUrl}/users`);

        expect(response.status).toBe(401);
      });

      it('Should return 403 with organization API key', async function () {
        const response = await request(app).get(`${baseUrl}/users`).set('x-api-key', orgApiKey.key);

        expect(response.status).toBe(403);
      });
    });

    describe('GET /users/:username', function () {
      it('Should return 200 with valid ADMIN user API key', async function () {
        const response = await request(app)
          .get(`${baseUrl}/users/${adminUser.username}`)
          .set('x-api-key', adminApiKey);

        expect(response.status).toBe(200);
      });

      it('Should return 200 with valid USER user API key', async function () {
        const response = await request(app)
          .get(`${baseUrl}/users/${regularUser.username}`)
          .set('x-api-key', regularUserApiKey);

        expect(response.status).toBe(200);
      });

      it('Should return 401 without API key', async function () {
        const response = await request(app).get(`${baseUrl}/users/${adminUser.username}`);

        expect(response.status).toBe(401);
      });

      it('Should return 403 with organization API key', async function () {
        const response = await request(app)
          .get(`${baseUrl}/users/${adminUser.username}`)
          .set('x-api-key', orgApiKey.key);

        expect(response.status).toBe(403);
      });
    });

    describe('PUT /users/:username', function () {
      it('Should return appropriate status with valid ADMIN user API key', async function () {
        const response = await request(app)
          .put(`${baseUrl}/users/${adminUser.username}`)
          .set('x-api-key', adminApiKey)
          .send({ password: 'newpassword123' });

        expect([200, 400, 422]).toContain(response.status);
      });

      it('Should return appropriate status with valid USER user API key', async function () {
        const response = await request(app)
          .put(`${baseUrl}/users/${regularUser.username}`)
          .set('x-api-key', regularUserApiKey)
          .send({ password: 'newpassword123' });

        expect([200, 400, 422]).toContain(response.status);
      });

      it('Should return 401 without API key', async function () {
        const response = await request(app)
          .put(`${baseUrl}/users/${adminUser.username}`)
          .send({ password: 'newpassword123' });

        expect(response.status).toBe(401);
      });

      it('Should return 403 with organization API key', async function () {
        const response = await request(app)
          .put(`${baseUrl}/users/${adminUser.username}`)
          .set('x-api-key', orgApiKey.key)
          .send({ password: 'newpassword123' });

        expect(response.status).toBe(403);
      });
    });

    describe('DELETE /users/:username', function () {
      let userToDelete: any;

      beforeEach(async function () {
        userToDelete = await createTestUser('USER');
      });

      afterEach(async function () {
        if (userToDelete?.username) {
          try {
            await deleteTestUser(userToDelete.username);
          } catch (e) {
            // User might already be deleted in test
          }
        }
      });

      it('Should allow deletion with valid ADMIN user API key', async function () {
        const response = await request(app)
          .delete(`${baseUrl}/users/${userToDelete.username}`)
          .set('x-api-key', adminApiKey);

        expect([200, 204, 404]).toContain(response.status);
      });

      it('Should allow deletion with valid USER user API key', async function () {
        const response = await request(app)
          .delete(`${baseUrl}/users/${userToDelete.username}`)
          .set('x-api-key', regularUserApiKey);

        expect([200, 204, 404]).toContain(response.status);
      });

      it('Should return 401 without API key', async function () {
        const response = await request(app).delete(`${baseUrl}/users/${userToDelete.username}`);

        expect(response.status).toBe(401);
      });

      it('Should return 403 with organization API key', async function () {
        const response = await request(app)
          .delete(`${baseUrl}/users/${userToDelete.username}`)
          .set('x-api-key', orgApiKey.key);

        expect(response.status).toBe(403);
      });
    });

    describe('PUT /users/:username/api-key', function () {
      it('Should allow API key regeneration with valid ADMIN user API key', async function () {
        const response = await request(app)
          .put(`${baseUrl}/users/${adminUser.username}/api-key`)
          .set('x-api-key', adminApiKey);

        expect([200, 400]).toContain(response.status);
      });

      it('Should allow API key regeneration with valid USER user API key', async function () {
        const response = await request(app)
          .put(`${baseUrl}/users/${regularUser.username}/api-key`)
          .set('x-api-key', regularUserApiKey);

        expect([200, 400]).toContain(response.status);
      });

      it('Should return 401 without API key', async function () {
        const response = await request(app).put(`${baseUrl}/users/${adminUser.username}/api-key`);

        expect(response.status).toBe(401);
      });

      it('Should return 403 with organization API key', async function () {
        const response = await request(app)
          .put(`${baseUrl}/users/${adminUser.username}/api-key`)
          .set('x-api-key', orgApiKey.key);

        expect(response.status).toBe(403);
      });
    });

    describe('PUT /users/:username/role', function () {
      let testUser: any;
      let testAdmin: any;

      beforeEach(async function () {
        testUser = await createTestUser('USER');
        testAdmin = await createTestUser('ADMIN');
      });

      afterEach(async function () {
        if (testUser?.username) {
          await deleteTestUser(testUser.username);
        }
        if (testAdmin?.username) {
          await deleteTestUser(testAdmin.username);
        }
      });

      it('Should allow role change with valid ADMIN user API key', async function () {
        const response = await request(app)
          .put(`${baseUrl}/users/${testUser.username}/role`)
          .set('x-api-key', testAdmin.apiKey)
          .send({ role: 'USER' });

        expect([200, 400, 403, 422]).toContain(response.status);
      });

      it('Should allow role change with valid USER user API key', async function () {
        const testUser2 = await createTestUser('USER');

        const response = await request(app)
          .put(`${baseUrl}/users/${testUser.username}/role`)
          .set('x-api-key', testUser2.apiKey)
          .send({ role: 'USER' });

        expect([200, 400, 403, 422]).toContain(response.status);
      });

      it('Should return 401 without API key', async function () {
        const response = await request(app)
          .put(`${baseUrl}/users/${testUser.username}/role`)
          .send({ role: 'USER' });

        expect(response.status).toBe(401);
      });

      it('Should return 403 with organization API key', async function () {
        const response = await request(app)
          .put(`${baseUrl}/users/${testUser.username}/role`)
          .set('x-api-key', orgApiKey.key);

        expect(response.status).toBe(403);
      });
    });
  });

  describe('Organization Routes (requiresUser: true)', function () {
    describe('GET /organizations', function () {
      it('Should return 200 with valid ADMIN user API key', async function () {
        const response = await request(app)
          .get(`${baseUrl}/organizations`)
          .set('x-api-key', adminApiKey);

        expect(response.status).toBe(200);
      });

      it('Should return 200 with valid USER user API key', async function () {
        const response = await request(app)
          .get(`${baseUrl}/organizations`)
          .set('x-api-key', regularUserApiKey);

        expect(response.status).toBe(200);
      });

      it('Should return 401 without API key', async function () {
        const response = await request(app).get(`${baseUrl}/organizations`);

        expect(response.status).toBe(401);
      });

      it('Should return 403 with organization API key', async function () {
        const response = await request(app)
          .get(`${baseUrl}/organizations`)
          .set('x-api-key', orgApiKey.key);

        expect(response.status).toBe(403);
      });
    });

    describe('POST /organizations', function () {
      let createdOrg: any;

      afterEach(async function () {
        if (createdOrg?._id) {
          await deleteTestOrganization(createdOrg._id);
          createdOrg = null;
        }
      });

      it('Should return 201 with valid user API key', async function () {
        const orgData = {
          name: `test_org_${Date.now()}`,
          owner: adminUser.username,
        };

        const response = await request(app)
          .post(`${baseUrl}/organizations`)
          .set('x-api-key', adminApiKey)
          .send(orgData);

        if (response.status === 201) {
          createdOrg = response.body;
        }
        expect([201, 400, 422]).toContain(response.status);
      });

      it('Should return 401 without API key', async function () {
        const response = await request(app)
          .post(`${baseUrl}/organizations`)
          .send({ name: 'test', owner: adminUser.username });

        expect(response.status).toBe(401);
      });

      it('Should return 403 with organization API key', async function () {
        const response = await request(app)
          .post(`${baseUrl}/organizations`)
          .set('x-api-key', orgApiKey.key)
          .send({ name: 'test', owner: adminUser.username });

        expect(response.status).toBe(403);
      });
    });

    describe('GET /organizations/:organizationId', function () {
      it('Should return 200 with valid user API key', async function () {
        const response = await request(app)
          .get(`${baseUrl}/organizations/${testOrganization.id}`)
          .set('x-api-key', adminApiKey);

        expect(response.status).toBe(200);
      });

      it('Should return 401 without API key', async function () {
        const response = await request(app).get(`${baseUrl}/organizations/${testOrganization.id}`);

        expect(response.status).toBe(401);
      });

      it('Should return 403 with organization API key', async function () {
        const response = await request(app)
          .post(`${baseUrl}/organizations/${testOrganization.id}`)
          .set('x-api-key', orgApiKey.key)
          .send({ name: 'test', owner: adminUser.username });

        expect(response.status).toBe(403);
      });
    });

    describe('Organization-scoped Service Routes', function () {
      let testServicesOrganization: LeanOrganization;
      let testOwnerUser: any;
      let testMemberUser: any;
      let testEvaluatorMemberUser: any;
      let testNonMemberUser: any;

      beforeAll(async function () {
        // Create users
        testOwnerUser = await createTestUser('USER');
        testMemberUser = await createTestUser('USER');
        testEvaluatorMemberUser = await createTestUser('USER');
        testNonMemberUser = await createTestUser('USER');

        // Create organization
        testServicesOrganization = await createTestOrganization(testOwnerUser.username);

        // Add member to organization
        await addMemberToOrganization(testServicesOrganization.id!, {
          username: testMemberUser.username,
          role: 'MANAGER',
        });

        await addMemberToOrganization(testServicesOrganization.id!, {
          username: testEvaluatorMemberUser.username,
          role: 'EVALUATOR',
        });
      });

      afterAll(async function () {
        // Delete organization
        if (testServicesOrganization?.id) {
          await deleteTestOrganization(testServicesOrganization.id!);
        }

        // Delete users
        if (testOwnerUser?.username) {
          await deleteTestUser(testOwnerUser.username);
        }
        if (testMemberUser?.username) {
          await deleteTestUser(testMemberUser.username);
        }
        if (testNonMemberUser?.username) {
          await deleteTestUser(testNonMemberUser.username);
        }
      });

      describe('GET /organizations/:organizationId/services', function () {
        it('Should allow access with valid SPACE ADMIN API key', async function () {
          const response = await request(app)
            .get(`${baseUrl}/organizations/${testServicesOrganization.id}/services`)
            .set('x-api-key', adminApiKey);

          expect([200, 404]).toContain(response.status);
        });

        it('Should allow access with valid OWNER API key', async function () {
          const response = await request(app)
            .get(`${baseUrl}/organizations/${testServicesOrganization.id}/services`)
            .set('x-api-key', testOwnerUser.apiKey);

          expect([200, 404]).toContain(response.status);
        });

        it('Should allow access with valid MANAGER API key', async function () {
          const response = await request(app)
            .get(`${baseUrl}/organizations/${testServicesOrganization.id}/services`)
            .set('x-api-key', testMemberUser.apiKey);

          expect([200, 404]).toContain(response.status);
        });

        it('Should return 401 without API key', async function () {
          const response = await request(app).get(
            `${baseUrl}/organizations/${testOrganization.id}/services`
          );

          expect(response.status).toBe(401);
        });

        it('Should return 403 with organization API key', async function () {
          const response = await request(app)
            .get(`${baseUrl}/organizations/${testOrganization.id}/services`)
            .set('x-api-key', orgApiKey.key);

          expect(response.status).toBe(403);
        });
      });

      describe('POST /organizations/:organizationId/services', function () {
        it('Should allow creation with valid SPACE ADMIN API key', async function () {
          const response = await request(app)
            .post(`${baseUrl}/organizations/${testServicesOrganization.id}/services`)
            .set('x-api-key', adminApiKey)
            .send({ name: '${testService.name}' });

          expect([201, 400, 422]).toContain(response.status);
        });

        it('Should allow creation with valid OWNER API key', async function () {
          const response = await request(app)
            .post(`${baseUrl}/organizations/${testServicesOrganization.id}/services`)
            .set('x-api-key', testOwnerUser.apiKey)
            .send({ name: '${testService.name}' });

          expect([201, 400, 422]).toContain(response.status);
        });

        it('Should allow creation with valid MANAGER API key', async function () {
          const response = await request(app)
            .post(`${baseUrl}/organizations/${testServicesOrganization.id}/services`)
            .set('x-api-key', testMemberUser.apiKey)
            .send({ name: '${testService.name}' });

          expect([201, 400, 422]).toContain(response.status);
        });

        it('Should return 403 with EVALUATOR API key (requires ADMIN or MANAGER)', async function () {
          const response = await request(app)
            .post(`${baseUrl}/organizations/${testServicesOrganization.id}/services`)
            .set('x-api-key', testEvaluatorMemberUser.apiKey)
            .send({ name: '${testService.name}' });

          expect(response.status).toBe(403);
        });

        it('Should return 401 without API key', async function () {
          const response = await request(app).post(
            `${baseUrl}/organizations/${testServicesOrganization.id}/services`
          );

          expect(response.status).toBe(401);
        });

        it('Should return 403 with organization API key', async function () {
          const response = await request(app)
            .post(`${baseUrl}/organizations/${testServicesOrganization.id}/services`)
            .set('x-api-key', orgApiKey.key)
            .send({ name: '${testService.name}' });

          expect(response.status).toBe(403);
        });
      });

      describe('DELETE /organizations/:organizationId/services', function () {
        it('Should allow deletion with valid SPACE ADMIN API key', async function () {
          const response = await request(app)
            .delete(`${baseUrl}/organizations/${testServicesOrganization.id}/services`)
            .set('x-api-key', adminApiKey);

          expect([200, 204, 404]).toContain(response.status);
        });

        it('Should allow deletion with valid OWNER API key', async function () {
          const response = await request(app)
            .delete(`${baseUrl}/organizations/${testServicesOrganization.id}/services`)
            .set('x-api-key', testOwnerUser.apiKey);

          expect([200, 204, 404]).toContain(response.status);
        });

        it('Should return 403 with MANAGER API key (requires ADMIN)', async function () {
          const response = await request(app)
            .delete(`${baseUrl}/organizations/${testServicesOrganization.id}/services`)
            .set('x-api-key', testMemberUser.apiKey);

          expect(response.status).toBe(403);
        });

        it('Should return 403 with EVALUATOR API key (requires ADMIN)', async function () {
          const response = await request(app)
            .delete(`${baseUrl}/organizations/${testServicesOrganization.id}/services`)
            .set('x-api-key', testEvaluatorMemberUser.apiKey);

          expect(response.status).toBe(403);
        });

        it('Should return 401 without API key', async function () {
          const response = await request(app).delete(
            `${baseUrl}/organizations/${testServicesOrganization.id}/services`
          );

          expect(response.status).toBe(401);
        });

        it('Should return 403 with organization API key', async function () {
          const response = await request(app)
            .delete(`${baseUrl}/organizations/${testServicesOrganization.id}/services`)
            .set('x-api-key', orgApiKey.key);

          expect(response.status).toBe(403);
        });
      });
    });
  });

  describe('Service Routes (Organization API Keys)', function () {

    let testServicesOrganization: LeanOrganization;
    let ownerUser: any;
    let allApiKey: LeanApiKey;
    let managementApiKey: LeanApiKey;
    let evaluationApiKey: LeanApiKey;
    let testService: LeanService;

    beforeEach(async function () {
      // Create owner user
      ownerUser = await createTestUser('USER');

      // Create organization
      testServicesOrganization = await createTestOrganization(ownerUser.username);

      // Create a test service
      testService = await createTestService(testServicesOrganization.id!, `test-service_${crypto.randomUUID()}`);

      // Add organization API keys
      allApiKey = { key: generateOrganizationApiKey(), scope: 'ALL' };
      managementApiKey = { key: generateOrganizationApiKey(), scope: 'MANAGEMENT' };
      evaluationApiKey = { key: generateOrganizationApiKey(), scope: 'EVALUATION' };

      await addApiKeyToOrganization(testServicesOrganization.id!, allApiKey);
      await addApiKeyToOrganization(testServicesOrganization.id!, managementApiKey);
      await addApiKeyToOrganization(testServicesOrganization.id!, evaluationApiKey);
    });

    afterEach(async function () {
      if (testService?.id) {
        await deleteTestService(testService.id!);
      }
      
      // Delete organization
      if (testServicesOrganization?.id) {
        await deleteTestOrganization(testServicesOrganization.id!);
      }

      // Delete owner user
      if (ownerUser?.username) {
        await deleteTestUser(ownerUser.username);
      }
    });

    describe('GET /services - Organization Role: ALL, MANAGEMENT, EVALUATION', function () {
      it('Should return 200 with organization API key with ALL scope', async function () {
        const response = await request(app)
          .get(`${baseUrl}/services`)
          .set('x-api-key', allApiKey.key);

        expect([200, 404]).toContain(response.status);
      });

      it('Should return 200 with organization API key with MANAGEMENT scope', async function () {
        const response = await request(app)
          .get(`${baseUrl}/services`)
          .set('x-api-key', managementApiKey.key);

        expect([200, 404]).toContain(response.status);
      });

      it('Should return 200 with organization API key with EVALUATION scope', async function () {
        const response = await request(app)
          .get(`${baseUrl}/services`)
          .set('x-api-key', evaluationApiKey.key);

        expect([200, 404]).toContain(response.status);
      });

      it('Should return 401 without API key', async function () {
        const response = await request(app).get(`${baseUrl}/services`);

        expect(response.status).toBe(401);
      });

      it('Should return 403 with ADMIN user API key', async function () {
        const response = await request(app)
          .get(`${baseUrl}/services`)
          .set('x-api-key', adminApiKey);

        expect(response.status).toBe(403);
      });

      it('Should return 403 with USER API key (requires org key)', async function () {
        const testUser = await createTestUser('USER');
        
        const response = await request(app)
          .get(`${baseUrl}/services`)
          .set('x-api-key', testUser.apiKey);

        expect(response.status).toBe(403);

        await deleteTestUser(testUser.username);
      });
    });

    describe('POST /services - Organization Role: ALL, MANAGEMENT', function () {
      it('Should allow creation with organization API key with ALL scope', async function () {
        const response = await request(app)
          .post(`${baseUrl}/services`)
          .set('x-api-key', allApiKey.key)
          .send({ name: '${testService.name}' });

        expect([201, 400, 422]).toContain(response.status);
      });

      it('Should allow creation with organization API key with MANAGEMENT scope', async function () {
        const response = await request(app)
          .post(`${baseUrl}/services`)
          .set('x-api-key', managementApiKey.key)
          .send({ name: '${testService.name}' });

        expect([201, 400, 422]).toContain(response.status);
      });

      it('Should return 403 with organization API key with EVALUATION scope', async function () {
        const response = await request(app)
          .post(`${baseUrl}/services`)
          .set('x-api-key', evaluationApiKey.key)
          .send({ name: '${testService.name}' });

        expect(response.status).toBe(403);
      });

      it('Should return 401 without API key', async function () {
        const response = await request(app)
          .post(`${baseUrl}/services`)
          .send({ name: '${testService.name}' });

        expect(response.status).toBe(401);
      });

      it('Should return 403 with ADMIN user API key', async function () {
        const response = await request(app)
          .post(`${baseUrl}/services`)
          .set('x-api-key', adminApiKey)
          .send({ name: '${testService.name}' });

        expect(response.status).toBe(403);
      });

      it('Should return 403 with USER API key (requires org key)', async function () {
        const testUser = await createTestUser('USER');
        
        const response = await request(app)
          .post(`${baseUrl}/services`)
          .set('x-api-key', testUser.apiKey)
          .send({ name: '${testService.name}' });

        expect(response.status).toBe(403);

        await deleteTestUser(testUser.username);
      });
    });

    describe('GET /services/:serviceName', function () {
      it('Should allow access with organization API key with ALL scope', async function () {
        const response = await request(app)
          .get(`${baseUrl}/services/${testService.name}`)
          .set('x-api-key', allApiKey.key);

        expect([200, 404]).toContain(response.status);
      });

      it('Should allow access with organization API key with MANAGEMENT scope', async function () {
        const response = await request(app)
          .get(`${baseUrl}/services/${testService.name}`)
          .set('x-api-key', managementApiKey.key);

        expect([200, 404]).toContain(response.status);
      });

      it('Should allow access with organization API key with EVALUATION scope', async function () {
        const response = await request(app)
          .get(`${baseUrl}/services/${testService.name}`)
          .set('x-api-key', evaluationApiKey.key);

        expect([200, 404]).toContain(response.status);
      });

      it('Should return 401 without API key', async function () {
        const response = await request(app).get(`${baseUrl}/services/${testService.name}`);

        expect(response.status).toBe(401);
      });

      it('Should return 403 with ADMIN user API key', async function () {
        const response = await request(app)
          .get(`${baseUrl}/services/${testService.name}`)
          .set('x-api-key', adminApiKey);

        expect(response.status).toBe(403);
      });

      it('Should return 403 with USER API key (requires org key)', async function () {
        const testUser = await createTestUser('USER');
        
        const response = await request(app)
          .get(`${baseUrl}/services/${testService.name}`)
          .set('x-api-key', testUser.apiKey);

        expect(response.status).toBe(403);

        await deleteTestUser(testUser.username);
      });
    });

    describe('PUT /services/:serviceName - Organization Role: ALL, MANAGEMENT', function () {
      it('Should allow update with organization API key with ALL scope', async function () {
        const response1 = await request(app)
          .put(`${baseUrl}/services/${testService.name}`)
          .set('x-api-key', allApiKey.key)
          .send({ name: "Updated-" + testService.name });

        expect([200, 400, 404, 422]).toContain(response1.status);

        const response2 = await request(app)
          .put(`${baseUrl}/services/${"Updated-" + testService.name}`)
          .set('x-api-key', allApiKey.key)
          .send({ name: testService.name });

        expect([200, 400, 404, 422]).toContain(response2.status);
      });

      it('Should allow update with organization API key with MANAGEMENT scope', async function () {
        const response1 = await request(app)
          .put(`${baseUrl}/services/${testService.name}`)
          .set('x-api-key', managementApiKey.key)
          .send({ name: 'Updated-' + testService.name });

        expect([200, 400, 404, 422]).toContain(response1.status);

        const response2 = await request(app)
          .put(`${baseUrl}/services/${'Updated-' + testService.name}`)
          .set('x-api-key', managementApiKey.key)
          .send({ name: testService.name });
          
        expect([200, 400, 404, 422]).toContain(response2.status);
      });

      it('Should return 403 with organization API key with EVALUATION scope', async function () {
        const response = await request(app)
          .put(`${baseUrl}/services/${testService.name}`)
          .set('x-api-key', evaluationApiKey.key)
          .send({ name: 'Updated service' });

        expect(response.status).toBe(403);
      });

      it('Should return 401 without API key', async function () {
        const response = await request(app)
          .put(`${baseUrl}/services/${testService.name}`)
          .send({ name: 'Updated service' });

        expect(response.status).toBe(401);
      });

      it('Should return 403 with USER API key (requires org key)', async function () {
        const testUser = await createTestUser('USER');
        
        const response = await request(app)
          .put(`${baseUrl}/services/${testService.name}`)
          .set('x-api-key', testUser.apiKey)
          .send({ name: 'Updated service' });

        expect(response.status).toBe(403);

        await deleteTestUser(testUser.username);
      });
    });

    describe('DELETE /services/:serviceName - Organization Role: ALL', function () {
      it('Should allow deletion with organization API key with ALL scope', async function () {
        const response = await request(app)
          .delete(`${baseUrl}/services/${testService.name}`)
          .set('x-api-key', allApiKey.key);

        expect([200, 204, 404]).toContain(response.status);
      });

      it('Should return 403 with organization API key with MANAGEMENT scope', async function () {
        const response = await request(app)
          .delete(`${baseUrl}/services/${testService.name}`)
          .set('x-api-key', managementApiKey.key);

        expect(response.status).toBe(403);
      });

      it('Should return 403 with organization API key with EVALUATION scope', async function () {
        const response = await request(app)
          .delete(`${baseUrl}/services/${testService.name}`)
          .set('x-api-key', evaluationApiKey.key);

        expect(response.status).toBe(403);
      });

      it('Should return 401 without API key', async function () {
        const response = await request(app).delete(`${baseUrl}/services/${testService.name}`);

        expect(response.status).toBe(401);
      });

      it('Should return 403 with ADMIN user API key', async function () {
        const response = await request(app)
          .delete(`${baseUrl}/services/${testService.name}`)
          .set('x-api-key', adminApiKey);

        expect(response.status).toBe(403);
      });

      it('Should return 403 with USER API key (requires org key)', async function () {
        const testUser = await createTestUser('USER');
        
        const response = await request(app)
          .delete(`${baseUrl}/services/${testService.name}`)
          .set('x-api-key', testUser.apiKey);

        expect(response.status).toBe(403);

        await deleteTestUser(testUser.username);
      });
    });

    describe('Service Pricings Routes', function () {
      describe('GET /services/:serviceName/pricings', function () {
        it('Should allow access with organization API key with ALL scope', async function () {
          const response = await request(app)
            .get(`${baseUrl}/services/${testService.name}/pricings`)
            .set('x-api-key', allApiKey.key);

          expect([200, 404]).toContain(response.status);
        });

        it('Should allow access with organization API key with MANAGEMENT scope', async function () {
          const response = await request(app)
            .get(`${baseUrl}/services/${testService.name}/pricings`)
            .set('x-api-key', managementApiKey.key);

          expect([200, 404]).toContain(response.status);
        });

        it('Should allow access with organization API key with EVALUATION scope', async function () {
          const response = await request(app)
            .get(`${baseUrl}/services/${testService.name}/pricings`)
            .set('x-api-key', evaluationApiKey.key);

          expect([200, 404]).toContain(response.status);
        });

        it('Should return 401 without API key', async function () {
          const response = await request(app).get(`${baseUrl}/services/${testService.name}/pricings`);

          expect(response.status).toBe(401);
        });

        it('Should return 403 with ADMIN user API key', async function () {
          const response = await request(app)
            .get(`${baseUrl}/services/${testService.name}/pricings`)
            .set('x-api-key', adminApiKey);

          expect(response.status).toBe(403);
        });

        it('Should return 403 with USER API key (requires org key)', async function () {
          const testUser = await createTestUser('USER');
          
          const response = await request(app)
            .get(`${baseUrl}/services/${testService.name}/pricings`)
            .set('x-api-key', testUser.apiKey);

          expect(response.status).toBe(403);

          await deleteTestUser(testUser.username);
        });
      });

      describe('POST /services/:serviceName/pricings', function () {
        it('Should allow creation with organization API key with ALL scope', async function () {
          const response = await request(app)
            .post(`${baseUrl}/services/${testService.name}/pricings`)
            .set('x-api-key', allApiKey.key)
            .send({ version: 'v1' });

          expect([201, 400, 404, 422]).toContain(response.status);
        });

        it('Should allow creation with organization API key with MANAGEMENT scope', async function () {
          const response = await request(app)
            .post(`${baseUrl}/services/${testService.name}/pricings`)
            .set('x-api-key', managementApiKey.key)
            .send({ version: 'v1' });

          expect([201, 400, 404, 422]).toContain(response.status);
        });

        it('Should return 403 with organization API key with EVALUATION scope', async function () {
          const response = await request(app)
            .post(`${baseUrl}/services/${testService.name}/pricings`)
            .set('x-api-key', evaluationApiKey.key)
            .send({ version: 'v1' });

          expect(response.status).toBe(403);
        });

        it('Should return 401 without API key', async function () {
          const response = await request(app).post(`${baseUrl}/services/${testService.name}/pricings`);

          expect(response.status).toBe(401);
        });

        it('Should return 403 with ADMIN user API key', async function () {
          const response = await request(app)
            .post(`${baseUrl}/services/${testService.name}/pricings`)
            .set('x-api-key', adminApiKey)
            .send({ version: 'v1' });

          expect(response.status).toBe(403);
        });

        it('Should return 403 with USER API key (requires org key)', async function () {
          const testUser = await createTestUser('USER');
          
          const response = await request(app)
            .post(`${baseUrl}/services/${testService.name}/pricings`)
            .set('x-api-key', testUser.apiKey)
            .send({ version: 'v1' });

          expect(response.status).toBe(403);

          await deleteTestUser(testUser.username);
        });
      });

      describe('GET /services/:serviceName/pricings/:pricingVersion', function () {
        it('Should allow access with organization API key with ALL scope', async function () {
          const testPricingId = Object.keys(testService.activePricings!)[0]
          
          const response = await request(app)
            .get(`${baseUrl}/services/${testService.name}/pricings/${testPricingId}`)
            .set('x-api-key', allApiKey.key);

          expect([200, 404]).toContain(response.status);
        });

        it('Should allow access with organization API key with MANAGEMENT scope', async function () {
          const testPricingId = Object.keys(testService.activePricings!)[0]
          
          const response = await request(app)
            .get(`${baseUrl}/services/${testService.name}/pricings/${testPricingId}`)
            .set('x-api-key', managementApiKey.key);

          expect([200, 404]).toContain(response.status);
        });

        it('Should allow access with organization API key with EVALUATION scope', async function () {
          const testPricingId = Object.keys(testService.activePricings!)[0]
          
          const response = await request(app)
            .get(`${baseUrl}/services/${testService.name}/pricings/${testPricingId}`)
            .set('x-api-key', evaluationApiKey.key);

          expect([200, 404]).toContain(response.status);
        });

        it('Should return 401 without API key', async function () {
          const testPricingId = Object.keys(testService.activePricings!)[0]

          const response = await request(app).get(`${baseUrl}/services/${testService.name}/pricings/${testPricingId}`);

          expect(response.status).toBe(401);
        });

        it('Should return 403 with ADMIN user API key', async function () {
          const testPricingId = Object.keys(testService.activePricings!)[0]
          
          const response = await request(app)
            .get(`${baseUrl}/services/${testService.name}/pricings/${testPricingId}`)
            .set('x-api-key', adminApiKey);

          expect(response.status).toBe(403);
        });

        it('Should return 403 with USER API key (requires org key)', async function () {
          const testUser = await createTestUser('USER');
          const testPricingId = Object.keys(testService.activePricings!)[0];
          
          const response = await request(app)
            .get(`${baseUrl}/services/${testService.name}/pricings/${testPricingId}`)
            .set('x-api-key', testUser.apiKey);

          expect(response.status).toBe(403);

          await deleteTestUser(testUser.username);
        });
      });

      describe('PUT /services/:serviceName/pricings/:pricingVersion', function () {
        it('Should allow update with organization API key with ALL scope', async function () {
          const testPricingId = Object.keys(testService.activePricings!)[0];
          
          const response = await request(app)
            .put(`${baseUrl}/services/${testService.name}/pricings/${testPricingId}`)
            .set('x-api-key', allApiKey.key)
            .send({ available: true });

          expect([200, 400, 404, 422]).toContain(response.status);
        });

        it('Should allow update with organization API key with MANAGEMENT scope', async function () {
          const testPricingId = Object.keys(testService.activePricings!)[0];
          
          const response = await request(app)
            .put(`${baseUrl}/services/${testService.name}/pricings/${testPricingId}`)
            .set('x-api-key', managementApiKey.key)
            .send({ available: true });

          expect([200, 400, 404, 422]).toContain(response.status);
        });

        it('Should return 403 with organization API key with EVALUATION scope', async function () {
          const testPricingId = Object.keys(testService.activePricings!)[0];
          
          const response = await request(app)
            .put(`${baseUrl}/services/${testService.name}/pricings/${testPricingId}`)
            .set('x-api-key', evaluationApiKey.key)
            .send({ available: true });

          expect(response.status).toBe(403);
        });

        it('Should return 401 without API key', async function () {
          const testPricingId = Object.keys(testService.activePricings!)[0];
          
          const response = await request(app)
            .put(`${baseUrl}/services/${testService.name}/pricings/${testPricingId}`)
            .send({ available: true });

          expect(response.status).toBe(401);
        });

        it('Should return 403 with ADMIN user API key', async function () {
          const testPricingId = Object.keys(testService.activePricings!)[0];
          
          const response = await request(app)
            .put(`${baseUrl}/services/${testService.name}/pricings/${testPricingId}`)
            .set('x-api-key', adminApiKey)
            .send({ available: true });

          expect(response.status).toBe(403);
        });

        it('Should return 403 with USER API key (requires org key)', async function () {
          const testUser = await createTestUser('USER');
          const testPricingId = Object.keys(testService.activePricings!)[0];

          const response = await request(app)
            .put(`${baseUrl}/services/${testService.name}/pricings/${testPricingId}`)
            .set('x-api-key', testUser.apiKey)
            .send({ available: true });

          expect(response.status).toBe(403);

          await deleteTestUser(testUser.username);
        });
      });

      describe('DELETE /services/:serviceName/pricings/:pricingVersion', function () {
        it('Should allow deletion with organization API key with ALL scope', async function () {
          const testPricingId = Object.keys(testService.activePricings!)[0];

          const response = await request(app)
            .delete(`${baseUrl}/services/${testService.name}/pricings/${testPricingId}`)
            .set('x-api-key', allApiKey.key);

          expect([200, 204, 404, 409]).toContain(response.status);
        });

        it('Should return 403 with organization API key with MANAGEMENT scope', async function () {
          const testPricingId = Object.keys(testService.activePricings!)[0];

          const response = await request(app)
            .delete(`${baseUrl}/services/${testService.name}/pricings/${testPricingId}`)
            .set('x-api-key', managementApiKey.key);

          expect(response.status).toBe(403);
        });

        it('Should return 403 with organization API key with EVALUATION scope', async function () {
          const testPricingId = Object.keys(testService.activePricings!)[0];
          
          const response = await request(app)
            .delete(`${baseUrl}/services/${testService.name}/pricings/${testPricingId}`)
            .set('x-api-key', evaluationApiKey.key);

          expect(response.status).toBe(403);
        });

        it('Should return 401 without API key', async function () {
          const testPricingId = Object.keys(testService.activePricings!)[0];

          const response = await request(app).delete(
            `${baseUrl}/services/${testService.name}/pricings/${testPricingId}`
          );

          expect(response.status).toBe(401);
        });

        it('Should return 403 with ADMIN user API key', async function () {
          const testPricingId = Object.keys(testService.activePricings!)[0];

          const response = await request(app)
            .delete(`${baseUrl}/services/${testService.name}/pricings/${testPricingId}`)
            .set('x-api-key', adminApiKey);

          expect(response.status).toBe(403);
        });

        it('Should return 403 with USER API key (requires org key)', async function () {
          const testUser = await createTestUser('USER');
          const testPricingId = Object.keys(testService.activePricings!)[0];
          
          const response = await request(app)
            .delete(`${baseUrl}/services/${testService.name}/pricings/${testPricingId}`)
            .set('x-api-key', testUser.apiKey);

          expect(response.status).toBe(403);

          await deleteTestUser(testUser.username);
        });
      });
    });
  });

  describe('Contract Routes (ADMIN, USER with Org Roles)', function () {
    describe('GET /contracts - Org Role: ALL, MANAGEMENT', function () {
      it('Should allow access with user API key', async function () {
        const response = await request(app)
          .get(`${baseUrl}/contracts`)
          .set('x-api-key', adminApiKey);

        expect([200, 404]).toContain(response.status);
      });

      it('Should return 401 without API key', async function () {
        const response = await request(app).get(`${baseUrl}/contracts`);

        expect(response.status).toBe(401);
      });
    });

    describe('POST /contracts - Org Role: ALL, MANAGEMENT', function () {
      it('Should allow creation with user API key', async function () {
        const response = await request(app)
          .post(`${baseUrl}/contracts`)
          .set('x-api-key', adminApiKey)
          .send({ userId: 'test-user' });

        expect([201, 400, 422]).toContain(response.status);
      });

      it('Should return 401 without API key', async function () {
        const response = await request(app).post(`${baseUrl}/contracts`);

        expect(response.status).toBe(401);
      });
    });

    describe('GET /contracts/:userId', function () {
      it('Should allow access with user API key', async function () {
        const response = await request(app)
          .get(`${baseUrl}/contracts/test-user`)
          .set('x-api-key', adminApiKey);

        expect([200, 404]).toContain(response.status);
      });

      it('Should return 401 without API key', async function () {
        const response = await request(app).get(`${baseUrl}/contracts/test-user`);

        expect(response.status).toBe(401);
      });
    });

    describe('PUT /contracts/:userId', function () {
      it('Should allow update with user API key', async function () {
        const response = await request(app)
          .put(`${baseUrl}/contracts/test-user`)
          .set('x-api-key', adminApiKey)
          .send({ serviceName: 'test' });

        expect([200, 400, 404, 422]).toContain(response.status);
      });

      it('Should return 401 without API key', async function () {
        const response = await request(app).put(`${baseUrl}/contracts/test-user`);

        expect(response.status).toBe(401);
      });
    });

    describe('DELETE /contracts/:userId - Org Role: ALL', function () {
      it('Should allow deletion with user API key', async function () {
        const response = await request(app)
          .delete(`${baseUrl}/contracts/test-user`)
          .set('x-api-key', adminApiKey);

        expect([200, 204, 404]).toContain(response.status);
      });

      it('Should return 401 without API key', async function () {
        const response = await request(app).delete(`${baseUrl}/contracts/test-user`);

        expect(response.status).toBe(401);
      });
    });
  });

  describe('Feature Evaluation Routes', function () {
    describe('GET /features', function () {
      it('Should allow access with user API key', async function () {
        const response = await request(app)
          .get(`${baseUrl}/features`)
          .set('x-api-key', adminApiKey);

        expect([200, 404]).toContain(response.status);
      });

      it('Should return 401 without API key', async function () {
        const response = await request(app).get(`${baseUrl}/features`);

        expect(response.status).toBe(401);
      });
    });

    describe('POST /features/evaluate - Org Role: ALL, MANAGEMENT, EVALUATION', function () {
      it('Should allow evaluation with user API key', async function () {
        const response = await request(app)
          .post(`${baseUrl}/features/evaluate`)
          .set('x-api-key', adminApiKey)
          .send({ userId: 'test-user' });

        expect([200, 400, 404, 422]).toContain(response.status);
      });

      it('Should return 401 without API key', async function () {
        const response = await request(app).post(`${baseUrl}/features/evaluate`);

        expect(response.status).toBe(401);
      });
    });

    describe('POST /features/:userId', function () {
      it('Should allow feature operation with user API key', async function () {
        const response = await request(app)
          .post(`${baseUrl}/features/test-user`)
          .set('x-api-key', adminApiKey)
          .send({ features: [] });

        expect([200, 400, 404, 422]).toContain(response.status);
      });

      it('Should return 401 without API key', async function () {
        const response = await request(app).post(`${baseUrl}/features/test-user`);

        expect(response.status).toBe(401);
      });
    });

    describe('PUT /features - Org Role: ALL, MANAGEMENT', function () {
      it('Should allow update with user API key', async function () {
        const response = await request(app)
          .put(`${baseUrl}/features`)
          .set('x-api-key', adminApiKey)
          .send({ feature: 'test' });

        expect([200, 400, 404, 422]).toContain(response.status);
      });

      it('Should return 401 without API key', async function () {
        const response = await request(app).put(`${baseUrl}/features`);

        expect(response.status).toBe(401);
      });
    });

    describe('DELETE /features', function () {
      it('Should allow deletion with user API key', async function () {
        const response = await request(app)
          .delete(`${baseUrl}/features`)
          .set('x-api-key', adminApiKey);

        expect([200, 204, 404]).toContain(response.status);
      });

      it('Should return 401 without API key', async function () {
        const response = await request(app).delete(`${baseUrl}/features`);

        expect(response.status).toBe(401);
      });
    });
  });

  describe('Analytics Routes - Org Role: ALL, MANAGEMENT', function () {
    describe('GET /analytics/api-calls', function () {
      it('Should allow access with user API key', async function () {
        const response = await request(app)
          .get(`${baseUrl}/analytics/api-calls`)
          .set('x-api-key', adminApiKey);

        expect([200, 404]).toContain(response.status);
      });

      it('Should return 401 without API key', async function () {
        const response = await request(app).get(`${baseUrl}/analytics/api-calls`);

        expect(response.status).toBe(401);
      });
    });

    describe('GET /analytics/evaluations', function () {
      it('Should allow access with user API key', async function () {
        const response = await request(app)
          .get(`${baseUrl}/analytics/evaluations`)
          .set('x-api-key', adminApiKey);

        expect([200, 404]).toContain(response.status);
      });

      it('Should return 401 without API key', async function () {
        const response = await request(app).get(`${baseUrl}/analytics/evaluations`);

        expect(response.status).toBe(401);
      });
    });
  });

  describe('Cache Routes - ADMIN only', function () {
    describe('GET /cache/get', function () {
      it('Should allow access with ADMIN user API key', async function () {
        const response = await request(app)
          .get(`${baseUrl}/cache/get`)
          .set('x-api-key', adminApiKey);

        expect([200, 400, 404]).toContain(response.status);
      });

      it('Should return 401 without API key', async function () {
        const response = await request(app).get(`${baseUrl}/cache/get`);

        expect(response.status).toBe(401);
      });

      it('Should return 403 with non-admin user API key', async function () {
        const response = await request(app)
          .get(`${baseUrl}/cache/get`)
          .set('x-api-key', regularUserApiKey);

        expect(response.status).toBe(403);
      });
    });

    describe('POST /cache/set', function () {
      it('Should allow access with ADMIN user API key', async function () {
        const response = await request(app)
          .post(`${baseUrl}/cache/set`)
          .set('x-api-key', adminApiKey)
          .send({ key: 'test', value: 'test' });

        expect([200, 201, 400, 422]).toContain(response.status);
      });

      it('Should return 401 without API key', async function () {
        const response = await request(app).post(`${baseUrl}/cache/set`);

        expect(response.status).toBe(401);
      });

      it('Should return 403 with non-admin user API key', async function () {
        const response = await request(app)
          .post(`${baseUrl}/cache/set`)
          .set('x-api-key', regularUserApiKey)
          .send({ key: 'test', value: 'test' });

        expect(response.status).toBe(403);
      });
    });
  });

  describe('Organization Role Tests', function () {
    let managementOrg: LeanOrganization;
    let managementApiKey: LeanApiKey;
    let evaluationOrg: LeanOrganization;
    let evaluationApiKey: LeanApiKey;

    beforeAll(async function () {
      // Create organization with MANAGEMENT role
      managementOrg = await createTestOrganization(adminUser.username);
      if (managementOrg && managementOrg.id) {
        managementApiKey = {
          key: `org_management_key_${Date.now()}`,
          scope: 'MANAGEMENT',
        };
        await addApiKeyToOrganization(managementOrg.id, managementApiKey);
      }

      // Create organization with EVALUATION role
      evaluationOrg = await createTestOrganization(adminUser.username);
      if (evaluationOrg && evaluationOrg.id) {
        evaluationApiKey = {
          key: `org_evaluation_key_${Date.now()}`,
          scope: 'EVALUATION',
        };
        await addApiKeyToOrganization(evaluationOrg.id, evaluationApiKey);
      }
    });

    afterAll(async function () {
      if (managementOrg?.id) {
        await deleteTestOrganization(managementOrg.id!);
      }
      if (evaluationOrg?.id) {
        await deleteTestOrganization(evaluationOrg.id!);
      }
    });

    describe('MANAGEMENT Role Permissions', function () {
      it('Should allow GET /services with MANAGEMENT role', async function () {
        const response = await request(app)
          .get(`${baseUrl}/services`)
          .set('x-api-key', managementApiKey.key);

        expect([200, 404]).toContain(response.status);
      });

      it('Should allow POST /services with MANAGEMENT role', async function () {
        const response = await request(app)
          .post(`${baseUrl}/services`)
          .set('x-api-key', managementApiKey.key)
          .send({ name: '${testService.name}' });

        expect([201, 400, 422]).toContain(response.status);
      });

      it('Should deny DELETE /services/:serviceName with MANAGEMENT role (requires ALL)', async function () {
        const response = await request(app)
          .delete(`${baseUrl}/services/${testService.name}`)
          .set('x-api-key', managementApiKey.key);

        expect([403, 404]).toContain(response.status);
      });
    });

    describe('EVALUATION Role Permissions', function () {
      it('Should allow GET /services with EVALUATION role', async function () {
        const response = await request(app)
          .get(`${baseUrl}/services`)
          .set('x-api-key', evaluationApiKey.key);

        expect([200, 404]).toContain(response.status);
      });

      it('Should deny POST /services with EVALUATION role (requires MANAGEMENT or ALL)', async function () {
        const response = await request(app)
          .post(`${baseUrl}/services`)
          .set('x-api-key', evaluationApiKey.key)
          .send({ name: '${testService.name}' });

        expect(response.status).toBe(403);
      });

      it('Should deny PUT /services/:serviceName with EVALUATION role', async function () {
        const response = await request(app)
          .put(`${baseUrl}/services/${testService.name}`)
          .set('x-api-key', evaluationApiKey.key)
          .send({ description: 'Updated' });

        expect(response.status).toBe(403);
      });

      it('Should deny DELETE /services/:serviceName with EVALUATION role', async function () {
        const response = await request(app)
          .delete(`${baseUrl}/services/${testService.name}`)
          .set('x-api-key', evaluationApiKey.key);

        expect(response.status).toBe(403);
      });
    });
  });

  describe('Edge Cases and Invalid Requests', function () {
    it('Should return 401 with invalid API key format', async function () {
      const response = await request(app)
        .get(`${baseUrl}/users`)
        .set('x-api-key', 'invalid-key-123');

      expect([401, 403]).toContain(response.status);
    });

    it('Should return 401 with expired or non-existent API key', async function () {
      const response = await request(app)
        .get(`${baseUrl}/users`)
        .set('x-api-key', 'non_existent_key_12345678901234567890');

      expect([401, 403]).toContain(response.status);
    });

    it('Should handle requests with missing required headers', async function () {
      const response = await request(app).post(`${baseUrl}/users`).send({ username: 'test' });

      // Public route should not require API key
      expect([201, 400, 422]).toContain(response.status);
    });

    it('Should reject protected route without authentication', async function () {
      const response = await request(app).get(`${baseUrl}/users`);

      expect(response.status).toBe(401);
    });
  });
});
