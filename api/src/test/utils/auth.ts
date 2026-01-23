import { createTestUser, deleteTestUser } from './users/userTestUtils';
import { Server } from 'http';
import request from 'supertest';

// Admin user for testing
let testAdminUser: any = null;

/**
 * Retrieves an admin user for testing purposes.
 * Creates a new one if it does not exist.
 */
export const getTestAdminUser = async (): Promise<any> => {
  if (!testAdminUser) {
    testAdminUser = await createTestUser('ADMIN');
  }
  return testAdminUser;
};

/**
 * Retrieves the API Key of an admin user for use in tests.
 */
export const getTestAdminApiKey = async (): Promise<string> => {
  const admin = await getTestAdminUser();
  return admin.apiKey;
};

/**
 * Adds the API Key header to a supertest request.
 * Useful for including in all test requests.
 */
export const withApiKey = async (request: request.Test): Promise<request.Test> => {
  const apiKey = await getTestAdminApiKey();
  return request.set('x-api-key', apiKey);
};

/**
 * Performs a GET request with the admin API Key.
 */
export const authenticatedGet = async (app: Server, path: string): Promise<request.Response> => {
  const apiKey = await getTestAdminApiKey();
  return request(app)
    .get(path)
    .set('x-api-key', apiKey);
};

/**
 * Performs a POST request with the admin API Key.
 */
export const authenticatedPost = async (app: Server, path: string, body?: any): Promise<request.Response> => {
  const apiKey = await getTestAdminApiKey();
  const req = request(app)
    .post(path)
    .set('x-api-key', apiKey);
  
  if (body) {
    return req.send(body);
  }
  return req;
};

/**
 * Cleans up authentication resources after tests.
 */
export const cleanupAuthResources = async (): Promise<void> => {
  if (testAdminUser?.username) {
    await deleteTestUser(testAdminUser.username);
    testAdminUser = null;
  }
};
