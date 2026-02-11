import request from 'supertest';
import { baseUrl, getApp, shutdownApp } from './utils/testApp';
import { Server } from 'http';
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { createTestUser, deleteTestUser } from './utils/users/userTestUtils';
import {
  createTestOrganization,
  addApiKeyToOrganization,
  addMemberToOrganization,
  deleteTestOrganization,
} from './utils/organization/organizationTestUtils';
import { LeanOrganization } from '../main/types/models/Organization';
import { LeanUser } from '../main/types/models/User';
import crypto, { randomUUID } from 'crypto';

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
      // Create multiple test organizations for pagination tests
      for (let i = 0; i < 15; i++) {
        const org = await createTestOrganization(adminUser.username);
        testOrganizations.push(org);
      }
    });

    afterAll(async function () {
      // Clean up test organizations
      for (const org of testOrganizations) {
        if (org.id) {
          await deleteTestOrganization(org.id);
        }
      }
    });

    describe('Admin Users - Paginated Response', function () {
      it('Should return 200 with paginated data structure for admin users', async function () {
        const response = await request(app)
          .get(`${baseUrl}/organizations/`)
          .set('x-api-key', adminApiKey)
          .expect(200);

        expect(response.body).toHaveProperty('data');
        expect(response.body).toHaveProperty('pagination');
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.pagination).toHaveProperty('offset');
        expect(response.body.pagination).toHaveProperty('limit');
        expect(response.body.pagination).toHaveProperty('total');
        expect(response.body.pagination).toHaveProperty('page');
        expect(response.body.pagination).toHaveProperty('pages');
      });

      it('Should return default pagination (limit=10, offset=0) when not specified', async function () {
        const response = await request(app)
          .get(`${baseUrl}/organizations/`)
          .set('x-api-key', adminApiKey)
          .expect(200);

        expect(response.body.pagination.limit).toBe(10);
        expect(response.body.pagination.offset).toBe(0);
        expect(response.body.pagination.page).toBe(1);
        expect(response.body.data.length).toBeLessThanOrEqual(10);
      });

      it('Should respect custom limit parameter', async function () {
        const response = await request(app)
          .get(`${baseUrl}/organizations/?limit=5`)
          .set('x-api-key', adminApiKey)
          .expect(200);

        expect(response.body.pagination.limit).toBe(5);
        expect(response.body.data.length).toBeLessThanOrEqual(5);
      });

      it('Should respect custom offset parameter', async function () {
        const firstPage = await request(app)
          .get(`${baseUrl}/organizations/?limit=5&offset=0`)
          .set('x-api-key', adminApiKey)
          .expect(200);

        const secondPage = await request(app)
          .get(`${baseUrl}/organizations/?limit=5&offset=5`)
          .set('x-api-key', adminApiKey)
          .expect(200);

        expect(secondPage.body.pagination.offset).toBe(5);
        expect(secondPage.body.pagination.page).toBe(2);
        
        // Verify different data if there are enough organizations
        if (firstPage.body.pagination.total > 5) {
          expect(firstPage.body.data[0].id).not.toBe(secondPage.body.data[0].id);
        }
      });

      it('Should calculate total pages correctly', async function () {
        const response = await request(app)
          .get(`${baseUrl}/organizations/?limit=5`)
          .set('x-api-key', adminApiKey)
          .expect(200);

        const expectedPages = Math.ceil(response.body.pagination.total / 5) || 1;
        expect(response.body.pagination.pages).toBe(expectedPages);
      });

      it('Should filter by organization name with query parameter', async function () {
        // Create organization with unique name
        const uniqueOrg = await createTestOrganization(adminUser.username);
        const uniqueName = uniqueOrg.name;

        const response = await request(app)
          .get(`${baseUrl}/organizations/?q=${uniqueName}`)
          .set('x-api-key', adminApiKey)
          .expect(200);

        expect(response.body.data.length).toBeGreaterThan(0);
        expect(response.body.data.some((org: any) => org.name === uniqueName)).toBe(true);
        
        // Clean up
        if (uniqueOrg.id) {
          await deleteTestOrganization(uniqueOrg.id);
        }
      });

      it('Should perform case-insensitive search', async function () {
        // Create organization with known name
        const testOrg = await createTestOrganization(adminUser.username);
        const orgName = testOrg.name;

        const response = await request(app)
          .get(`${baseUrl}/organizations/?q=${orgName.toLowerCase()}`)
          .set('x-api-key', adminApiKey)
          .expect(200);

        expect(response.body.data.some((org: any) => 
          org.name.toLowerCase().includes(orgName.toLowerCase())
        )).toBe(true);
        
        // Clean up
        if (testOrg.id) {
          await deleteTestOrganization(testOrg.id);
        }
      });

      it('Should return 400 for invalid limit (too low)', async function () {
        const response = await request(app)
          .get(`${baseUrl}/organizations/?limit=0`)
          .set('x-api-key', adminApiKey)
          .expect(400);

        expect(response.body.error).toBeDefined();
        expect(response.body.error).toContain('Limit must be between 1 and 50');
      });

      it('Should return 400 for invalid limit (too high)', async function () {
        const response = await request(app)
          .get(`${baseUrl}/organizations/?limit=51`)
          .set('x-api-key', adminApiKey)
          .expect(400);

        expect(response.body.error).toBeDefined();
        expect(response.body.error).toContain('Limit must be between 1 and 50');
      });

      it('Should return 400 for invalid offset (negative)', async function () {
        const response = await request(app)
          .get(`${baseUrl}/organizations/?offset=-1`)
          .set('x-api-key', adminApiKey)
          .expect(400);

        expect(response.body.error).toBeDefined();
        expect(response.body.error).toContain('Offset must be a non-negative number');
      });

      it('Should handle non-numeric limit gracefully', async function () {
        const response = await request(app)
          .get(`${baseUrl}/organizations/?limit=abc`)
          .set('x-api-key', adminApiKey)
          .expect(400);

        expect(response.body.error).toBeDefined();
      });

      it('Should handle non-numeric offset gracefully', async function () {
        const response = await request(app)
          .get(`${baseUrl}/organizations/?offset=xyz`)
          .set('x-api-key', adminApiKey)
          .expect(400);

        expect(response.body.error).toBeDefined();
      });

      it('Should return all organizations when search query is empty', async function () {
        const response = await request(app)
          .get(`${baseUrl}/organizations/?q=`)
          .set('x-api-key', adminApiKey)
          .expect(200);

        expect(response.body.data.length).toBeGreaterThan(0);
        expect(response.body.pagination.total).toBeGreaterThan(0);
      });

      it('Should combine search and pagination parameters', async function () {
        const response = await request(app)
          .get(`${baseUrl}/organizations/?q=test&limit=3&offset=0`)
          .set('x-api-key', adminApiKey)
          .expect(200);

        expect(response.body.pagination.limit).toBe(3);
        expect(response.body.pagination.offset).toBe(0);
        expect(response.body.data.length).toBeLessThanOrEqual(3);
      });
    });

    describe('Regular Users - Non-Paginated Response', function () {
      it('Should return 200 with non-paginated data structure for regular users', async function () {
        const response = await request(app)
          .get(`${baseUrl}/organizations/`)
          .set('x-api-key', regularUserApiKey)
          .expect(200);

        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body).not.toHaveProperty('pagination');
      });

      it('Should return only organizations where user is owner or member', async function () {
        const userOrg = await createTestOrganization(regularUser.username);

        const response = await request(app)
          .get(`${baseUrl}/organizations/`)
          .set('x-api-key', regularUserApiKey)
          .expect(200);

        expect(Array.isArray(response.body.data)).toBe(true);
        // Regular users should see organizations where they are owner or member
        expect(response.body.data.every((org: any) => 
          org.owner === regularUser.username || 
          org.members.some((m: any) => m.username === regularUser.username)
        )).toBe(true);
        
        // Clean up
        if (userOrg.id) {
          await deleteTestOrganization(userOrg.id);
        }
      });

      it('Should include organizations where user is a member', async function () {
        // Create an organization owned by admin
        const regularUserOrg = await createTestOrganization(regularUser.username);
        const adminOrg = await createTestOrganization(adminUser.username);
        
        // Add regular user as a member
        await addMemberToOrganization(adminOrg.id!, { username: regularUser.username, role: 'MANAGER' });

        // Get organizations for regular user
        const response = await request(app)
          .get(`${baseUrl}/organizations/`)
          .set('x-api-key', regularUserApiKey)
          .expect(200);

        expect(Array.isArray(response.body.data)).toBe(true);
        
        // Regular user should see organizations where they are owner
        const ownedOrgs = response.body.data.filter((org: any) => org.owner === regularUser.username);
        expect(ownedOrgs.length).toBeGreaterThan(0);
        
        // Regular user should also see the organization where they are a member
        const memberOrg = response.body.data.find((org: any) => org.id === adminOrg.id);
        expect(memberOrg).toBeDefined();
        expect(memberOrg.owner).toBe(adminUser.username);
        expect(memberOrg.members.some((m: any) => m.username === regularUser.username)).toBe(true);
        
        // Clean up
        if (regularUserOrg.id) {
          await deleteTestOrganization(regularUserOrg.id);
        }
        if (adminOrg.id) {
          await deleteTestOrganization(adminOrg.id);
        }
      });

      it('Should ignore pagination parameters for regular users', async function () {
        const response = await request(app)
          .get(`${baseUrl}/organizations/?limit=5&offset=10`)
          .set('x-api-key', regularUserApiKey)
          .expect(200);

        expect(response.body).toHaveProperty('data');
        expect(response.body).not.toHaveProperty('pagination');
        // Should return all accessible organizations, not paginated
      });
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
      expect(response.body.default).toBeFalsy();
      expect(Array.isArray(response.body.members)).toBe(true);

      createdOrganizations.push(response.body);
    });

    it('Should return 201 and create a new default organization', async function () {
      const organizationData = {
        name: `Test Organization ${Date.now()}`,
        owner: testUser.username,
        default: true,
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
      expect(response.body.default).toBeTruthy();
      createdOrganizations.push(response.body);
    });

    it('Should return 409 when creating a second default organization', async function () {
      const organization1 = {
        name: `Test Organization ${randomUUID()}`,
        owner: testUser.username,
        default: true,
      };

      const organization2 = {
        name: `Test Organization ${randomUUID()}`,
        owner: testUser.username,
        default: true,
      };

      await request(app)
        .post(`${baseUrl}/organizations/`)
        .set('x-api-key', adminApiKey)
        .send(organization1)
        .expect(201);

      const response = await request(app)
        .post(`${baseUrl}/organizations/`)
        .set('x-api-key', adminApiKey)
        .send(organization2);

      expect(response.status).toBe(409);
      expect(response.body.error).toBeDefined();
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
      const oldOwner = ownerUser.username;

      const updateData = {
        owner: newOwner,
      };

      const response = await request(app)
        .put(`${baseUrl}/organizations/${testOrg.id}`)
        .set('x-api-key', ownerApiKey)
        .send(updateData)
        .expect(200);

      expect(response.body.owner).toBe(newOwner);
      
      // Verify old owner is now a member with ADMIN role
      const oldOwnerMember = response.body.members.find((m: any) => m.username === oldOwner);
      expect(oldOwnerMember).toBeDefined();
      expect(oldOwnerMember.role).toBe('ADMIN');
    });

    it('Should return 200 and remove new owner from members when transferring ownership', async function () {
      const ownerApiKey = ownerUser.apiKey;
      const testOrg = await createTestOrganization(ownerUser.username);
      const newOwner = otherUser.username;
      const oldOwner = ownerUser.username;

      // Add the new owner as a member first
      await request(app)
        .post(`${baseUrl}/organizations/${testOrg.id}/members`)
        .set('x-api-key', ownerApiKey)
        .send({
          username: newOwner,
          role: 'MANAGER'
        })
        .expect(200);

      // Transfer ownership to the member
      const updateData = {
        owner: newOwner,
      };

      const response = await request(app)
        .put(`${baseUrl}/organizations/${testOrg.id}`)
        .set('x-api-key', ownerApiKey)
        .send(updateData)
        .expect(200);

      expect(response.body.owner).toBe(newOwner);
      
      // Verify old owner is now a member with ADMIN role
      const oldOwnerMember = response.body.members.find((m: any) => m.username === oldOwner);
      expect(oldOwnerMember).toBeDefined();
      expect(oldOwnerMember.role).toBe('ADMIN');
      
      // Verify new owner is NOT in members array anymore
      const newOwnerMember = response.body.members.find((m: any) => m.username === newOwner);
      expect(newOwnerMember).toBeUndefined();
    });

    it('Should return 200 and update organization owner when SPACE admin request', async function () {
      const adminApiKey = adminUser.apiKey;
      const testOrg = await createTestOrganization(ownerUser.username);
      const newOwner = otherUser.username;
      const oldOwner = ownerUser.username;

      const updateData = {
        owner: newOwner,
      };

      const response = await request(app)
        .put(`${baseUrl}/organizations/${testOrg.id}`)
        .set('x-api-key', adminApiKey)
        .send(updateData)
        .expect(200);

      expect(response.body.owner).toBe(newOwner);
      
      // Verify old owner is now a member with ADMIN role
      const oldOwnerMember = response.body.members.find((m: any) => m.username === oldOwner);
      expect(oldOwnerMember).toBeDefined();
      expect(oldOwnerMember.role).toBe('ADMIN');
    });

    it('Should return 200 and update organization default flag', async function () {
      const ownerApiKey = ownerUser.apiKey;
      const testOrg = await createTestOrganization(ownerUser.username);

      const updateData = {
        default: true,
      };

      const response = await request(app)
        .put(`${baseUrl}/organizations/${testOrg.id}`)
        .set('x-api-key', ownerApiKey)
        .send(updateData)
        .expect(200);

      expect(response.body.default).toBe(updateData.default);
    });

    it('Should return 200 and update organization with new owner default flag', async function () {
      const ownerApiKey = ownerUser.apiKey;
      const newOwner = await createTestUser('USER');
      const ownerTestOrg1 = await createTestOrganization(ownerUser.username);
      const ownerTestOrg2 = await createTestOrganization(ownerUser.username);

      const updateData = {
        default: true,
        owner: newOwner.username,
      };

      await request(app)
        .put(`${baseUrl}/organizations/${ownerTestOrg1.id}`)
        .set('x-api-key', ownerApiKey)
        .send({ default: true })
        .expect(200);

      const response = await request(app)
        .put(`${baseUrl}/organizations/${ownerTestOrg2.id}`)
        .set('x-api-key', ownerApiKey)
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body.owner).toBe(newOwner.username);
      expect(response.body.default).toBeTruthy();

      await deleteTestOrganization(ownerTestOrg1.id!);
      await deleteTestOrganization(ownerTestOrg2.id!);
      await deleteTestUser(newOwner.username);
    });

    it('Should return 409 when trying to assign second default organization to owner', async function () {
      const ownerApiKey = ownerUser.apiKey;
      const testOrg1 = await createTestOrganization(ownerUser.username);
      const testOrg2 = await createTestOrganization(ownerUser.username);

      const updateData = {
        default: true,
      };

      await request(app)
        .put(`${baseUrl}/organizations/${testOrg1.id}`)
        .set('x-api-key', ownerApiKey)
        .send(updateData)
        .expect(200);

      const response = await request(app)
        .put(`${baseUrl}/organizations/${testOrg2.id}`)
        .set('x-api-key', ownerApiKey)
        .send(updateData);

      expect(response.status).toBe(409);
      expect(response.body.error).toBeDefined();
    });

    it('Should return 409 when trying to assign second default organization to updated owner', async function () {
      const ownerApiKey = ownerUser.apiKey;
      const newOwner = await createTestUser('USER');
      const ownerTestOrg1 = await createTestOrganization(ownerUser.username);
      const ownerTestOrg2 = await createTestOrganization(ownerUser.username);
      const newOwnerTestOrg2 = await createTestOrganization(newOwner.username);

      const updateData = {
        default: true,
        owner: newOwner.username,
      };

      await request(app)
        .put(`${baseUrl}/organizations/${ownerTestOrg1.id}`)
        .set('x-api-key', ownerApiKey)
        .send({ default: true })
        .expect(200);

      await request(app)
        .put(`${baseUrl}/organizations/${newOwnerTestOrg2.id}`)
        .set('x-api-key', newOwner.apiKey)
        .send({ default: true })
        .expect(200);

      const response = await request(app)
        .put(`${baseUrl}/organizations/${ownerTestOrg2.id}`)
        .set('x-api-key', ownerApiKey)
        .send(updateData);

      expect(response.status).toBe(409);
      expect(response.body.error).toBeDefined();

      await deleteTestOrganization(ownerTestOrg1.id!);
      await deleteTestOrganization(ownerTestOrg2.id!);
      await deleteTestOrganization(newOwnerTestOrg2.id!);
      await deleteTestUser(newOwner.username);
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
      await addMemberToOrganization(testOrganization.id!, {
        username: managerUser.username,
        role: 'MANAGER',
      });
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
        .send({ username: `nonexistent_user_${Date.now()}`, role: 'EVALUATOR' });

      expect(response.status).toBe(400);
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

    it('Should return 403 when EVALUATOR tries to add member', async function () {
      const evaluatorUser = await createTestUser('USER');
      await addMemberToOrganization(testOrganization.id!, {
        username: evaluatorUser.username,
        role: 'EVALUATOR',
      });

      const response = await request(app)
        .post(`${baseUrl}/organizations/${testOrganization.id}/members`)
        .set('x-api-key', evaluatorUser.apiKey)
        .send({ username: memberUser.username, role: 'EVALUATOR' })
        .expect(403);

      expect(response.body.error).toBeDefined();
    });

    it('Should return 403 when MANAGER tries to add ADMIN member', async function () {
      const response = await request(app)
        .post(`${baseUrl}/organizations/${testOrganization.id}/members`)
        .set('x-api-key', managerUser.apiKey)
        .send({ username: memberUser.username, role: 'ADMIN' })
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
        .send({ role: 'EVALUATOR' })
        .expect(422);

      expect(response.body.error).toBeDefined();
    });

    it('Should return 422 when username field is empty', async function () {
      const response = await request(app)
        .post(`${baseUrl}/organizations/${testOrganization.id}/members`)
        .set('x-api-key', adminApiKey)
        .send({ username: '', role: 'EVALUATOR' })
        .expect(422);

      expect(response.body.error).toBeDefined();
    });

    it('Should return 422 when role field is not sent', async function () {
      const response = await request(app)
        .post(`${baseUrl}/organizations/${testOrganization.id}/members`)
        .set('x-api-key', adminApiKey)
        .send({ username: memberUser.username })
        .expect(422);

      expect(response.body.error).toBeDefined();
    });

    it('Should return 422 when role field is empty', async function () {
      const response = await request(app)
        .post(`${baseUrl}/organizations/${testOrganization.id}/members`)
        .set('x-api-key', adminApiKey)
        .send({ username: memberUser.username, role: '' })
        .expect(422);

      expect(response.body.error).toBeDefined();
    });

    it('Should return 422 when role field is invalid', async function () {
      const response = await request(app)
        .post(`${baseUrl}/organizations/${testOrganization.id}/members`)
        .set('x-api-key', adminApiKey)
        .send({ username: memberUser.username, role: 'INVALID_ROLE' })
        .expect(422);

      expect(response.body.error).toBeDefined();
    });

    it('Should return 422 when role field is OWNER', async function () {
      const response = await request(app)
        .post(`${baseUrl}/organizations/${testOrganization.id}/members`)
        .set('x-api-key', adminApiKey)
        .send({ username: memberUser.username, role: 'OWNER' })
        .expect(422);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /organizations/api-keys', function () {
    let orgOwner: LeanUser;
    let adminMember: LeanUser;
    let managerMember: LeanUser;
    let evaluatorMember: LeanUser;
    let testOrganization: LeanOrganization;
    let regularUserNoPermission: any;

    beforeEach(async function () {
      orgOwner = await createTestUser('USER');
      testOrganization = await createTestOrganization(orgOwner.username);
      adminMember = await createTestUser('USER');
      managerMember = await createTestUser('USER');
      evaluatorMember = await createTestUser('USER');
      regularUserNoPermission = await createTestUser('USER');

      // Add members to organization
      await addMemberToOrganization(testOrganization.id!, {
        username: adminMember.username,
        role: 'ADMIN',
      });
      await addMemberToOrganization(testOrganization.id!, {
        username: managerMember.username,
        role: 'MANAGER',
      });
      await addMemberToOrganization(testOrganization.id!, {
        username: evaluatorMember.username,
        role: 'EVALUATOR',
      });
    });

    afterEach(async function () {
      if (testOrganization?.id) {
        await deleteTestOrganization(testOrganization.id);
      }
      if (regularUserNoPermission?.username) {
        await deleteTestUser(regularUserNoPermission.username);
      }
      if (evaluatorMember?.username) {
        await deleteTestUser(evaluatorMember.username);
      }
      if (managerMember?.username) {
        await deleteTestUser(managerMember.username);
      }
      if (orgOwner?.username) {
        await deleteTestUser(orgOwner.username);
      }
    });

    it('Should return 200 and create new API key with scope ALL with ADMIN request', async function () {
      const response = await request(app)
        .post(`${baseUrl}/organizations/${testOrganization.id}/api-keys`)
        .set('x-api-key', adminApiKey)
        .send({ scope: 'ALL' })
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('Should return 200 and create new API key with scope ALL with OWNER request', async function () {
      const response = await request(app)
        .post(`${baseUrl}/organizations/${testOrganization.id}/api-keys`)
        .set('x-api-key', orgOwner.apiKey)
        .send({ scope: 'ALL' })
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('Should return 200 and create new API key with scope ALL with organization ADMIN request', async function () {
      const response = await request(app)
        .post(`${baseUrl}/organizations/${testOrganization.id}/api-keys`)
        .set('x-api-key', adminMember.apiKey)
        .send({ scope: 'ALL' })
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('Should return 200 and create new API key with scope MANAGEMENT with MANAGER request', async function () {
      const response = await request(app)
        .post(`${baseUrl}/organizations/${testOrganization.id}/api-keys`)
        .set('x-api-key', managerMember.apiKey)
        .send({ scope: 'MANAGEMENT' })
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('Should return 403 and create new API key with scope ALL with MANAGER request', async function () {
      const response = await request(app)
        .post(`${baseUrl}/organizations/${testOrganization.id}/api-keys`)
        .set('x-api-key', managerMember.apiKey)
        .send({ scope: 'ALL' })
        .expect(403);

      expect(response.body).toBeDefined();
    });

    it('Should return 403 when user without org role tries to add API key', async function () {
      const response = await request(app)
        .post(`${baseUrl}/organizations/${testOrganization.id}/api-keys`)
        .set('x-api-key', regularUserNoPermission.apiKey)
        .send({ scope: 'ALL' })
        .expect(403);

      expect(response.body.error).toBeDefined();
    });

    it('Should return 400 when creating API key with custom scope', async function () {
      const response = await request(app)
        .post(`${baseUrl}/organizations/${testOrganization.id}/api-keys`)
        .set('x-api-key', adminApiKey)
        .send({ scope: 'READ' })
        .expect(400);

      expect(response.body).toBeDefined();
    });

    it('Should return 400 when scope is missing', async function () {
      const response = await request(app)
        .post(`${baseUrl}/organizations/${testOrganization.id}/api-keys`)
        .set('x-api-key', adminApiKey)
        .send({})
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('Should return 404 when organization does not exist', async function () {
      const fakeId = '000000000000000000000000';

      const response = await request(app)
        .post(`${baseUrl}/organizations/${fakeId}/api-keys`)
        .set('x-api-key', adminApiKey)
        .send({ scope: 'ALL' })
        .expect(404);

      expect(response.body.error).toBeDefined();
    });

    it('Should return 422 with invalid organization ID format', async function () {
      const response = await request(app)
        .post(`${baseUrl}/organizations/invalid-id/api-keys`)
        .set('x-api-key', adminApiKey)
        .send({ scope: 'ALL' })
        .expect(422);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('PUT /organizations/:organizationId/members/:username', function () {
    let spaceAdmin: any;
    let testOrganization: LeanOrganization;
    let ownerUser: any;
    let adminMember: any;
    let managerMember: any;
    let evaluatorMember: any;
    let regularMember: any;
    let regularUserNoPermission: any;

    beforeAll(async function () {
      spaceAdmin = await createTestUser('ADMIN');
    });

    afterAll(async function () {
      if (spaceAdmin?.username) {
        await deleteTestUser(spaceAdmin.username);
      }
    });

    beforeEach(async function () {
      ownerUser = await createTestUser('USER');
      testOrganization = await createTestOrganization(ownerUser.username);
      adminMember = await createTestUser('USER');
      managerMember = await createTestUser('USER');
      evaluatorMember = await createTestUser('USER');
      regularMember = await createTestUser('USER');
      regularUserNoPermission = await createTestUser('USER');

      // Add members to organization with different roles
      await addMemberToOrganization(testOrganization.id!, {
        username: adminMember.username,
        role: 'ADMIN',
      });
      await addMemberToOrganization(testOrganization.id!, {
        username: managerMember.username,
        role: 'MANAGER',
      });
      await addMemberToOrganization(testOrganization.id!, {
        username: evaluatorMember.username,
        role: 'EVALUATOR',
      });
      await addMemberToOrganization(testOrganization.id!, {
        username: regularMember.username,
        role: 'EVALUATOR',
      });
    });

    afterEach(async function () {
      if (testOrganization?.id) {
        await deleteTestOrganization(testOrganization.id);
      }
      if (ownerUser?.username) {
        await deleteTestUser(ownerUser.username);
      }
      if (adminMember?.username) {
        await deleteTestUser(adminMember.username);
      }
      if (managerMember?.username) {
        await deleteTestUser(managerMember.username);
      }
      if (evaluatorMember?.username) {
        await deleteTestUser(evaluatorMember.username);
      }
      if (regularMember?.username) {
        await deleteTestUser(regularMember.username);
      }
      if (regularUserNoPermission?.username) {
        await deleteTestUser(regularUserNoPermission.username);
      }
    });

    // Successful updates
    it('Should return 200 and update member role with SPACE admin request', async function () {
      const response = await request(app)
        .put(`${baseUrl}/organizations/${testOrganization.id}/members/${evaluatorMember.username}`)
        .set('x-api-key', spaceAdmin.apiKey)
        .send({ role: 'MANAGER' });

      expect(response.status).toBe(200);
      expect(response.body.id).toBeDefined();
    });

    it('Should return 200 and update member role with OWNER request', async function () {
      const response = await request(app)
        .put(`${baseUrl}/organizations/${testOrganization.id}/members/${evaluatorMember.username}`)
        .set('x-api-key', ownerUser.apiKey)
        .send({ role: 'ADMIN' });

      expect(response.status).toBe(200);
      expect(response.body.id).toBeDefined();
    });

    it('Should return 200 and update member role with org ADMIN request', async function () {
      const response = await request(app)
        .put(`${baseUrl}/organizations/${testOrganization.id}/members/${evaluatorMember.username}`)
        .set('x-api-key', adminMember.apiKey)
        .send({ role: 'MANAGER' });

      expect(response.status).toBe(200);
      expect(response.body.id).toBeDefined();
    });

    it('Should return 200 and update member role with org MANAGER request', async function () {
      const testManager = await createTestUser('USER');
      await addMemberToOrganization(testOrganization.id!, {
        username: testManager.username,
        role: 'MANAGER',
      });

      const response = await request(app)
        .put(`${baseUrl}/organizations/${testOrganization.id}/members/${testManager.username}`)
        .set('x-api-key', managerMember.apiKey)
        .send({ role: 'EVALUATOR' });

      expect(response.status).toBe(200);
      expect(response.body.id).toBeDefined();

      await deleteTestUser(testManager.username);
    });

    it('Should return 200 and promote EVALUATOR to MANAGER', async function () {
      const response = await request(app)
        .put(`${baseUrl}/organizations/${testOrganization.id}/members/${evaluatorMember.username}`)
        .set('x-api-key', ownerUser.apiKey)
        .send({ role: 'MANAGER' });

      expect(response.status).toBe(200);
      expect(response.body.id).toBeDefined();
    });

    it('Should return 200 and demote MANAGER to EVALUATOR', async function () {
      const response = await request(app)
        .put(`${baseUrl}/organizations/${testOrganization.id}/members/${managerMember.username}`)
        .set('x-api-key', ownerUser.apiKey)
        .send({ role: 'EVALUATOR' });

      expect(response.status).toBe(200);
      expect(response.body.id).toBeDefined();
    });

    it('Should return 200 and promote EVALUATOR to ADMIN', async function () {
      const response = await request(app)
        .put(`${baseUrl}/organizations/${testOrganization.id}/members/${evaluatorMember.username}`)
        .set('x-api-key', ownerUser.apiKey)
        .send({ role: 'ADMIN' })
        .expect(200);

      expect(response.body.id).toBeDefined();
    });

    // Permission errors (403)
    it('Should return 403 when EVALUATOR tries to update member role', async function () {
      const response = await request(app)
        .put(`${baseUrl}/organizations/${testOrganization.id}/members/${regularMember.username}`)
        .set('x-api-key', evaluatorMember.apiKey)
        .send({ role: 'MANAGER' })
        .expect(403);

      expect(response.body.error).toBeDefined();
    });

    it('Should return 403 when user without org role tries to update member role', async function () {
      const response = await request(app)
        .put(`${baseUrl}/organizations/${testOrganization.id}/members/${evaluatorMember.username}`)
        .set('x-api-key', regularUserNoPermission.apiKey)
        .send({ role: 'ADMIN' })
        .expect(403);

      expect(response.body.error).toBeDefined();
    });

    it('Should return 403 when MANAGER tries to promote member to ADMIN', async function () {
      const response = await request(app)
        .put(`${baseUrl}/organizations/${testOrganization.id}/members/${evaluatorMember.username}`)
        .set('x-api-key', managerMember.apiKey)
        .send({ role: 'ADMIN' })
        .expect(403);

      expect(response.body.error).toBeDefined();
    });

    it('Should return 403 when MANAGER tries to update ADMIN member role', async function () {
      const response = await request(app)
        .put(`${baseUrl}/organizations/${testOrganization.id}/members/${adminMember.username}`)
        .set('x-api-key', managerMember.apiKey)
        .send({ role: 'EVALUATOR' })
        .expect(403);

      expect(response.body.error).toBeDefined();
    });

    // Validation errors (422)
    it('Should return 422 when role field is not provided', async function () {
      const response = await request(app)
        .put(`${baseUrl}/organizations/${testOrganization.id}/members/${evaluatorMember.username}`)
        .set('x-api-key', ownerUser.apiKey)
        .send({})
        .expect(422);

      expect(response.body.error).toBeDefined();
    });

    it('Should return 422 when role field is empty', async function () {
      const response = await request(app)
        .put(`${baseUrl}/organizations/${testOrganization.id}/members/${evaluatorMember.username}`)
        .set('x-api-key', ownerUser.apiKey)
        .send({ role: '' })
        .expect(422);

      expect(response.body.error).toBeDefined();
    });

    it('Should return 422 when role field is invalid', async function () {
      const response = await request(app)
        .put(`${baseUrl}/organizations/${testOrganization.id}/members/${evaluatorMember.username}`)
        .set('x-api-key', ownerUser.apiKey)
        .send({ role: 'INVALID_ROLE' })
        .expect(422);

      expect(response.body.error).toBeDefined();
    });

    it('Should return 422 when trying to assign OWNER role', async function () {
      const response = await request(app)
        .put(`${baseUrl}/organizations/${testOrganization.id}/members/${evaluatorMember.username}`)
        .set('x-api-key', ownerUser.apiKey)
        .send({ role: 'OWNER' })
        .expect(422);

      expect(response.body.error).toBeDefined();
    });

    it('Should return 422 with invalid organization ID format', async function () {
      const response = await request(app)
        .put(`${baseUrl}/organizations/invalid-id/members/${evaluatorMember.username}`)
        .set('x-api-key', ownerUser.apiKey)
        .send({ role: 'MANAGER' })
        .expect(422);

      expect(response.body.error).toBeDefined();
    });

    it('Should return 422 when role is not a string', async function () {
      const response = await request(app)
        .put(`${baseUrl}/organizations/${testOrganization.id}/members/${evaluatorMember.username}`)
        .set('x-api-key', ownerUser.apiKey)
        .send({ role: 123 })
        .expect(422);

      expect(response.body.error).toBeDefined();
    });

    // Invalid data errors (400)
    it('Should return 400 when trying to update non-existent member', async function () {
      const response = await request(app)
        .put(`${baseUrl}/organizations/${testOrganization.id}/members/nonexistent_user`)
        .set('x-api-key', ownerUser.apiKey)
        .send({ role: 'MANAGER' })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('Should return 400 when trying to update member not in organization', async function () {
      const response = await request(app)
        .put(
          `${baseUrl}/organizations/${testOrganization.id}/members/${regularUserNoPermission.username}`
        )
        .set('x-api-key', ownerUser.apiKey)
        .send({ role: 'MANAGER' })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    // Not found errors (404)
    it('Should return 404 when organization does not exist', async function () {
      const fakeId = '000000000000000000000000';

      const response = await request(app)
        .put(`${baseUrl}/organizations/${fakeId}/members/${evaluatorMember.username}`)
        .set('x-api-key', ownerUser.apiKey)
        .send({ role: 'MANAGER' })
        .expect(404);

      expect(response.body.error).toBeDefined();
    });

    // Edge cases
    it('Should return 400 when trying to update organization owner role', async function () {
      const response = await request(app)
        .put(`${baseUrl}/organizations/${testOrganization.id}/members/${ownerUser.username}`)
        .set('x-api-key', spaceAdmin.apiKey)
        .send({ role: 'ADMIN' })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('Should return 409 when updating same role', async function () {
      const response = await request(app)
        .put(`${baseUrl}/organizations/${testOrganization.id}/members/${evaluatorMember.username}`)
        .set('x-api-key', ownerUser.apiKey)
        .send({ role: 'EVALUATOR' })
        .expect(409);

      expect(response.body.error).toBeDefined();
    });

    it('Should return 400 when username parameter is missing', async function () {
      const response = await request(app)
        .put(`${baseUrl}/organizations/${testOrganization.id}/members/`)
        .set('x-api-key', ownerUser.apiKey)
        .send({ role: 'MANAGER' })
        .expect(404);
    });

    it('Should handle multiple role updates correctly', async function () {
      // First update
      await request(app)
        .put(`${baseUrl}/organizations/${testOrganization.id}/members/${evaluatorMember.username}`)
        .set('x-api-key', ownerUser.apiKey)
        .send({ role: 'MANAGER' })
        .expect(200);

      // Second update
      const response = await request(app)
        .put(`${baseUrl}/organizations/${testOrganization.id}/members/${evaluatorMember.username}`)
        .set('x-api-key', ownerUser.apiKey)
        .send({ role: 'ADMIN' })
        .expect(200);

      expect(response.body.id).toBeDefined();
    });
  });

  describe('DELETE /organizations/:organizationId', function () {
    let testOrganization: LeanOrganization;
    let spaceAdmin: any;
    let ownerUser: any;
    let adminUser: any;
    let managerUser: any;
    let evaluatorUser: any;
    let regularUserNoPermission: any;

    beforeEach(async function () {
      spaceAdmin = await createTestUser('ADMIN');
      ownerUser = await createTestUser('USER');
      testOrganization = await createTestOrganization(ownerUser.username);
      adminUser = await createTestUser('USER');
      managerUser = await createTestUser('USER');
      evaluatorUser = await createTestUser('USER');
      regularUserNoPermission = await createTestUser('USER');

      // Add owner to organization
      await addMemberToOrganization(testOrganization.id!, {
        username: adminUser.username,
        role: 'ADMIN',
      });
      await addMemberToOrganization(testOrganization.id!, {
        username: managerUser.username,
        role: 'MANAGER',
      });
      await addMemberToOrganization(testOrganization.id!, {
        username: evaluatorUser.username,
        role: 'EVALUATOR',
      });
    });

    afterEach(async function () {
      if (testOrganization?.id) {
        await deleteTestOrganization(testOrganization.id);
      }

      if (ownerUser?.username) {
        await deleteTestUser(ownerUser.username);
      }

      if (spaceAdmin?.username) {
        await deleteTestUser(spaceAdmin.username);
      }

      if (adminUser?.username) {
        await deleteTestUser(adminUser.username);
      }
      if (managerUser?.username) {
        await deleteTestUser(managerUser.username);
      }
      if (evaluatorUser?.username) {
        await deleteTestUser(evaluatorUser.username);
      }
      if (regularUserNoPermission?.username) {
        await deleteTestUser(regularUserNoPermission.username);
      }
    });

    it('Should return 204 and remove organization with services', async function () {
      const responseDelete = await request(app)
        .delete(`${baseUrl}/organizations/${testOrganization.id}`)
        .set('x-api-key', spaceAdmin.apiKey);

      expect(responseDelete.status).toBe(204);

      const responseServices = await request(app)
        .get(`${baseUrl}/services/`)
        .set('x-api-key', spaceAdmin.apiKey);

      expect(responseServices.status).toBe(200);
      expect(
        responseServices.body.every(
          (service: any) => service.organizationId !== testOrganization.id
        )
      ).toBe(true);

      const organizationFindResponse = await request(app)
        .get(`${baseUrl}/organizations/${testOrganization.id}`)
        .set('x-api-key', spaceAdmin.apiKey);

      expect(organizationFindResponse.status).toBe(404);
    });

    it('Should return 200 and remove member from organization with OWNER request', async function () {
      const responseDelete = await request(app)
        .delete(`${baseUrl}/organizations/${testOrganization.id}`)
        .set('x-api-key', ownerUser.apiKey);

      expect(responseDelete.status).toBe(204);

      const responseServices = await request(app)
        .get(`${baseUrl}/services/`)
        .set('x-api-key', spaceAdmin.apiKey);

      expect(responseServices.status).toBe(200);
      expect(
        responseServices.body.every(
          (service: any) => service.organizationId !== testOrganization.id
        )
      ).toBe(true);

      const organizationFindResponse = await request(app)
        .get(`${baseUrl}/organizations/${testOrganization.id}`)
        .set('x-api-key', spaceAdmin.apiKey);

      expect(organizationFindResponse.status).toBe(404);
    });

    it('Should return 409 when trying to remove default organization', async function () {
      const defaultOrg = {
        name: `Default Organization ${Date.now()}`,
        owner: ownerUser.username,
        default: true,
      };

      const response = await request(app)
        .post(`${baseUrl}/organizations/`)
        .set('x-api-key', spaceAdmin.apiKey)
        .send(defaultOrg)
        .expect(201);

      const responseDelete = await request(app)
        .delete(`${baseUrl}/organizations/${response.body.id}`)
        .set('x-api-key', spaceAdmin.apiKey);

      expect(responseDelete.status).toBe(409);
      expect(responseDelete.body.error).toBeDefined();
    });

    it('Should return 403 with org ADMIN request', async function () {
      const responseDelete = await request(app)
        .delete(`${baseUrl}/organizations/${testOrganization.id}`)
        .set('x-api-key', adminUser.apiKey);

      expect(responseDelete.status).toBe(403);
      expect(responseDelete.body.error).toBeDefined();
    });

    it('Should return 403 with org MANAGER request', async function () {
      const responseDelete = await request(app)
        .delete(`${baseUrl}/organizations/${testOrganization.id}`)
        .set('x-api-key', managerUser.apiKey);

      expect(responseDelete.status).toBe(403);
      expect(responseDelete.body.error).toBeDefined();
    });

    it('Should return 403 with org EVALUATOR request', async function () {
      const responseDelete = await request(app)
        .delete(`${baseUrl}/organizations/${testOrganization.id}`)
        .set('x-api-key', evaluatorUser.apiKey);

      expect(responseDelete.status).toBe(403);
      expect(responseDelete.body.error).toBeDefined();
    });

    it('Should return 403 when user without org role tries to remove member', async function () {
      const responseDelete = await request(app)
        .delete(`${baseUrl}/organizations/${testOrganization.id}`)
        .set('x-api-key', regularUserNoPermission.apiKey);

      expect(responseDelete.status).toBe(403);
      expect(responseDelete.body.error).toBeDefined();
    });

    it('Should return 404 when organization does not exist', async function () {
      const fakeId = '000000000000000000000000';

      const response = await request(app)
        .delete(`${baseUrl}/organizations/${fakeId}`)
        .set('x-api-key', spaceAdmin.apiKey)
        .expect(404);

      expect(response.body.error).toBeDefined();
    });

    it('Should return 422 with invalid organization ID format', async function () {
      const response = await request(app)
        .delete(`${baseUrl}/organizations/invalid-id`)
        .set('x-api-key', spaceAdmin.apiKey)
        .expect(422);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('DELETE /organizations/:organizationId/members/:username', function () {
    let testOrganization: LeanOrganization;
    let ownerUser: any;
    let adminUser: any;
    let managerUser: any;
    let evaluatorUser: any;
    let regularUserNoPermission: any;

    beforeEach(async function () {
      ownerUser = await createTestUser('USER');
      testOrganization = await createTestOrganization(ownerUser.username);
      adminUser = await createTestUser('USER');
      managerUser = await createTestUser('USER');
      evaluatorUser = await createTestUser('USER');
      regularUserNoPermission = await createTestUser('USER');

      // Add owner to organization
      await addMemberToOrganization(testOrganization.id!, {
        username: adminUser.username,
        role: 'ADMIN',
      });
      await addMemberToOrganization(testOrganization.id!, {
        username: managerUser.username,
        role: 'MANAGER',
      });
      await addMemberToOrganization(testOrganization.id!, {
        username: evaluatorUser.username,
        role: 'EVALUATOR',
      });
    });

    afterEach(async function () {
      if (testOrganization?.id) {
        await deleteTestOrganization(testOrganization.id);
      }
      if (ownerUser?.username) {
        await deleteTestUser(ownerUser.username);
      }
      if (adminUser?.username) {
        await deleteTestUser(adminUser.username);
      }
      if (managerUser?.username) {
        await deleteTestUser(managerUser.username);
      }
      if (evaluatorUser?.username) {
        await deleteTestUser(evaluatorUser.username);
      }
      if (regularUserNoPermission?.username) {
        await deleteTestUser(regularUserNoPermission.username);
      }
    });

    it('Should return 200 and remove member from organization with SPACE admin request', async function () {
      const response = await request(app)
        .delete(`${baseUrl}/organizations/${testOrganization.id}/members/${managerUser.username}`)
        .set('x-api-key', adminApiKey)
        .expect(200);
      expect(response.body).toBeDefined();
    });

    it('Should return 200 and remove member from organization with OWNER request', async function () {
      const response = await request(app)
        .delete(`${baseUrl}/organizations/${testOrganization.id}/members/${managerUser.username}`)
        .set('x-api-key', ownerUser.apiKey);

      expect(response.status).toBe(200);
      expect(response.body).toBeDefined();
    });

    it('Should return 200 and remove member from organization with org ADMIN request', async function () {
      const response = await request(app)
        .delete(`${baseUrl}/organizations/${testOrganization.id}/members/${managerUser.username}`)
        .set('x-api-key', adminUser.apiKey)
        .expect(200);
      expect(response.body).toBeDefined();
    });

    it('Should return 200 and remove EVALUATOR member from organization with org MANAGER request', async function () {
      const response = await request(app)
        .delete(`${baseUrl}/organizations/${testOrganization.id}/members/${evaluatorUser.username}`)
        .set('x-api-key', managerUser.apiKey)
        .expect(200);
      expect(response.body).toBeDefined();
    });

    it('Should return 200 when EVALUATOR user removes themselves from organization', async function () {
      const secondEvaluatorUser = await createTestUser('USER');
      await addMemberToOrganization(testOrganization.id!, {
        username: secondEvaluatorUser.username,
        role: 'EVALUATOR',
      });

      const response = await request(app)
        .delete(`${baseUrl}/organizations/${testOrganization.id}/members/${secondEvaluatorUser.username}`)
        .set('x-api-key', secondEvaluatorUser.apiKey)
        .expect(200);
      
      expect(response.body).toBeDefined();
      expect(response.body.members).toBeDefined();
      expect(response.body.members.some((m: any) => m.username === secondEvaluatorUser.username)).toBe(false);

      await deleteTestUser(secondEvaluatorUser.username);
    });

    it('Should return 403 when EVALUATOR user tries to remove another member', async function () {
      const secondEvaluatorUser = await createTestUser('USER');
      await addMemberToOrganization(testOrganization.id!, {
        username: secondEvaluatorUser.username,
        role: 'EVALUATOR',
      });

      const response = await request(app)
        .delete(
          `${baseUrl}/organizations/${testOrganization.id}/members/${regularUserNoPermission.username}`
        )
        .set('x-api-key', secondEvaluatorUser.apiKey)
        .expect(403);
      
      expect(response.body.error).toBeDefined();

      await deleteTestUser(secondEvaluatorUser.username);
    });

    it('Should return 403 when MANAGER user tries to remove ADMIN member', async function () {
      const response = await request(app)
        .delete(`${baseUrl}/organizations/${testOrganization.id}/members/${adminUser.username}`)
        .set('x-api-key', managerUser.apiKey)
        .expect(403);

      expect(response.body.error).toBeDefined();
    });

    it('Should return 403 when user without org role tries to remove member', async function () {
      const response = await request(app)
        .delete(`${baseUrl}/organizations/${testOrganization.id}/members/${managerUser.username}`)
        .set('x-api-key', regularUserNoPermission.apiKey)
        .expect(403);

      expect(response.body.error).toBeDefined();
    });

    it('Should return 400 when removing non-existent member', async function () {
      const response = await request(app)
        .delete(
          `${baseUrl}/organizations/${testOrganization.id}/members/nonexistent_user_${Date.now()}`
        )
        .set('x-api-key', adminApiKey)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('Should return 404 when username field is missing', async function () {
      const response = await request(app)
        .delete(`${baseUrl}/organizations/${testOrganization.id}/members`)
        .set('x-api-key', adminApiKey);

      expect(response.status).toBe(404);
    });

    it('Should return 404 when organization does not exist', async function () {
      const fakeId = '000000000000000000000000';

      const response = await request(app)
        .delete(`${baseUrl}/organizations/${fakeId}/members/${managerUser.username}`)
        .set('x-api-key', adminApiKey)
        .expect(404);

      expect(response.body.error).toBeDefined();
    });

    it('Should return 422 with invalid organization ID format', async function () {
      const response = await request(app)
        .delete(`${baseUrl}/organizations/invalid-id/members/${managerUser.username}`)
        .set('x-api-key', adminApiKey)
        .expect(422);

      expect(response.body.error).toBeDefined();
    });

    describe('EVALUATOR member restrictions', function () {
      let evaluatorGroupOrganization: LeanOrganization;
      let evaluator1User: any;
      let evaluator2User: any;
      let managerInGroup: any;

      beforeEach(async function () {
        managerInGroup = await createTestUser('USER');
        evaluator1User = await createTestUser('USER');
        evaluator2User = await createTestUser('USER');

        evaluatorGroupOrganization = await createTestOrganization(managerInGroup.username);

        await addMemberToOrganization(evaluatorGroupOrganization.id!, {
          username: evaluator1User.username,
          role: 'EVALUATOR',
        });
        await addMemberToOrganization(evaluatorGroupOrganization.id!, {
          username: evaluator2User.username,
          role: 'EVALUATOR',
        });
      });

      afterEach(async function () {
        if (evaluatorGroupOrganization?.id) {
          await deleteTestOrganization(evaluatorGroupOrganization.id);
        }
        if (managerInGroup?.username) {
          await deleteTestUser(managerInGroup.username);
        }
        if (evaluator1User?.username) {
          await deleteTestUser(evaluator1User.username);
        }
        if (evaluator2User?.username) {
          await deleteTestUser(evaluator2User.username);
        }
      });

      it('EVALUATOR can only remove themselves from organization', async function () {
        const response = await request(app)
          .delete(`${baseUrl}/organizations/${evaluatorGroupOrganization.id}/members/${evaluator1User.username}`)
          .set('x-api-key', evaluator1User.apiKey)
          .expect(200);

        expect(response.body).toBeDefined();
        expect(response.body.members).toBeDefined();
        expect(response.body.members.some((m: any) => m.username === evaluator1User.username)).toBe(false);
      });

      it('EVALUATOR cannot remove another EVALUATOR', async function () {
        const response = await request(app)
          .delete(`${baseUrl}/organizations/${evaluatorGroupOrganization.id}/members/${evaluator2User.username}`)
          .set('x-api-key', evaluator1User.apiKey)
          .expect(403);

        expect(response.body.error).toBeDefined();
      });

      it('EVALUATOR cannot remove MANAGER from organization', async function () {
        const response = await request(app)
          .delete(`${baseUrl}/organizations/${evaluatorGroupOrganization.id}/members/${managerInGroup.username}`)
          .set('x-api-key', evaluator1User.apiKey)
          .expect(403);

        expect(response.body.error).toBeDefined();
      });

      it('EVALUATOR cannot be removed by another EVALUATOR', async function () {
        const response = await request(app)
          .delete(`${baseUrl}/organizations/${evaluatorGroupOrganization.id}/members/${evaluator1User.username}`)
          .set('x-api-key', evaluator2User.apiKey)
          .expect(403);

        expect(response.body.error).toBeDefined();
      });
    });
  });

  describe('DELETE /organizations/:organizationId/api-keys/:apiKey', function () {
    let testOrganization: LeanOrganization;
    let ownerUser: any;
    let adminUser: any;
    let managerUser: any;
    let evaluatorUser: any;
    let regularUserNoPermission: any;
    let testAllApiKey: string;
    let testManagementApiKey: string;
    let testEvaluationApiKey: string;

    beforeEach(async function () {
      ownerUser = await createTestUser('USER');
      testOrganization = await createTestOrganization(ownerUser.username);
      adminUser = await createTestUser('USER');
      managerUser = await createTestUser('USER');
      evaluatorUser = await createTestUser('USER');
      regularUserNoPermission = await createTestUser('USER');

      // Create an API key to delete
      const allApiKeyData = {
        key: `org_${crypto.randomBytes(32).toString('hex')}`,
        scope: 'ALL' as const,
      };

      const managementApiKeyData = {
        key: `org_${crypto.randomBytes(32).toString('hex')}`,
        scope: 'MANAGEMENT' as const,
      };

      const evaluationApiKeyData = {
        key: `org_${crypto.randomBytes(32).toString('hex')}`,
        scope: 'EVALUATION' as const,
      };

      await addApiKeyToOrganization(testOrganization.id!, allApiKeyData);
      await addApiKeyToOrganization(testOrganization.id!, managementApiKeyData);
      await addApiKeyToOrganization(testOrganization.id!, evaluationApiKeyData);

      testAllApiKey = allApiKeyData.key;
      testManagementApiKey = managementApiKeyData.key;
      testEvaluationApiKey = evaluationApiKeyData.key;

      // Add members to organization
      await addMemberToOrganization(testOrganization.id!, {
        username: adminUser.username,
        role: 'ADMIN',
      });
      await addMemberToOrganization(testOrganization.id!, {
        username: managerUser.username,
        role: 'MANAGER',
      });
      await addMemberToOrganization(testOrganization.id!, {
        username: evaluatorUser.username,
        role: 'EVALUATOR',
      });
    });

    afterEach(async function () {
      if (testOrganization?.id) {
        await deleteTestOrganization(testOrganization.id);
      }
      if (ownerUser?.username) {
        await deleteTestUser(ownerUser.username);
      }
      if (adminUser?.username) {
        await deleteTestUser(adminUser.username);
      }
      if (managerUser?.username) {
        await deleteTestUser(managerUser.username);
      }
      if (evaluatorUser?.username) {
        await deleteTestUser(evaluatorUser.username);
      }
      if (regularUserNoPermission?.username) {
        await deleteTestUser(regularUserNoPermission.username);
      }
    });

    it('Should return 200 and delete API key from organization with SPACE ADMIN request', async function () {
      const response = await request(app)
        .delete(`${baseUrl}/organizations/${testOrganization.id}/api-keys/${testEvaluationApiKey}`)
        .set('x-api-key', adminApiKey)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('Should return 200 and delete API key from organization with organization ADMIN request', async function () {
      const response = await request(app)
        .delete(`${baseUrl}/organizations/${testOrganization.id}/api-keys/${testEvaluationApiKey}`)
        .set('x-api-key', adminUser.apiKey)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('Should return 200 and delete API key from organization with organization MANAGER request', async function () {
      const response = await request(app)
        .delete(`${baseUrl}/organizations/${testOrganization.id}/api-keys/${testEvaluationApiKey}`)
        .set('x-api-key', managerUser.apiKey)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('Should return 200 and delete MANAGEMENT API key from organization with organization MANAGER request', async function () {
      const response = await request(app)
        .delete(`${baseUrl}/organizations/${testOrganization.id}/api-keys/${testManagementApiKey}`)
        .set('x-api-key', managerUser.apiKey)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('Should return 403 when user without org role tries to delete API key', async function () {
      const response = await request(app)
        .delete(`${baseUrl}/organizations/${testOrganization.id}/api-keys/${testEvaluationApiKey}`)
        .set('x-api-key', regularUserNoPermission.apiKey)
        .expect(403);

      expect(response.body.error).toBeDefined();
    });

    it('Should return 403 when MANAGER user tries to delete ALL API key', async function () {
      const response = await request(app)
        .delete(`${baseUrl}/organizations/${testOrganization.id}/api-keys/${testAllApiKey}`)
        .set('x-api-key', managerUser.apiKey)
        .expect(403);

      expect(response.body.error).toBeDefined();
    });

    it('Should return 403 when EVALUATOR user tries to delete API key', async function () {
      const response = await request(app)
        .delete(`${baseUrl}/organizations/${testOrganization.id}/api-keys/${testEvaluationApiKey}`)
        .set('x-api-key', evaluatorUser.apiKey)
        .expect(403);

      expect(response.body.error).toBeDefined();
    });

    it('Should return 400 when deleting non-existent API key', async function () {
      const response = await request(app)
        .delete(
          `${baseUrl}/organizations/${testOrganization.id}/api-keys/nonexistent_key_${Date.now()}`
        )
        .set('x-api-key', adminApiKey)
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('Should return 404 when apiKey field is missing', async function () {
      const response = await request(app)
        .delete(`${baseUrl}/organizations/${testOrganization.id}/api-keys`)
        .set('x-api-key', adminApiKey);

      expect(response.status).toBe(404);
    });

    it('Should return 404 when organization does not exist', async function () {
      const fakeId = '000000000000000000000000';

      const response = await request(app)
        .delete(`${baseUrl}/organizations/${fakeId}/api-keys/${testEvaluationApiKey}`)
        .set('x-api-key', adminApiKey)
        .expect(404);

      expect(response.body.error).toBeDefined();
    });

    it('Should return 422 with invalid organization ID format', async function () {
      const response = await request(app)
        .delete(`${baseUrl}/organizations/invalid-id/api-keys/${testEvaluationApiKey}`)
        .set('x-api-key', adminApiKey)
        .expect(422);

      expect(response.body.error).toBeDefined();
    });
  });
});
