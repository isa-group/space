import { Server } from 'http';
import request from 'supertest';
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import { baseUrl, getApp, shutdownApp } from './utils/testApp';
import { createTestUser, deleteTestUser } from './utils/users/userTestUtils';
import {
  createTestOrganization,
  deleteTestOrganization,
  addApiKeyToOrganization,
} from './utils/organization/organizationTestUtils';
import { createTestService, deleteTestService, getPricingFromService } from './utils/services/serviceTestUtils';
import { generateOrganizationApiKey } from '../main/utils/users/helpers';
import { LeanUser } from '../main/types/models/User';
import { LeanOrganization } from '../main/types/models/Organization';
import { LeanService } from '../main/types/models/Service';
import { LeanContract } from '../main/types/models/Contract';
import { generateContract } from './utils/contracts/generators';
import { createTestContract } from './utils/contracts/contractTestUtils';
import ContractMongoose from '../main/repositories/mongoose/models/ContractMongoose';

describe('Contract API routes', function () {
  let app: Server;
  let adminUser: LeanUser;
  let ownerUser: LeanUser;
  let testOrganization: LeanOrganization;
  let testService: LeanService;
  let testOrgApiKey: string;
  let testContract: LeanContract;
  const contractsToCleanup: Set<string> = new Set();

  const trackContractForCleanup = (contract?: any) => {
    if (contract?.userContact?.userId) {
      contractsToCleanup.add(contract.userContact.userId);
    }
  };

  beforeAll(async function () {
    app = await getApp();
  });

  beforeEach(async function () {
    adminUser = await createTestUser('ADMIN');
    ownerUser = await createTestUser('USER');
    testOrganization = await createTestOrganization(ownerUser.username);
    testService = await createTestService(testOrganization.id);
    testOrgApiKey = generateOrganizationApiKey();
    await addApiKeyToOrganization(testOrganization.id!, { key: testOrgApiKey, scope: 'ALL' });

    testContract = await createTestContract(testOrganization.id!, [testService], app);
    trackContractForCleanup(testContract);
  });

  afterEach(async function () {
    for (const userId of contractsToCleanup) {
      await ContractMongoose.deleteOne({ 'userContact.userId': userId });
    }
    contractsToCleanup.clear();

    if (testService?.id) {
      await deleteTestService(testService.name, testOrganization.id!);
    }
    if (testOrganization?.id) {
      await deleteTestOrganization(testOrganization.id);
    }
    if (adminUser?.username) {
      await deleteTestUser(adminUser.username);
    }
    if (ownerUser?.username) {
      await deleteTestUser(ownerUser.username);
    }
  });

  afterAll(async function () {
    await shutdownApp();
  });

  describe('GET /contracts', function () {
    it('returns 200 and list of contracts with org API key', async function () {
      const response = await request(app)
        .get(`${baseUrl}/contracts`)
        .set('x-api-key', testOrgApiKey);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body.some((c: LeanContract) => c.userContact.userId === testContract.userContact.userId)).toBe(true);
    });

    it('returns 200 and filters contracts by username query parameter', async function () {
      const response = await request(app)
        .get(`${baseUrl}/contracts?username=${testContract.userContact.username}`)
        .set('x-api-key', testOrgApiKey);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].userContact.username).toBe(testContract.userContact.username);
    });

    it('returns 401 when API key is missing', async function () {
      const response = await request(app).get(`${baseUrl}/contracts`);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('API Key');
    });
  });

  describe('GET /organizations/:organizationId/contracts', function () {
    it('returns 200 and contracts for specific organization with ADMIN user API key', async function () {
      const response = await request(app)
        .get(`${baseUrl}/organizations/${testOrganization.id}/contracts`)
        .set('x-api-key', adminUser.apiKey);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body.some((c: LeanContract) => c.userContact.userId === testContract.userContact.userId)).toBe(true);
      expect(response.body.every((c: LeanContract) => c.organizationId === testOrganization.id)).toBe(true);
    });
    
    it('returns 200 and contracts for specific organization with USER user API key', async function () {
      const response = await request(app)
        .get(`${baseUrl}/organizations/${testOrganization.id}/contracts`)
        .set('x-api-key', ownerUser.apiKey);

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body.some((c: LeanContract) => c.userContact.userId === testContract.userContact.userId)).toBe(true);
    });

    it('returns 401 when API key is missing', async function () {
      const response = await request(app).get(
        `${baseUrl}/organizations/${testOrganization.id}/contracts`
      );

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('API Key');
    });
  });

  describe('POST /contracts', function () {
    it('returns 201 when creating a contract with org API key', async function () {
      const contractData = await generateContract(
        { [testService.name.toLowerCase()]: testService.activePricings.keys().next().value! },
        testOrganization.id!,
        undefined,
        app
      );

      const response = await request(app)
        .post(`${baseUrl}/contracts`)
        .set('x-api-key', testOrgApiKey)
        .send(contractData);

      expect(response.status).toBe(201);
      expect(response.body.userContact.userId).toBe(contractData.userContact.userId);
      expect(response.body.organizationId).toBe(testOrganization.id);
      trackContractForCleanup(response.body);
    });

    it('returns 409 when creating a duplicate contract for the same userId', async function () {
      const contractData = await generateContract(
        { [testService.name.toLowerCase()]: testService.activePricings.keys().next().value! },
        testOrganization.id!,
        undefined,
        app
      );

      const first = await request(app)
        .post(`${baseUrl}/contracts`)
        .set('x-api-key', testOrgApiKey)
        .send(contractData);
      trackContractForCleanup(first.body);

      const response = await request(app)
        .post(`${baseUrl}/contracts`)
        .set('x-api-key', testOrgApiKey)
        .send(contractData);

      expect(response.status).toBe(409);
      expect(response.body.error).toBeDefined();
    });
    
    it('returns 403 when trying to create a contract for a different organization', async function () {
      const otherOrg = await createTestOrganization(ownerUser.username);
      
      const contractData = await generateContract(
        { [testService.name.toLowerCase()]: testService.activePricings.keys().next().value! },
        otherOrg.id!,
        undefined,
        app
      );

      const response = await request(app)
        .post(`${baseUrl}/contracts`)
        .set('x-api-key', testOrgApiKey)
        .send(contractData);

      expect(response.status).toBe(403);
      expect(response.body.error).toBeDefined();
    });

    it('returns 400 when creating a contract with non-existent service', async function () {
      const contractData = await generateContract(
        { 'non-existent-service': '1.0.0' },
        testOrganization.id!,
        undefined,
        app
      );

      const response = await request(app)
        .post(`${baseUrl}/contracts`)
        .set('x-api-key', testOrgApiKey)
        .send(contractData);

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    it('returns 400 when creating a contract with invalid service version', async function () {
      const contractData = await generateContract(
        { [testService.name.toLowerCase()]: '99.99.99' },
        testOrganization.id!,
        undefined,
        app
      );

      const response = await request(app)
        .post(`${baseUrl}/contracts`)
        .set('x-api-key', testOrgApiKey)
        .send(contractData);

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid');
    });

    it('returns 422 when userContact.userId is empty', async function () {
      const contractData = await generateContract(
        { [testService.name.toLowerCase()]: testService.activePricings.keys().next().value! },
        testOrganization.id!,
        '',
        app
      );

      const response = await request(app)
        .post(`${baseUrl}/contracts`)
        .set('x-api-key', testOrgApiKey)
        .send(contractData);

      expect(response.status).toBe(422);
      expect(response.body.error).toBeDefined();
    });

    it('returns 401 when API key is missing', async function () {
      const contractData = await generateContract(
        { [testService.name.toLowerCase()]: testService.activePricings.keys().next().value! },
        testOrganization.id!,
        undefined,
        app
      );

      const response = await request(app).post(`${baseUrl}/contracts`).send(contractData);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('API Key');
    });
  });

  describe('POST /organizations/:organizationId/contracts', function () {
    it('returns 201 when creating a contract with user API key', async function () {
      const contractData = await generateContract(
        { [testService.name.toLowerCase()]: testService.activePricings.keys().next().value! },
        testOrganization.id!,
        undefined,
        app
      );

      const response = await request(app)
        .post(`${baseUrl}/organizations/${testOrganization.id}/contracts`)
        .set('x-api-key', ownerUser.apiKey)
        .send(contractData);

      expect(response.status).toBe(201);
      expect(response.body.organizationId).toBe(testOrganization.id);
      trackContractForCleanup(response.body);
    });

    it('returns 403 when organizationId in body does not match URL param', async function () {
      const otherOrg = await createTestOrganization(ownerUser.username);
      const contractData = await generateContract(
        { [testService.name.toLowerCase()]: testService.activePricings.keys().next().value! },
        otherOrg.id!,
        undefined,
        app
      );

      const response = await request(app)
        .post(`${baseUrl}/organizations/${testOrganization.id}/contracts`)
        .set('x-api-key', ownerUser.apiKey)
        .send(contractData);

      expect(response.status).toBe(403);
      expect(response.body.error).toContain('Organization ID mismatch');

      await deleteTestOrganization(otherOrg.id!);
    });

    it('returns 401 when API key is missing', async function () {
      const contractData = await generateContract(
        { [testService.name.toLowerCase()]: testService.activePricings.keys().next().value! },
        testOrganization.id!,
        undefined,
        app
      );

      const response = await request(app)
        .post(`${baseUrl}/organizations/${testOrganization.id}/contracts`)
        .send(contractData);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('API Key');
    });
  });

  describe('GET /contracts/:userId', function () {
    it('returns 200 and the contract for the given userId', async function () {
      const response = await request(app)
        .get(`${baseUrl}/contracts/${testContract.userContact.userId}`)
        .set('x-api-key', testOrgApiKey);

      expect(response.status).toBe(200);
      expect(response.body.userContact.userId).toBe(testContract.userContact.userId);
    });

    it('returns 404 when contract is not found', async function () {
      const response = await request(app)
        .get(`${baseUrl}/contracts/non-existent-userId`)
        .set('x-api-key', testOrgApiKey);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });

    it('returns 401 when API key is missing', async function () {
      const response = await request(app).get(`${baseUrl}/contracts/some-userId`);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('API Key');
    });
  });

  describe('GET /organizations/:organizationId/contracts/:userId', function () {
    it('returns 200 and the contract for the given userId with user API key', async function () {
      const response = await request(app)
        .get(
          `${baseUrl}/organizations/${testOrganization.id}/contracts/${testContract.userContact.userId}`
        )
        .set('x-api-key', ownerUser.apiKey);

      expect(response.status).toBe(200);
      expect(response.body.userContact.userId).toBe(testContract.userContact.userId);
    });

    it('returns 404 when contract is not found', async function () {
      const response = await request(app)
        .get(`${baseUrl}/organizations/${testOrganization.id}/contracts/non-existent-userId`)
        .set('x-api-key', ownerUser.apiKey);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });

    it('returns 401 when API key is missing', async function () {
      const response = await request(app).get(
        `${baseUrl}/organizations/${testOrganization.id}/contracts/some-userId`
      );

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('API Key');
    });
  });

  describe('PUT /contracts/:userId', function () {
    it('returns 200 and novates the contract', async function () {
      const newService = await createTestService(testOrganization.id, `new-service-${Date.now()}`);
      const pricingVersion = newService.activePricings.keys().next().value!;
      const pricingDetails = await getPricingFromService(newService.name, pricingVersion, testOrganization.id!, app);

      const novationData = {
        contractedServices: { [newService.name.toLowerCase()]: newService.activePricings.keys().next().value! },
        subscriptionPlans: { [newService.name.toLowerCase()]: Object.keys(pricingDetails!.plans!)[0] },
        subscriptionAddOns: {},
      };

      const response = await request(app)
        .put(`${baseUrl}/contracts/${testContract.userContact.userId}`)
        .set('x-api-key', testOrgApiKey)
        .send(novationData);

      expect(response.status).toBe(200);
      expect(response.body.contractedServices).toHaveProperty(newService.name.toLowerCase());

      await deleteTestService(newService.name, testOrganization.id!);
    });

    it('returns 200 and contractedServices keys in lowercase even with uppercase service name', async function () {
      const upperCaseServiceName = 'UPPERCASE-SERVICE';
      const newService = await createTestService(testOrganization.id, upperCaseServiceName);
      const pricingVersion = newService.activePricings.keys().next().value!;
      const pricingDetails = await getPricingFromService(newService.name, pricingVersion, testOrganization.id!, app);

      const novationData = {
        contractedServices: { [newService.name]: newService.activePricings.keys().next().value! },
        subscriptionPlans: { [newService.name]: Object.keys(pricingDetails!.plans!)[0] },
        subscriptionAddOns: {},
      };

      const response = await request(app)
        .put(`${baseUrl}/contracts/${testContract.userContact.userId}`)
        .set('x-api-key', testOrgApiKey)
        .send(novationData);

      expect(response.status).toBe(200);
      
      // Verify all keys are lowercase
      const contractedServicesKeys = Object.keys(response.body.contractedServices);
      const subscriptionPlansKeys = Object.keys(response.body.subscriptionPlans);
      const subscriptionAddOnsKeys = Object.keys(response.body.subscriptionAddOns);

      expect(contractedServicesKeys.every(key => key === key.toLowerCase())).toBe(true);
      expect(subscriptionPlansKeys.every(key => key === key.toLowerCase())).toBe(true);
      expect(subscriptionAddOnsKeys.every(key => key === key.toLowerCase())).toBe(true);

      await deleteTestService(newService.name, testOrganization.id!);
    });

    it('returns 404 when contract is not found', async function () {
      const novationData = {
        contractedServices: { [testService.name.toLowerCase()]: testService.activePricings.keys().next().value! },
        subscriptionPlans: {},
        subscriptionAddOns: {},
      };

      const response = await request(app)
        .put(`${baseUrl}/contracts/non-existent-userId`)
        .set('x-api-key', testOrgApiKey)
        .send(novationData);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });

    it('returns 401 when API key is missing', async function () {
      const response = await request(app)
        .put(`${baseUrl}/contracts/some-userId`)
        .send({});

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('API Key');
    });
  });

  describe('PUT /organizations/:organizationId/contracts/:userId', function () {
    it('returns 200 and novates the contract with user API key', async function () {
      const newService = await createTestService(testOrganization.id, `new-service-${Date.now()}`);
      const pricingVersion = newService.activePricings.keys().next().value!;
      const pricingDetails = await getPricingFromService(newService.name, pricingVersion, testOrganization.id!, app);

      const novationData = {
        contractedServices: { [newService.name]: newService.activePricings.keys().next().value! },
        subscriptionPlans: { [newService.name]: Object.keys(pricingDetails!.plans!)[0] },
        subscriptionAddOns: {},
      };

      const response = await request(app)
        .put(
          `${baseUrl}/organizations/${testOrganization.id}/contracts/${testContract.userContact.userId}`
        )
        .set('x-api-key', ownerUser.apiKey)
        .send(novationData);

      expect(response.status).toBe(200);
      expect(response.body.contractedServices).toHaveProperty(newService.name.toLowerCase());

      await deleteTestService(newService.name, testOrganization.id!);
    });

    it('returns 401 when API key is missing', async function () {
      const response = await request(app)
        .put(`${baseUrl}/organizations/${testOrganization.id}/contracts/some-userId`)
        .send({});

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('API Key');
    });
  });

  describe('DELETE /contracts/:userId', function () {
    it('returns 204 when deleting an existing contract', async function () {
      const response = await request(app)
        .delete(`${baseUrl}/contracts/${testContract.userContact.userId}`)
        .set('x-api-key', testOrgApiKey);

      expect(response.status).toBe(204);

      // Verify deletion
      const getResponse = await request(app)
        .get(`${baseUrl}/contracts/${testContract.userContact.userId}`)
        .set('x-api-key', testOrgApiKey);
      expect(getResponse.status).toBe(404);
    });

    it('returns 404 when deleting a non-existent contract', async function () {
      const response = await request(app)
        .delete(`${baseUrl}/contracts/non-existent-userId`)
        .set('x-api-key', testOrgApiKey);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });

    it('returns 401 when API key is missing', async function () {
      const response = await request(app).delete(`${baseUrl}/contracts/some-userId`);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('API Key');
    });
  });

  describe('DELETE /organizations/:organizationId/contracts/:userId', function () {
    it('returns 204 when deleting an existing contract with user API key', async function () {
      const response = await request(app)
        .delete(
          `${baseUrl}/organizations/${testOrganization.id}/contracts/${testContract.userContact.userId}`
        )
        .set('x-api-key', ownerUser.apiKey);

      expect(response.status).toBe(204);
    });

    it('returns 404 when deleting a non-existent contract', async function () {
      const response = await request(app)
        .delete(`${baseUrl}/organizations/${testOrganization.id}/contracts/non-existent-userId`)
        .set('x-api-key', ownerUser.apiKey);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });

    it('returns 401 when API key is missing', async function () {
      const response = await request(app).delete(
        `${baseUrl}/organizations/${testOrganization.id}/contracts/some-userId`
      );

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('API Key');
    });
  });

  describe('DELETE /contracts', function () {
    it('returns 204 when deleting all contracts with org API key', async function () {
      const response = await request(app)
        .delete(`${baseUrl}/contracts`)
        .set('x-api-key', testOrgApiKey);

      expect(response.status).toBe(204);
    });

    it('returns 401 when API key is missing', async function () {
      const response = await request(app).delete(`${baseUrl}/contracts`);

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('API Key');
    });
  });

  describe('DELETE /organizations/:organizationId/contracts', function () {
    it('returns 204 when deleting all contracts for an organization', async function () {
      const response = await request(app)
        .delete(`${baseUrl}/organizations/${testOrganization.id}/contracts`)
        .set('x-api-key', ownerUser.apiKey);

      expect(response.status).toBe(204);
    });

    it('returns 401 when API key is missing', async function () {
      const response = await request(app).delete(
        `${baseUrl}/organizations/${testOrganization.id}/contracts`
      );

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('API Key');
    });
  });

  describe('PUT /contracts/:userId/usageLevels', function () {
    it('returns 200 and increments usage levels', async function () {
      const serviceLowercase = testService.name.toLowerCase();
      const usageLimitName = testContract.usageLevels && testContract.usageLevels[serviceLowercase]
        ? Object.keys(testContract.usageLevels[serviceLowercase])[0]
        : 'defaultLimit';
        
      const incrementData = {
        [testService.name]: {
          [usageLimitName]: 10,
        },
      };

      const response = await request(app)
        .put(`${baseUrl}/contracts/${testContract.userContact.userId}/usageLevels`)
        .set('x-api-key', testOrgApiKey)
        .send(incrementData);

      expect(response.status).toBe(200);
      if (response.body.usageLevels && response.body.usageLevels[serviceLowercase]) {
        expect(response.body.usageLevels[serviceLowercase][usageLimitName].consumed).toBeGreaterThanOrEqual(10);
      }
    });

    it('returns 200 and resets usage levels with reset=true', async function () {
      const response = await request(app)
        .put(`${baseUrl}/contracts/${testContract.userContact.userId}/usageLevels?reset=true`)
        .set('x-api-key', testOrgApiKey)
        .send({});

      expect(response.status).toBe(200);
    });

    it('returns 400 when both reset and usageLimit are provided', async function () {
      const response = await request(app)
        .put(
          `${baseUrl}/contracts/${testContract.userContact.userId}/usageLevels?reset=true&usageLimit=someLimit`
        )
        .set('x-api-key', testOrgApiKey)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid query');
    });

    it('returns 404 when contract is not found', async function () {
      const response = await request(app)
        .put(`${baseUrl}/contracts/non-existent-userId/usageLevels`)
        .set('x-api-key', testOrgApiKey)
        .send({});

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('PUT /contracts/:userId/userContact', function () {
    it('returns 200 and updates user contact information', async function () {
      const newContactData = {
        firstName: 'NewFirstName',
        lastName: 'NewLastName',
        email: 'newemail@example.com',
      };

      const response = await request(app)
        .put(`${baseUrl}/contracts/${testContract.userContact.userId}/userContact`)
        .set('x-api-key', testOrgApiKey)
        .send(newContactData);

      expect(response.status).toBe(200);
      expect(response.body.userContact.firstName).toBe('NewFirstName');
      expect(response.body.userContact.lastName).toBe('NewLastName');
      expect(response.body.userContact.email).toBe('newemail@example.com');
    });

    it('returns 404 when contract is not found', async function () {
      const response = await request(app)
        .put(`${baseUrl}/contracts/non-existent-userId/userContact`)
        .set('x-api-key', testOrgApiKey)
        .send({ firstName: 'Test' });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });
  });

  describe('PUT /contracts/:userId/billingPeriod', function () {
    it('returns 200 and updates billing period', async function () {
      const newBillingPeriod = {
        endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        autoRenew: true,
        renewalDays: 365,
      };

      const response = await request(app)
        .put(`${baseUrl}/contracts/${testContract.userContact.userId}/billingPeriod`)
        .set('x-api-key', testOrgApiKey)
        .send(newBillingPeriod);

      expect(response.status).toBe(200);
      expect(response.body.billingPeriod.autoRenew).toBe(true);
      expect(response.body.billingPeriod.renewalDays).toBe(365);
    });

    it('returns 404 when contract is not found', async function () {
      const response = await request(app)
        .put(`${baseUrl}/contracts/non-existent-userId/billingPeriod`)
        .set('x-api-key', testOrgApiKey)
        .send({ autoRenew: true });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('not found');
    });
  });
});
