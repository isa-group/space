import request from 'supertest';
import { baseUrl } from '../testApp';
import { Server } from 'http';
import UserMongoose from '../../../main/repositories/mongoose/models/UserMongoose';
import { UserRole, USER_ROLES } from '../../../main/types/permissions';

// Create a test user directly in the database
export const createTestUser = async (role: UserRole = USER_ROLES[USER_ROLES.length - 1], username: string = `test_user_${Date.now()}`): Promise<any> => {
  const userData = {
    username: username,
    password: 'password123',
    role
  };

  // Create user directly in the database
  const user = new UserMongoose(userData);
  await user.save();
  
  return user.toObject();
};

// Generate a new API Key for a user
export const regenerateApiKey = async (app: Server, userId: string, apiKey: string): Promise<string> => {
  const response = await request(app)
    .put(`${baseUrl}/users/${userId}/api-key`)
    .set('x-api-key', apiKey);
  
  return response.body.apiKey;
};

// Change the role of a user
export const changeUserRole = async (app: Server, userId: string, newRole: UserRole, apiKey: string): Promise<any> => {
  const response = await request(app)
    .put(`${baseUrl}/users/${userId}/role`)
    .set('x-api-key', apiKey)
    .send({ role: newRole });
  
  return response.body;
};

// Delete a test user directly from the database
export const deleteTestUser = async (userId: string): Promise<void> => {
  await UserMongoose.deleteOne({ username: userId });
};
