import request from 'supertest';
import { baseUrl, getApp, shutdownApp } from './utils/testApp';
import { Server } from 'http';
import { describe, it, expect, beforeAll, afterAll, afterEach } from 'vitest';
import {
  createTestUser,
  deleteTestUser,
} from './utils/users/userTestUtils';
import { USER_ROLES } from '../main/types/permissions';

describe('User API Test Suite', function () {
  let app: Server;
  let adminUser: any;
  let adminApiKey: string;

  beforeAll(async function () {
    app = await getApp();
    // Create an admin user for tests
    adminUser = await createTestUser('ADMIN');
    adminApiKey = adminUser.apiKey;
  });

  afterAll(async function () {
    // Clean up the created admin user
    if (adminUser?.username) {
      await deleteTestUser(adminUser.username);
    }
    await shutdownApp();
  });

  describe('Authentication and API Keys', function () {
    it('Should authenticate a user and return their information', async function () {
      const response = await request(app).post(`${baseUrl}/users/authenticate`).send({
        username: adminUser.username,
        password: 'password123',
      });

      expect(response.status).toBe(200);
      expect(response.body.apiKey).toBeDefined();
      expect(response.body.apiKey).toBe(adminApiKey);
    });

    it('Should regenerate an API Key for a user', async function () {
      const oldApiKey = adminUser.apiKey;
      const response = await request(app)
        .put(`${baseUrl}/users/${adminUser.username}/api-key`)
        .set('x-api-key', oldApiKey);

      expect(response.status).toBe(200);
      expect(response.body.apiKey).toBeDefined();
      expect(response.body.apiKey).not.toBe(oldApiKey);

      // Update the API Key for future tests
      adminApiKey = response.body.apiKey;
      // Update the user in the database
      const updatedUser = (await request(app).get(`${baseUrl}/users/${adminUser.username}`).set('x-api-key', adminApiKey)).body;
      adminUser = updatedUser;
    });
  });

  describe('User Management', function () {
    let testUser: any;

    afterEach(async function () {
      if (testUser?.username) {
        await deleteTestUser(testUser.username);
        testUser = null;
      }
    });

    it('Should create a new user', async function () {
      const userData = {
        username: `test_user_${Date.now()}`,
        password: 'password123',
        role: USER_ROLES[USER_ROLES.length - 1],
      };

      const response = await request(app)
        .post(`${baseUrl}/users`)
        .set('x-api-key', adminApiKey)
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.username).toBe(userData.username);
      expect(response.body.role).toBe(userData.role);
      expect(response.body.apiKey).toBeDefined();

      testUser = response.body;
    });
    
    it('Should create user without providing role', async function () {
      const userData = {
        username: `test_user_${Date.now()}`,
        password: 'password123',
      };

      const response = await request(app)
        .post(`${baseUrl}/users`)
        .set('x-api-key', adminApiKey)
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.username).toBe(userData.username);
      expect(response.body.role).toBe(USER_ROLES[USER_ROLES.length - 1]);
      expect(response.body.apiKey).toBeDefined();

      testUser = response.body;
    });

    it('Should NOT create admin user', async function () {
      const creatorData = await createTestUser('USER');
      
      const userData = {
        username: `test_user_${Date.now()}`,
        password: 'password123',
        role: USER_ROLES[0],
      };

      const response = await request(app)
        .post(`${baseUrl}/users`)
        .set('x-api-key', creatorData.apiKey)
        .send(userData);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe("PERMISSION ERROR: Only admins can create other admins.");
    });
    
    it('Should create admin user provided admin api key', async function () {
      const creatorData = await createTestUser('ADMIN');
      
      const userData = {
        username: `test_user_${Date.now()}`,
        password: 'password123',
        role: USER_ROLES[0],
      };

      const response = await request(app)
        .post(`${baseUrl}/users`)
        .set('x-api-key', creatorData.apiKey)
        .send(userData);

      expect(response.status).toBe(201);
    });

    it('Should get all users', async function () {
      const response = await request(app).get(`${baseUrl}/users`).set('x-api-key', adminApiKey);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('Should get a user by username', async function () {
      testUser = await createTestUser(USER_ROLES[USER_ROLES.length - 1]);

      const response = await request(app)
        .get(`${baseUrl}/users/${testUser.username}`)
        .set('x-api-key', adminApiKey);

      expect(response.status).toBe(200);
      expect(response.body.username).toBe(testUser.username);
    });

    it('Should update a user', async function () {
      testUser = await createTestUser('USER');

      const updatedData = {
        username: `updated_${Date.now()}`, // Use timestamp to ensure uniqueness
      };

      const response = await request(app)
        .put(`${baseUrl}/users/${testUser.username}`)
        .set('x-api-key', adminApiKey)
        .send(updatedData);

      expect(response.status).toBe(200);
      expect(response.body.username).toBe(updatedData.username);

      // Update the test user
      testUser = response.body;
    });

    it('Should NOT update admin user with USER role', async function () {
      const creatorData = await createTestUser('USER');
      const testAdmin = await createTestUser('ADMIN');
      
      const userData = {
        role: USER_ROLES[0],
      };

      const response = await request(app)
        .put(`${baseUrl}/users/${testAdmin.username}`)
        .set('x-api-key', creatorData.apiKey)
        .send(userData);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe("PERMISSION ERROR: Only admins can change roles to admin.");
    });

    it('Should NOT update admin user with USER role', async function () {
      const creatorData = await createTestUser('USER');
      const testAdmin = await createTestUser('ADMIN');
      
      const userData = {
        username: `updated_${Date.now()}`,
      };

      const response = await request(app)
        .put(`${baseUrl}/users/${testAdmin.username}`)
        .set('x-api-key', creatorData.apiKey)
        .send(userData);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe("PERMISSION ERROR: Only admins can update admin users.");
    });

    it("Should change a user's role", async function () {
      // First create a test user
      testUser = await createTestUser(USER_ROLES[USER_ROLES.length - 1]);

      const newRole = 'ADMIN';
      const response = await request(app)
        .put(`${baseUrl}/users/${testUser.username}/role`)
        .set('x-api-key', adminApiKey)
        .send({ role: newRole });

      expect(response.status).toBe(200);
      expect(response.body.username).toBe(testUser.username);
      expect(response.body.role).toBe(newRole);

      // Update the test user
      testUser = response.body;
    });

    it("Should NOT change an admin's role", async function () {
      const creatorData = await createTestUser('USER');
      const adminUser = await createTestUser(USER_ROLES[0]);

      const newRole = 'USER';

      const response = await request(app)
        .put(`${baseUrl}/users/${adminUser.username}/role`)
        .set('x-api-key', creatorData.apiKey)
        .send({ role: newRole });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe("PERMISSION ERROR: Only admins can update admin users.");
    });

    it("Should NOT change a user's role to ADMIN", async function () {
      const creatorData = await createTestUser('USER');
      const evaluatorUser = await createTestUser(USER_ROLES[USER_ROLES.length - 1]);

      const newRole = 'ADMIN';

      const response = await request(app)
        .put(`${baseUrl}/users/${evaluatorUser.username}/role`)
        .set('x-api-key', creatorData.apiKey)
        .send({ role: newRole });

      expect(response.status).toBe(403);
      expect(response.body.error).toBe("PERMISSION ERROR: Only admins can assign the role ADMIN.");
    });

    it('Should delete a user', async function () {
      // First create a test user
      testUser = await createTestUser(USER_ROLES[USER_ROLES.length - 1]);

      const response = await request(app)
        .delete(`${baseUrl}/users/${testUser.username}`)
        .set('x-api-key', adminApiKey);

      expect(response.status).toBe(204);

      // Try to get the deleted user
      const getResponse = await request(app)
        .get(`${baseUrl}/users/${testUser.username}`)
        .set('x-api-key', adminApiKey);

      expect(getResponse.status).toBe(404);

      // To avoid double cleanup
      testUser = null;
    });
    
    it('Should not delete a admin being user', async function () {
      // First create a test user
      testUser = await createTestUser(USER_ROLES[USER_ROLES.length - 1]);
      adminUser = await createTestUser(USER_ROLES[0]);

      const response = await request(app)
        .delete(`${baseUrl}/users/${adminUser.username}`)
        .set('x-api-key', testUser.apiKey);

      expect(response.status).toBe(403);
      expect(response.body.error).toBe("PERMISSION ERROR: Only admins can delete admin users.");
    });
  });
});
