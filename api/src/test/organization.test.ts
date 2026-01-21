import request from 'supertest';
import { baseUrl, getApp, shutdownApp } from './utils/testApp';
import { Server } from 'http';
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import {
  createTestUser,
  deleteTestUser,
} from './utils/users/userTestUtils';
import {
  createTestOrganization,
  addApiKeyToOrganization,
  addMemberToOrganization,
  removeApiKeyFromOrganization,
  removeMemberFromOrganization,
  deleteTestOrganization,
} from './utils/organization/organizationTestUtils';
import { USER_ROLES } from '../main/types/permissions';
import { LeanOrganization } from '../main/types/models/Organization';

describe('Organization API Test Suite', function () {
  let app: Server;
  let adminUser: any;
  let adminApiKey: string;
  let regularUser: any;
  let regularUserApiKey: string;

  beforeAll(async function () {
    app = await getApp();
    // Create an admin user for tests
    adminUser = await createTestUser('ADMIN');
    adminApiKey = adminUser.apiKey;
    
    // Create a regular user for tests
    regularUser = await createTestUser('USER');
    regularUserApiKey = regularUser.apiKey;
  });

  afterAll(async function () {
    // Clean up the created users
    if (adminUser?.username) {
      await deleteTestUser(adminUser.username);
    }
    if (regularUser?.username) {
      await deleteTestUser(regularUser.username);
    }
    await shutdownApp();
  });

  describe('GET /organizations', function () {
    let testOrganizations: LeanOrganization[] = [];

    beforeAll(async function () {
      // Create multiple test organizations
      for (let i = 0; i < 3; i++) {
        const org = await createTestOrganization();
        testOrganizations.push(org);
      }
    });

    it('Should return 200 and all organizations for admin users', async function () {
      const response = await request(app)
        .get(`${baseUrl}/organizations/`)
        .set('x-api-key', adminApiKey)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('Should return 200 and only own organizations for regular users', async function () {
      const userOrg = await createTestOrganization();
      
      const response = await request(app)
        .get(`${baseUrl}/organizations/`)
        .set('x-api-key', regularUserApiKey)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      // Regular users should only see their own organizations
      expect(response.body.every((org: any) => org.owner === regularUser.username)).toBe(true);
    });
  });

  describe('POST /organizations', function () {
    let testUser: any;
    let createdOrganizations: LeanOrganization[] = [];

    beforeEach(async function () {
      testUser = await createTestUser('USER');
    });

    afterEach(async function () {
      // Clean up created organizations and test user
      if (testUser?.username) {
        await deleteTestUser(testUser.username);
      }
    });

    it('Should return 201 and create a new organization', async function () {
      const organizationData = {
        name: `Test Organization ${Date.now()}`,
        owner: testUser.username,
      };

      const response = await request(app)
        .post(`${baseUrl}/organizations/`)
        .set('x-api-key', adminApiKey)
        .send(organizationData)
        .expect(201);

      expect(response.body.name).toBe(organizationData.name);
      expect(response.body.owner).toBe(organizationData.owner);
      expect(response.body.apiKeys).toBeDefined();
      expect(Array.isArray(response.body.apiKeys)).toBe(true);
      expect(response.body.apiKeys.length).toBeGreaterThan(0);
      expect(response.body.members).toBeDefined();
      expect(Array.isArray(response.body.members)).toBe(true);

      createdOrganizations.push(response.body);
    });

    it('Should return 422 when creating organization without required fields', async function () {
      const organizationData = {
        name: `Test Organization ${Date.now()}`,
      };

      const response = await request(app)
        .post(`${baseUrl}/organizations/`)
        .set('x-api-key', adminApiKey)
        .send(organizationData)
        .expect(422);

      expect(response.body.error).toBeDefined();
    });

    it('Should return 400 when owner user does not exist', async function () {
      const organizationData = {
        name: `Test Organization ${Date.now()}`,
        owner: `nonexistent_user_${Date.now()}`,
      };

      const response = await request(app)
        .post(`${baseUrl}/organizations/`)
        .set('x-api-key', adminApiKey)
        .send(organizationData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('Should return 422 when organization name is not provided', async function () {
      const organizationData = {
        owner: testUser.username,
      };

      const response = await request(app)
        .post(`${baseUrl}/organizations/`)
        .set('x-api-key', adminApiKey)
        .send(organizationData)
        .expect(422);

      expect(response.body.error).toBeDefined();
    });

    it('Should return 422 when organization name is empty', async function () {
      const organizationData = {
        name: '',
        owner: testUser.username,
      };

      const response = await request(app)
        .post(`${baseUrl}/organizations/`)
        .set('x-api-key', adminApiKey)
        .send(organizationData)
        .expect(422);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /organizations/:organizationId', function () {
    let testOrganization: LeanOrganization;

    beforeAll(async function () {
      testOrganization = await createTestOrganization();
    });

    it('Should return 200 and the organization details', async function () {
      const response = await request(app)
        .get(`${baseUrl}/organizations/${testOrganization.id}`)
        .set('x-api-key', adminApiKey)
        .expect(200);

      expect(response.body.id).toBe(testOrganization.id);
      expect(response.body.name).toBe(testOrganization.name);
      expect(response.body.owner).toBeDefined();
      expect(response.body.ownerDetails.username).toBe(testOrganization.owner);
      expect(response.body.ownerDetails.password).toBeUndefined();
    });

    it('Should return 404 when organization does not exist', async function () {
      const fakeId = '000000000000000000000000';

      const response = await request(app)
        .get(`${baseUrl}/organizations/${fakeId}`)
        .set('x-api-key', adminApiKey)
        .expect(404);

      expect(response.body.error).toBeDefined();
    });

    it('Should return 400 with invalid organization ID format', async function () {
      const response = await request(app)
        .get(`${baseUrl}/organizations/invalid-id`)
        .set('x-api-key', adminApiKey)
        .expect(422);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('PUT /organizations/:organizationId', function () {
    let ownerUser: any;
    let otherUser: any;

    beforeEach(async function () {
      ownerUser = await createTestUser('USER');
      otherUser = await createTestUser('USER');
    });

    afterEach(async function () {
      if (ownerUser?.username) {
        await deleteTestUser(ownerUser.username);
      }
      if (otherUser?.username) {
        await deleteTestUser(otherUser.username);
      }
    });

    it('Should return 200 and update organization name when owner request', async function () {
      const ownerApiKey = ownerUser.apiKey;
      const testOrg = await createTestOrganization(ownerUser.username);

      const updateData = {
        name: `Updated Organization ${Date.now()}`,
      };

      const response = await request(app)
        .put(`${baseUrl}/organizations/${testOrg.id}`)
        .set('x-api-key', ownerApiKey)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
    });

    it('Should return 200 and update organization name when SPACE admin request', async function () {
      const adminApiKey = adminUser.apiKey;
      const testOrg = await createTestOrganization(ownerUser.username);

      const updateData = {
        name: `Updated Organization ${Date.now()}`,
      };

      const response = await request(app)
        .put(`${baseUrl}/organizations/${testOrg.id}`)
        .set('x-api-key', adminApiKey)
        .send(updateData)
        .expect(200);

      expect(response.body.name).toBe(updateData.name);
    });

    it('Should return 200 and update organization owner when owner request', async function () {
      const ownerApiKey = ownerUser.apiKey;
      const testOrg = await createTestOrganization(ownerUser.username);
      const newOwner = otherUser.username;

      const updateData = {
        owner: newOwner,
      };

      const response = await request(app)
        .put(`${baseUrl}/organizations/${testOrg.id}`)
        .set('x-api-key', ownerApiKey)
        .send(updateData)
        .expect(200);

      expect(response.body.owner).toBe(newOwner);
    });

    it('Should return 200 and update organization owner when SPACE admin request', async function () {
      const adminApiKey = adminUser.apiKey;
      const testOrg = await createTestOrganization(ownerUser.username);
      const newOwner = otherUser.username;

      const updateData = {
        owner: newOwner,
      };

      const response = await request(app)
        .put(`${baseUrl}/organizations/${testOrg.id}`)
        .set('x-api-key', adminApiKey)
        .send(updateData)
        .expect(200);

      expect(response.body.owner).toBe(newOwner);
    });

    it('Should return 403 when neither organization owner or SPACE admin', async function () {
      const notOwnerApiKey = otherUser.apiKey;
      const testOrg = await createTestOrganization(ownerUser.username);

      const updateData = {
        name: `Updated Organization ${Date.now()}`,
      };

      const response = await request(app)
        .put(`${baseUrl}/organizations/${testOrg.id}`)
        .set('x-api-key', notOwnerApiKey)
        .send(updateData)
        .expect(403);

      expect(response.body.error).toBeDefined();
    });

    it('Should return 400 when updating with non-existent owner', async function () {
      const ownerApiKey = ownerUser.apiKey;
      const testOrg = await createTestOrganization(ownerUser.username);

      const updateData = {
        owner: `nonexistent_user_${Date.now()}`,
      };

      const response = await request(app)
        .put(`${baseUrl}/organizations/${testOrg.id}`)
        .set('x-api-key', ownerApiKey)
        .send(updateData)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('Should return 422 when updating with invalid name type', async function () {
      const ownerApiKey = ownerUser.apiKey;
      const testOrg = await createTestOrganization(ownerUser.username);

      const updateData = {
        name: 12345, // Invalid: should be string
      };

      const response = await request(app)
        .put(`${baseUrl}/organizations/${testOrg.id}`)
        .set('x-api-key', ownerApiKey)
        .send(updateData)
        .expect(422);

      expect(response.body.error).toBeDefined();
    });

    it('Should return 404 when organization does not exist', async function () {
      const fakeId = '000000000000000000000000';
      const ownerApiKey = ownerUser.apiKey;

      const updateData = {
        name: `Updated Organization ${Date.now()}`,
      };

      const response = await request(app)
        .put(`${baseUrl}/organizations/${fakeId}`)
        .set('x-api-key', ownerApiKey)
        .send(updateData)
        .expect(404);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /organizations/members', function () {
    let testOrganization: LeanOrganization;
    let ownerUser: any;
    let managerUser: any;
    let memberUser: any;
    let regularUserNoPermission: any;

    beforeEach(async function () {
      ownerUser = await createTestUser('USER');
      managerUser = await createTestUser('USER');
      testOrganization = await createTestOrganization(ownerUser.username);
      memberUser = await createTestUser('USER');
      regularUserNoPermission = await createTestUser('USER');
      
      // Add owner to organization
      await addMemberToOrganization(testOrganization.id!, {username: managerUser.username, role: 'MANAGER'});
    });

    afterEach(async function () {
      if (testOrganization?.id) {
        await deleteTestOrganization(testOrganization.id);
      }
      if (ownerUser?.username) {
        await deleteTestUser(ownerUser.username);
      }
      if (managerUser?.username) {
        await deleteTestUser(managerUser.username);
      }
      if (memberUser?.username) {
        await deleteTestUser(memberUser.username);
      }
      if (regularUserNoPermission?.username) {
        await deleteTestUser(regularUserNoPermission.username);
      }
    });

    it('Should return 200 and add member to organization with owner request', async function () {
      const response = await request(app)
        .post(`${baseUrl}/organizations/${testOrganization.id}/members`)
        .set('x-api-key', ownerUser.apiKey)
        .send({ username: memberUser.username, role: 'MANAGER' })
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('Should return 200 and add member to organization with organization manager request', async function () {
      const response = await request(app)
        .post(`${baseUrl}/organizations/${testOrganization.id}/members`)
        .set('x-api-key', managerUser.apiKey)
        .send({ username: memberUser.username, role: 'EVALUATOR' })
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('Should return 200 and add member to organization with SPACE admin request', async function () {
      const response = await request(app)
        .post(`${baseUrl}/organizations/${testOrganization.id}/members`)
        .set('x-api-key', adminApiKey)
        .send({ username: memberUser.username, role: 'EVALUATOR' })
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('Should return 400 when adding non-existent user as member', async function () {
      const response = await request(app)
        .post(`${baseUrl}/organizations/${testOrganization.id}/members`)
        .set('x-api-key', adminApiKey)
        .send({ username: `nonexistent_user_${Date.now()}`, role: 'EVALUATOR' })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('Should return 403 when user without org role tries to add member', async function () {
      const response = await request(app)
        .post(`${baseUrl}/organizations/${testOrganization.id}/members`)
        .set('x-api-key', regularUserNoPermission.apiKey)
        .send({ username: memberUser.username, role: 'EVALUATOR' })
        .expect(403);

      expect(response.body.error).toBeDefined();
    });

    it('Should return 422 when empty request body is sent', async function () {
      const response = await request(app)
        .post(`${baseUrl}/organizations/${testOrganization.id}/members`)
        .set('x-api-key', adminApiKey)
        .send({})
        .expect(422);

      expect(response.body.error).toBeDefined();
    });
    
    it('Should return 422 when username field not sent', async function () {
      const response = await request(app)
        .post(`${baseUrl}/organizations/${testOrganization.id}/members`)
        .set('x-api-key', adminApiKey)
        .send({role: "EVALUATOR"})
        .expect(422);

      expect(response.body.error).toBeDefined();
    });
    
    it('Should return 422 when username field is empty', async function () {
      const response = await request(app)
        .post(`${baseUrl}/organizations/${testOrganization.id}/members`)
        .set('x-api-key', adminApiKey)
        .send({username: "", role: "EVALUATOR"})
        .expect(422);

      expect(response.body.error).toBeDefined();
    });

    it('Should return 422 when role field is not sent', async function () {
      const response = await request(app)
        .post(`${baseUrl}/organizations/${testOrganization.id}/members`)
        .set('x-api-key', adminApiKey)
        .send({username: memberUser.username})
        .expect(422);

      expect(response.body.error).toBeDefined();
    });

    it('Should return 422 when role field is empty', async function () {
      const response = await request(app)
        .post(`${baseUrl}/organizations/${testOrganization.id}/members`)
        .set('x-api-key', adminApiKey)
        .send({username: memberUser.username, role: ""})
        .expect(422);

      expect(response.body.error).toBeDefined();
    });

    it('Should return 422 when role field is invalid', async function () {
      const response = await request(app)
        .post(`${baseUrl}/organizations/${testOrganization.id}/members`)
        .set('x-api-key', adminApiKey)
        .send({username: memberUser.username, role: "INVALID_ROLE"})
        .expect(422);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /organizations/api-keys', function () {
    let testOrganization: LeanOrganization;
    let regularUserNoPermission: any;

    beforeEach(async function () {
      testOrganization = await createTestOrganization();
      regularUserNoPermission = await createTestUser('USER');
    });

    afterEach(async function () {
      if (regularUserNoPermission?.username) {
        await deleteTestUser(regularUserNoPermission.username);
      }
    });

    it('Should return 200 and create new API key with scope ALL', async function () {
      const response = await request(app)
        .post(`${baseUrl}/organizations/api-keys`)
        .set('x-api-key', adminApiKey)
        .query({ organizationId: testOrganization.id })
        .send({ keyScope: 'ALL' })
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('Should return 200 and create new API key with custom scope', async function () {
      const response = await request(app)
        .post(`${baseUrl}/organizations/api-keys`)
        .set('x-api-key', adminApiKey)
        .query({ organizationId: testOrganization.id })
        .send({ keyScope: 'READ' })
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('Should return 403 when user without org role tries to add API key', async function () {
      const response = await request(app)
        .post(`${baseUrl}/organizations/api-keys`)
        .set('x-api-key', regularUserNoPermission.apiKey)
        .query({ organizationId: testOrganization.id })
        .send({ keyScope: 'ALL' })
        .expect(403);

      expect(response.body.error).toBeDefined();
    });

    it('Should return 400 when keyScope is missing', async function () {
      const response = await request(app)
        .post(`${baseUrl}/organizations/api-keys`)
        .set('x-api-key', adminApiKey)
        .query({ organizationId: testOrganization.id })
        .send({})
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('Should return 400 when organizationId query parameter is missing', async function () {
      const response = await request(app)
        .post(`${baseUrl}/organizations/api-keys`)
        .set('x-api-key', adminApiKey)
        .send({ keyScope: 'ALL' })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('DELETE /organizations/members', function () {
    let testOrganization: LeanOrganization;
    let memberUser: any;
    let regularUserNoPermission: any;

    beforeEach(async function () {
      testOrganization = await createTestOrganization();
      memberUser = await createTestUser('USER');
      regularUserNoPermission = await createTestUser('USER');
    });

    afterEach(async function () {
      if (memberUser?.username) {
        await deleteTestUser(memberUser.username);
      }
      if (regularUserNoPermission?.username) {
        await deleteTestUser(regularUserNoPermission.username);
      }
    });

    it('Should return 200 and remove member from organization', async function () {
      const response = await request(app)
        .delete(`${baseUrl}/organizations/${testOrganization.id}/members`)
        .set('x-api-key', adminApiKey)
        .send({ username: memberUser.username, role: 'MANAGER' }).expect(200);

      expect(response.body).toBeDefined();
    });

    it('Should return 400 when removing non-existent member', async function () {
      const response = await request(app)
        .delete(`${baseUrl}/organizations/members`)
        .set('x-api-key', adminApiKey)
        .query({ organizationId: testOrganization.id })
        .send({ username: `nonexistent_user_${Date.now()}` })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('Should return 403 when user without org role tries to remove member', async function () {
      const response = await request(app)
        .delete(`${baseUrl}/organizations/members`)
        .set('x-api-key', regularUserNoPermission.apiKey)
        .query({ organizationId: testOrganization.id })
        .send({ username: memberUser.username })
        .expect(403);

      expect(response.body.error).toBeDefined();
    });

    it('Should return 400 when username field is missing', async function () {
      const response = await request(app)
        .delete(`${baseUrl}/organizations/members`)
        .set('x-api-key', adminApiKey)
        .query({ organizationId: testOrganization.id })
        .send({})
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('DELETE /organizations/api-keys', function () {
    let testOrganization: LeanOrganization;
    let testApiKey: string;
    let regularUserNoPermission: any;

    beforeEach(async function () {
      testOrganization = await createTestOrganization();
      regularUserNoPermission = await createTestUser('USER');
      
      // Create an API key to delete
      const apiKeyData = {
        key: `test_key_${Date.now()}`,
        scope: 'ALL' as const,
      };
      await addApiKeyToOrganization(testOrganization.id, apiKeyData);
      testApiKey = apiKeyData.key;
    });

    afterEach(async function () {
      if (regularUserNoPermission?.username) {
        await deleteTestUser(regularUserNoPermission.username);
      }
    });

    it('Should return 200 and delete API key from organization', async function () {
      const response = await request(app)
        .delete(`${baseUrl}/organizations/api-keys`)
        .set('x-api-key', adminApiKey)
        .query({ organizationId: testOrganization.id })
        .send({ apiKey: testApiKey })
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('Should return 400 when deleting non-existent API key', async function () {
      const response = await request(app)
        .delete(`${baseUrl}/organizations/api-keys`)
        .set('x-api-key', adminApiKey)
        .query({ organizationId: testOrganization.id })
        .send({ apiKey: `nonexistent_key_${Date.now()}` })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('Should return 403 when user without org role tries to delete API key', async function () {
      const response = await request(app)
        .delete(`${baseUrl}/organizations/api-keys`)
        .set('x-api-key', regularUserNoPermission.apiKey)
        .query({ organizationId: testOrganization.id })
        .send({ apiKey: testApiKey })
        .expect(403);

      expect(response.body.error).toBeDefined();
    });

    it('Should return 400 when apiKey field is missing', async function () {
      const response = await request(app)
        .delete(`${baseUrl}/organizations/api-keys`)
        .set('x-api-key', adminApiKey)
        .query({ organizationId: testOrganization.id })
        .send({})
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('Should return 400 when organizationId query parameter is missing', async function () {
      const response = await request(app)
        .delete(`${baseUrl}/organizations/api-keys`)
        .set('x-api-key', adminApiKey)
        .send({ apiKey: testApiKey })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });
});
