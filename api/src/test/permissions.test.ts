import request from 'supertest';
import { baseUrl, getApp, shutdownApp } from './utils/testApp';
import { Server } from 'http';
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import {
  createTestUser,
  deleteTestUser,
} from './utils/users/userTestUtils';
import { USER_ROLES } from '../main/types/permissions';
import { createRandomContract } from './utils/contracts/contracts';

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

  // describe('UserRole-based Access Control', function () {
  //   let evaluatorUser: any;
  //   let managerUser: any;

  //   beforeEach(async function () {
  //     // Create users with different roles
  //     evaluatorUser = await createTestUser('EVALUATOR');
  //     managerUser = await createTestUser('MANAGER');
  //   });

  //   afterEach(async function () {
  //     // Clean up created users
  //     if (evaluatorUser?.username) await deleteTestUser(evaluatorUser.username);
  //     if (managerUser?.username) await deleteTestUser(managerUser.username);
  //   });

  //   describe('EVALUATOR Role', function () {
  //     it('EVALUATOR user should be able to access GET /services endpoint', async function () {
  //       const getServicesResponse = await request(app)
  //         .get(`${baseUrl}/services`)
  //         .set('x-api-key', evaluatorUser.apiKey);

  //       expect(getServicesResponse.status).toBe(200);
  //     });

  //     it('EVALUATOR user should be able to access GET /features endpoint', async function () {
  //       const getFeaturesResponse = await request(app)
  //         .get(`${baseUrl}/features`)
  //         .set('x-api-key', evaluatorUser.apiKey);

  //       expect(getFeaturesResponse.status).toBe(200);
  //     });

  //     it('EVALUATOR user should NOT be able to access GET /users endpoint', async function () {
  //       const getUsersResponse = await request(app)
  //         .get(`${baseUrl}/users`)
  //         .set('x-api-key', evaluatorUser.apiKey);

  //       expect(getUsersResponse.status).toBe(403);
  //     });

  //     it('EVALUATOR user should be able to use POST operations on /features endpoint', async function () {
  //       const newContract = await createRandomContract(app);

  //       const postFeaturesResponse = await request(app)
  //         .post(`${baseUrl}/features/${newContract.userContact.userId}`)
  //         .set('x-api-key', evaluatorUser.apiKey);

  //       expect(postFeaturesResponse.status).toBe(200);
  //     });

  //     it('EVALUATOR user should NOT be able to use POST operations on /users endpoint', async function () {
  //       const postUsersResponse = await request(app)
  //         .post(`${baseUrl}/users`)
  //         .set('x-api-key', evaluatorUser.apiKey)
  //         .send({
  //       username: `test_user_${Date.now()}`,
  //       password: 'password123',
  //       role: USER_ROLES[USER_ROLES.length - 1],
  //         });

  //       expect(postUsersResponse.status).toBe(403);
  //     });

  //     it('EVALUATOR user should NOT be able to use PUT operations on /users endpoint', async function () {
  //       const putUsersResponse = await request(app)
  //         .put(`${baseUrl}/users/${evaluatorUser.username}`)
  //         .set('x-api-key', evaluatorUser.apiKey)
  //         .send({
  //       username: `updated_${Date.now()}`,
  //         });

  //       expect(putUsersResponse.status).toBe(403);
  //     });

  //     it('EVALUATOR user should NOT be able to use DELETE operations on /users endpoint', async function () {
  //       const deleteUsersResponse = await request(app)
  //         .delete(`${baseUrl}/users/${evaluatorUser.username}`)
  //         .set('x-api-key', evaluatorUser.apiKey);
        
  //       expect(deleteUsersResponse.status).toBe(403);
  //     });
  //   });

  //   describe('MANAGER Role', function () {
  //     it('MANAGER user should be able to access GET /services endpoint', async function () {
  //       const response = await request(app)
  //         .get(`${baseUrl}/services`)
  //         .set('x-api-key', managerUser.apiKey);

  //       expect(response.status).toBe(200);
  //     });

  //     it('MANAGER user should be able to access GET /users endpoint', async function () {
  //       const response = await request(app)
  //         .get(`${baseUrl}/users`)
  //         .set('x-api-key', managerUser.apiKey);

  //       expect(response.status).toBe(200);
  //     });

  //     it('MANAGER user should be able to use POST operations on /users endpoint', async function () {
  //       const userData = {
  //         username: `test_user_${Date.now()}`,
  //         password: 'password123',
  //         role: USER_ROLES[USER_ROLES.length - 1],
  //       }

  //       const response = await request(app)
  //         .post(`${baseUrl}/users`)
  //         .set('x-api-key', managerUser.apiKey)
  //         .send(userData);

  //       expect(response.status).toBe(201);
  //     });

  //     it('MANAGER user should NOT be able to create ADMIN users', async function () {
  //       const userData = {
  //         username: `test_user_${Date.now()}`,
  //         password: 'password123',
  //         role: USER_ROLES[0], // ADMIN role
  //       }

  //       const response = await request(app)
  //         .post(`${baseUrl}/users`)
  //         .set('x-api-key', managerUser.apiKey)
  //         .send(userData);

  //       expect(response.status).toBe(403);
  //     });

  //     it('MANAGER user should be able to use PUT operations on /users endpoint', async function () {
  //       // First create a service to update
  //       const userData = {
  //         username: `test_user_${Date.now()}`,
  //         password: 'password123',
  //         role: USER_ROLES[USER_ROLES.length - 1],
  //       }
        
  //       const createResponse = await request(app)
  //         .post(`${baseUrl}/users`)
  //         .set('x-api-key', adminApiKey)
  //         .send(userData);
          
  //       const username = createResponse.body.username;
        
  //       // Test update operation
  //       const updateData = {
  //         username: `updated_${Date.now()}`,
  //       };
        
  //       const response = await request(app)
  //         .put(`${baseUrl}/users/${username}`)
  //         .set('x-api-key', managerUser.apiKey)
  //         .send(updateData);
          
  //       expect(response.status).toBe(200);
  //     });

  //     it('MANAGER user should NOT be able to use DELETE operations', async function () {
  //       const response = await request(app)
  //         .delete(`${baseUrl}/services/1234`)
  //         .set('x-api-key', managerUser.apiKey);

  //       expect(response.status).toBe(403);
  //     });
  //   })

  //   describe('ADMIN Role', function () {
  //     it('ADMIN user should have GET access to user endpoints', async function () {
  //       const getResponse = await request(app).get(`${baseUrl}/users`).set('x-api-key', adminApiKey);
  //       expect(getResponse.status).toBe(200);
  //     });

  //     it('ADMIN user should have POST access to create users', async function () {
  //       const userData = {
  //         username: `new_user_${Date.now()}`,
  //         password: 'password123',
  //         role: USER_ROLES[USER_ROLES.length - 1],
  //       };
        
  //       const postResponse = await request(app)
  //         .post(`${baseUrl}/users`)
  //         .set('x-api-key', adminApiKey)
  //         .send(userData);
          
  //       expect(postResponse.status).toBe(201);
        
  //       // Clean up
  //       await request(app)
  //         .delete(`${baseUrl}/users/${postResponse.body.username}`)
  //         .set('x-api-key', adminApiKey);
  //     });

  //     it('ADMIN user should have DELETE access to remove users', async function () {
  //       // First create a user to delete
  //       const userData = {
  //         username: `delete_user_${Date.now()}`,
  //         password: 'password123',
  //         role: USER_ROLES[USER_ROLES.length - 1],
  //       };
        
  //       const createResponse = await request(app)
  //         .post(`${baseUrl}/users`)
  //         .set('x-api-key', adminApiKey)
  //         .send(userData);
          
  //       // Then test deletion
  //       const deleteResponse = await request(app)
  //         .delete(`${baseUrl}/users/${createResponse.body.username}`)
  //         .set('x-api-key', adminApiKey);
          
  //       expect(deleteResponse.status).toBe(204);
  //     });
  //   })
  // });
});