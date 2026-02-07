import { Server } from 'http';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import { USER_ROLES } from '../main/types/permissions';
import { baseUrl, getApp, shutdownApp } from './utils/testApp';
import { createTestUser, deleteTestUser } from './utils/users/userTestUtils';
import OrganizationService from '../main/services/OrganizationService';
import container from '../main/config/container';
import { addMemberToOrganization, createTestOrganization, deleteTestOrganization } from './utils/organization/organizationTestUtils';

describe('User API routes', function () {
  let app: Server;
  let adminUser: any;
  let adminApiKey: string;
  let organizationService: OrganizationService;
  const usersToCleanup: Set<string> = new Set();
  const orgToCleanup: Set<string> = new Set();

  const trackUserForCleanup = (user?: any) => {
    if (user?.username && user.username !== adminUser?.username) {
      usersToCleanup.add(user.username);
    }
  };
  const trackOrganizationForCleanup = (organization?: any) => {
    if (organization?.id) {
      orgToCleanup.add(organization.id);
    }
  };

  beforeAll(async function () {
    app = await getApp();
    adminUser = await createTestUser('ADMIN');
    adminApiKey = adminUser.apiKey;
    organizationService = container.resolve('organizationService');
  });

  afterEach(async function () {
    for (const username of usersToCleanup) {
      await deleteTestUser(username);
    }
    
    for (const id of orgToCleanup) {
      await deleteTestOrganization(id);
    }
    usersToCleanup.clear();
    orgToCleanup.clear();
  });

  afterAll(async function () {
    if (adminUser?.username) {
      await deleteTestUser(adminUser.username);
    }
    await shutdownApp();
  });

  describe('POST /users/authenticate', function () {
    it('returns 200 when credentials are valid', async function () {
      const response = await request(app)
        .post(`${baseUrl}/users/authenticate`)
        .send({ username: adminUser.username, password: 'password123' });

      expect(response.status).toBe(200);
      expect(response.body.apiKey).toBeDefined();
      expect(response.body.apiKey).toBe(adminApiKey);
      expect(response.body.username).toBe(adminUser.username);
      expect(response.body.role).toBe('ADMIN');
    });

    it('returns 401 when password is invalid', async function () {
      const response = await request(app)
        .post(`${baseUrl}/users/authenticate`)
        .send({ username: adminUser.username, password: 'wrong-password' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });

    it('returns 422 when required fields are missing', async function () {
      const response = await request(app)
        .post(`${baseUrl}/users/authenticate`)
        .send({ username: adminUser.username });

      expect(response.status).toBe(422);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('GET /users', function () {
    it('returns 200 and a list when api key is provided', async function () {
      const response = await request(app)
        .get(`${baseUrl}/users`)
        .set('x-api-key', adminApiKey);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('returns 401 when api key is missing', async function () {
      const response = await request(app).get(`${baseUrl}/users`);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('API Key');
    });
  });

  describe('POST /users', function () {
    it('returns 201 when creating a user with explicit role', async function () {
      const userData = {
        username: `test_user_${Date.now()}`,
        password: 'password123',
        role: USER_ROLES[USER_ROLES.length - 1],
      };

      const response = await request(app).post(`${baseUrl}/users`).send(userData);

      expect(response.status).toBe(201);
      expect(response.body.username).toBe(userData.username);
      expect(response.body.role).toBe(userData.role);
      expect(response.body.apiKey).toBeDefined();
      trackUserForCleanup(response.body);

      const organizations = await organizationService.findByOwner(userData.username);

      expect(organizations.length).toBe(1);
      expect(organizations[0].name).toBe(`${userData.username}'s Organization`);
    });
    
    it('returns 201 when ADMIN tries to create ADMIN', async function () {
      const userData = {
        username: `test_user_${Date.now()}`,
        password: 'password123',
        role: USER_ROLES[0],
      };

      const response = await request(app).post(`${baseUrl}/users`).set('x-api-key', adminApiKey).send(userData);

      expect(response.status).toBe(201);
      expect(response.body.username).toBe(userData.username);
      expect(response.body.role).toBe(userData.role);
      expect(response.body.apiKey).toBeDefined();
      trackUserForCleanup(response.body);

      const organizations = await organizationService.findByOwner(userData.username);

      expect(organizations.length).toBe(1);
      expect(organizations[0].name).toBe(`${userData.username}'s Organization`);
    });

    it('returns 201 and assigns default role when role is missing', async function () {
      const userData = {
        username: `test_user_${Date.now()}`,
        password: 'password123',
      };

      const response = await request(app).post(`${baseUrl}/users`).send(userData);

      expect(response.status).toBe(201);
      expect(response.body.username).toBe(userData.username);
      expect(response.body.role).toBe(USER_ROLES[USER_ROLES.length - 1]);
      expect(response.body.apiKey).toBeDefined();
      trackUserForCleanup(response.body);

      const organizations = await organizationService.findByOwner(userData.username);

      expect(organizations.length).toBe(1);
      expect(organizations[0].name).toBe(`${userData.username}'s Organization`);
    });

    it('returns 403 when non-admin tries to create an admin', async function () {
      const creator = await createTestUser('USER');
      trackUserForCleanup(creator);

      const userData = {
        username: `test_user_${Date.now()}`,
        password: 'password123',
        role: USER_ROLES[0],
      };

      const response = await request(app)
        .post(`${baseUrl}/users`)
        .set('x-api-key', creator.apiKey)
        .send(userData);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('PERMISSION ERROR: Only admins can create other admins.');
    });

    it('returns 422 when role is invalid', async function () {
      const response = await request(app)
        .post(`${baseUrl}/users`)
        .send({ username: `test_user_${Date.now()}`, password: 'password123', role: 'INVALID_ROLE' });

      expect(response.status).toBe(422);
      expect(response.body.error).toBeDefined();
    });

    it('returns 422 when password is missing', async function () {
      const response = await request(app)
        .post(`${baseUrl}/users`)
        .send({ username: `test_user_${Date.now()}` });

      expect(response.status).toBe(422);
      expect(response.body.error).toBeDefined();
    });

    it('returns 404 when creating a duplicated username', async function () {
      const existingUser = await createTestUser('USER');
      trackUserForCleanup(existingUser);

      const response = await request(app)
        .post(`${baseUrl}/users`)
        .send({ username: existingUser.username, password: 'password123' });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('already');
    });
  });

  describe('GET /users/:username', function () {
    it('returns 200 when user exists', async function () {
      const testUser = await createTestUser('USER');
      trackUserForCleanup(testUser);

      const response = await request(app)
        .get(`${baseUrl}/users/${testUser.username}`)
        .set('x-api-key', adminApiKey);

      expect(response.status).toBe(200);
      expect(response.body.username).toBe(testUser.username);
    });

    it('returns 404 when user does not exist', async function () {
      const response = await request(app)
        .get(`${baseUrl}/users/non_existing_user`)
        .set('x-api-key', adminApiKey);

      expect(response.status).toBe(404);
      expect(response.body.error).toBeDefined();
    });

    it('returns 401 when api key is missing', async function () {
      const testUser = await createTestUser('USER');
      trackUserForCleanup(testUser);

      const response = await request(app).get(`${baseUrl}/users/${testUser.username}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('API Key');
    });
  });

  describe('PUT /users/:username', function () {
    it('returns 200 when admin updates username', async function () {
      const testUser = await createTestUser('USER');
      trackUserForCleanup(testUser);

      const updatedUsername = `updated_${Date.now()}`;
      const response = await request(app)
        .put(`${baseUrl}/users/${testUser.username}`)
        .set('x-api-key', adminApiKey)
        .send({ username: updatedUsername });

      expect(response.status).toBe(200);
      expect(response.body.username).toBe(updatedUsername);
      trackUserForCleanup(response.body);
    });

    it('returns 404 when target user is not found', async function () {
      const response = await request(app)
        .put(`${baseUrl}/users/non_existing_user`)
        .set('x-api-key', adminApiKey)
        .send({ username: `updated_${Date.now()}` });

      expect(response.status).toBe(404);
      expect(response.body.error).toBeDefined();
    });

    it('returns 404 when updating username to an existing one', async function () {
      const firstUser = await createTestUser('USER');
      const secondUser = await createTestUser('USER');
      trackUserForCleanup(firstUser);
      trackUserForCleanup(secondUser);

      const response = await request(app)
        .put(`${baseUrl}/users/${firstUser.username}`)
        .set('x-api-key', adminApiKey)
        .send({ username: secondUser.username });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('already');
    });

    it('returns 403 when non-admin tries to promote to admin', async function () {
      const creator = await createTestUser('USER');
      const targetUser = await createTestUser('USER');
      trackUserForCleanup(creator);
      trackUserForCleanup(targetUser);

      const response = await request(app)
        .put(`${baseUrl}/users/${targetUser.username}`)
        .set('x-api-key', creator.apiKey)
        .send({ role: USER_ROLES[0] });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('PERMISSION ERROR: Only admins can change roles to admin.');
    });

    it('returns 403 when non-admin updates an admin', async function () {
      const creator = await createTestUser('USER');
      const adminTarget = await createTestUser('ADMIN');
      trackUserForCleanup(creator);
      trackUserForCleanup(adminTarget);

      const response = await request(app)
        .put(`${baseUrl}/users/${adminTarget.username}`)
        .set('x-api-key', creator.apiKey)
        .send({ username: `updated_${Date.now()}` });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('PERMISSION ERROR: Only admins can update admin users.');
    });

    it('returns 401 when api key is missing', async function () {
      const testUser = await createTestUser('USER');
      trackUserForCleanup(testUser);

      const response = await request(app)
        .put(`${baseUrl}/users/${testUser.username}`)
        .send({ username: `updated_${Date.now()}` });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('API Key');
    });
  });

  describe('PUT /users/:username/api-key', function () {
    it('returns 200 and regenerates api key', async function () {
      const oldApiKey = adminApiKey;
      const response = await request(app)
        .put(`${baseUrl}/users/${adminUser.username}/api-key`)
        .set('x-api-key', oldApiKey);

      expect(response.status).toBe(200);
      expect(response.body.apiKey).toBeDefined();
      expect(response.body.apiKey).not.toBe(oldApiKey);
      adminApiKey = response.body.apiKey;

      const refreshed = await request(app)
        .get(`${baseUrl}/users/${adminUser.username}`)
        .set('x-api-key', adminApiKey);
      expect(refreshed.status).toBe(200);
    });

    it('returns 401 when api key is missing', async function () {
      const response = await request(app)
        .put(`${baseUrl}/users/${adminUser.username}/api-key`);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('API Key');
    });

    it('returns 500 when user does not exist', async function () {
      const response = await request(app)
        .put(`${baseUrl}/users/non_existing_user/api-key`)
        .set('x-api-key', adminApiKey);

      expect(response.status).toBe(500);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('PUT /users/:username/role', function () {
    it('returns 200 when admin promotes a user to admin', async function () {
      const testUser = await createTestUser(USER_ROLES[USER_ROLES.length - 1]);
      trackUserForCleanup(testUser);

      const response = await request(app)
        .put(`${baseUrl}/users/${testUser.username}/role`)
        .set('x-api-key', adminApiKey)
        .send({ role: 'ADMIN' });

      expect(response.status).toBe(200);
      expect(response.body.role).toBe('ADMIN');
      trackUserForCleanup(response.body);
    });

    it('returns 403 when non-admin assigns ADMIN', async function () {
      const creator = await createTestUser('USER');
      const targetUser = await createTestUser('USER');
      trackUserForCleanup(creator);
      trackUserForCleanup(targetUser);

      const response = await request(app)
        .put(`${baseUrl}/users/${targetUser.username}/role`)
        .set('x-api-key', creator.apiKey)
        .send({ role: 'ADMIN' });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('PERMISSION ERROR: Only admins can assign the role ADMIN.');
    });

    it('returns 403 when non-admin modifies an admin', async function () {
      const creator = await createTestUser('USER');
      const adminTarget = await createTestUser('ADMIN');
      trackUserForCleanup(creator);
      trackUserForCleanup(adminTarget);

      const response = await request(app)
        .put(`${baseUrl}/users/${adminTarget.username}/role`)
        .set('x-api-key', creator.apiKey)
        .send({ role: USER_ROLES[USER_ROLES.length - 1] });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('PERMISSION ERROR: Only admins can update admin users.');
    });

    it('returns 403 when trying to demote the last admin', async function () {
      const response = await request(app)
        .put(`${baseUrl}/users/${adminUser.username}/role`)
        .set('x-api-key', adminApiKey)
        .send({ role: USER_ROLES[USER_ROLES.length - 1] });

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('There must always be at least one ADMIN');
    });

    it('returns 422 when role is invalid', async function () {
      const testUser = await createTestUser('USER');
      trackUserForCleanup(testUser);

      const response = await request(app)
        .put(`${baseUrl}/users/${testUser.username}/role`)
        .set('x-api-key', adminApiKey)
        .send({ role: 'INVALID_ROLE' });

      expect(response.status).toBe(422);
      expect(response.body.error).toBeDefined();
    });

    it('returns 404 when user does not exist', async function () {
      const response = await request(app)
        .put(`${baseUrl}/users/non_existing_user/role`)
        .set('x-api-key', adminApiKey)
        .send({ role: USER_ROLES[USER_ROLES.length - 1] });

      expect(response.status).toBe(404);
      expect(response.body.error).toBeDefined();
    });

    it('returns 401 when api key is missing', async function () {
      const testUser = await createTestUser('USER');
      trackUserForCleanup(testUser);

      const response = await request(app)
        .put(`${baseUrl}/users/${testUser.username}/role`)
        .send({ role: USER_ROLES[USER_ROLES.length - 1] });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('API Key');
    });
  });

  describe('DELETE /users/:username', function () {
    it('returns 204 when admin deletes a user', async function () {
      const testUser = await createTestUser('USER');
      trackUserForCleanup(testUser);

      const response = await request(app)
        .delete(`${baseUrl}/users/${testUser.username}`)
        .set('x-api-key', adminApiKey);

      expect(response.status).toBe(204);

      const getResponse = await request(app)
        .get(`${baseUrl}/users/${testUser.username}`)
        .set('x-api-key', adminApiKey);
      expect(getResponse.status).toBe(404);
    });
    
    it('returns 204 when deleting a user and remove organization', async function () {
      const testUser = await createTestUser('USER');
      const testOrg = await createTestOrganization(testUser.username);
      
      trackUserForCleanup(testUser);
      trackOrganizationForCleanup(testOrg);

      await request(app)
        .delete(`${baseUrl}/users/${testUser.username}`)
        .set('x-api-key', adminApiKey).expect(204);
      
      const response = await request(app)
        .get(`${baseUrl}/organizations/${testOrg.id}`)
        .set('x-api-key', adminApiKey);

      expect(response.status).toBe(404);
    });
    
    it('returns 204 when deleting a user and transfer organization ownership to ADMIN', async function () {
      const testUser = await createTestUser('USER');
      const testUserAdmin = await createTestUser('USER');
      const testUserManager = await createTestUser('USER');
      const testOrg = await createTestOrganization(testUser.username);
      await addMemberToOrganization(testOrg.id!, { username: testUserAdmin.username, role: 'ADMIN' });
      await addMemberToOrganization(testOrg.id!, { username: testUserManager.username, role: 'MANAGER' });
      
      trackUserForCleanup(testUser);
      trackUserForCleanup(testUserAdmin);
      trackUserForCleanup(testUserManager);
      trackOrganizationForCleanup(testOrg);

      await request(app)
        .delete(`${baseUrl}/users/${testUser.username}`)
        .set('x-api-key', adminApiKey).expect(204);
      
      const response = await request(app)
        .get(`${baseUrl}/organizations/${testOrg.id}`)
        .set('x-api-key', adminApiKey);

      expect(response.status).toBe(200);
      expect(response.body.owner).toBe(testUserAdmin.username);
    });
    
    it('returns 204 when deleting a user and transfer organization ownership to MANAGER', async function () {
      const testUser = await createTestUser('USER');
      const testUserManager = await createTestUser('USER');
      const testUserEvaluator = await createTestUser('USER');
      const testOrg = await createTestOrganization(testUser.username);
      await addMemberToOrganization(testOrg.id!, { username: testUserManager.username, role: 'MANAGER' });
      await addMemberToOrganization(testOrg.id!, { username: testUserEvaluator.username, role: 'EVALUATOR' });
      
      trackUserForCleanup(testUser);
      trackUserForCleanup(testUserManager);
      trackUserForCleanup(testUserEvaluator);
      trackOrganizationForCleanup(testOrg);

      await request(app)
        .delete(`${baseUrl}/users/${testUser.username}`)
        .set('x-api-key', adminApiKey).expect(204);
      
      const response = await request(app)
        .get(`${baseUrl}/organizations/${testOrg.id}`)
        .set('x-api-key', adminApiKey);

      expect(response.status).toBe(200);
      expect(response.body.owner).toBe(testUserManager.username);
    });
    
    it('returns 204 when deleting a user and transfer organization ownership to EVALUATOR', async function () {
      const testUser = await createTestUser('USER');
      const testUserEvaluator = await createTestUser('USER');
      const testOrg = await createTestOrganization(testUser.username);
      await addMemberToOrganization(testOrg.id!, { username: testUserEvaluator.username, role: 'EVALUATOR' });
      
      trackUserForCleanup(testUser);
      trackUserForCleanup(testUserEvaluator);
      trackOrganizationForCleanup(testOrg);

      await request(app)
        .delete(`${baseUrl}/users/${testUser.username}`)
        .set('x-api-key', adminApiKey).expect(204);
      
      const response = await request(app)
        .get(`${baseUrl}/organizations/${testOrg.id}`)
        .set('x-api-key', adminApiKey);

      expect(response.status).toBe(200);
      expect(response.body.owner).toBe(testUserEvaluator.username);
    });
    
    it('returns 204 when deleting a user, removing organization and transfer organization ownership to EVALUATOR', async function () {
      const testUser = await createTestUser('USER');
      const testUserAdmin = await createTestUser('USER');
      const testOrg1 = await createTestOrganization(testUser.username);
      const testOrg2 = await createTestOrganization(testUser.username);
      await addMemberToOrganization(testOrg2.id!, { username: testUserAdmin.username, role: 'ADMIN' });
      
      trackUserForCleanup(testUser);
      trackUserForCleanup(testUserAdmin);
      trackOrganizationForCleanup(testOrg1);
      trackOrganizationForCleanup(testOrg2);

      await request(app)
        .delete(`${baseUrl}/users/${testUser.username}`)
        .set('x-api-key', adminApiKey).expect(204);
      
      const responseOrg1 = await request(app)
        .get(`${baseUrl}/organizations/${testOrg1.id}`)
        .set('x-api-key', adminApiKey);

      expect(responseOrg1.status).toBe(404);

      const responseOrg2 = await request(app)
        .get(`${baseUrl}/organizations/${testOrg2.id}`)
        .set('x-api-key', adminApiKey);

      expect(responseOrg2.status).toBe(200);
      expect(responseOrg2.body.owner).toBe(testUserAdmin.username);
    });

    it('returns 404 when deleting a non-existent user', async function () {
      const response = await request(app)
        .delete(`${baseUrl}/users/non_existing_user`)
        .set('x-api-key', adminApiKey);

      expect(response.status).toBe(404);
      expect(response.body.error).toBeDefined();
    });

    it('returns 403 when non-admin tries to delete an admin', async function () {
      const regularUser = await createTestUser('USER');
      const targetAdmin = await createTestUser('ADMIN');
      trackUserForCleanup(regularUser);
      trackUserForCleanup(targetAdmin);

      const response = await request(app)
        .delete(`${baseUrl}/users/${targetAdmin.username}`)
        .set('x-api-key', regularUser.apiKey);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe('PERMISSION ERROR: Only admins can delete admin users.');
    });

    it('returns 401 when api key is missing', async function () {
      const testUser = await createTestUser('USER');
      trackUserForCleanup(testUser);

      const response = await request(app)
        .delete(`${baseUrl}/users/${testUser.username}`);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('API Key');
    });
  });
});
