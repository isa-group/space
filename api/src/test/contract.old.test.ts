import request from 'supertest';
import { baseUrl, getApp, shutdownApp } from './utils/testApp';
import { Server } from 'http';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createRandomContract,
  createRandomContracts,
  createRandomContractsForService,
  getAllContracts,
  getContractByUserId,
  incrementAllUsageLevel,
} from './utils/contracts/contracts';
import { generateContractAndService, generateNovation } from './utils/contracts/generators';
import { addDays } from 'date-fns';
import { UsageLevel } from '../main/types/models/Contract';
import { TestContract } from './types/models/Contract';
import { testUserId } from './utils/contracts/ContractTestData';
import { cleanupAuthResources, getTestAdminApiKey, getTestAdminUser } from './utils/auth';

describe('Contract API Test Suite', function () {
  let app: Server;
  let adminApiKey: string;

  beforeAll(async function () {
    app = await getApp();
    await getTestAdminUser();
    adminApiKey = await getTestAdminApiKey();
  });

  afterAll(async function () {
    await cleanupAuthResources();
    await shutdownApp();
  });

  describe('GET /contracts', function () {
    let contracts: TestContract[];

    beforeAll(async function () {
      contracts = await createRandomContracts(10, app);
    });

    it('Should return 200 and the contracts', async function () {
      const response = await request(app)
        .get(`${baseUrl}/contracts`)
        .set('x-api-key', adminApiKey)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBeTruthy();
      expect(response.body.length).toBeGreaterThan(0);
    });

    it('Should return 200: Should return filtered contracts by username query parameter', async function () {
      const allContracts = await getAllContracts(app);
      const testContract = allContracts[0];
      const username = testContract.userContact.username;

      const response = await request(app)
        .get(`${baseUrl}/contracts?username=${username}`)
        .set('x-api-key', adminApiKey)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBeTruthy();
      expect(response.body.length).toBeGreaterThan(0);
      expect(
        response.body.every((contract: TestContract) => contract.userContact.username === username)
      ).toBeTruthy();
    });

    it('Should return 200: Should return filtered contracts by firstName query parameter', async function () {
      const allContracts = await getAllContracts(app);
      const testContract = allContracts[0];
      const firstName = testContract.userContact.firstName;

      const response = await request(app)
        .get(`${baseUrl}/contracts?firstName=${firstName}`)
        .set('x-api-key', adminApiKey)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBeTruthy();
      expect(response.body.length).toBeGreaterThan(0);
      expect(
        response.body.every(
          (contract: TestContract) => contract.userContact.firstName === firstName
        )
      ).toBeTruthy();
    });

    it('Should return 200: Should return filtered contracts by lastName query parameter', async function () {
      const allContracts = await getAllContracts(app);
      const testContract = allContracts[0];
      const lastName = testContract.userContact.lastName;

      const response = await request(app)
        .get(`${baseUrl}/contracts?lastName=${lastName}`)
        .set('x-api-key', adminApiKey)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBeTruthy();
      expect(response.body.length).toBeGreaterThan(0);
      expect(
        response.body.every((contract: TestContract) => contract.userContact.lastName === lastName)
      ).toBeTruthy();
    });

    it('Should return 200: Should return filtered contracts by email query parameter', async function () {
      const allContracts = await getAllContracts(app);
      const testContract = allContracts[0];
      const email = testContract.userContact.email;

      const response = await request(app)
        .get(`${baseUrl}/contracts?email=${email}`)
        .set('x-api-key', adminApiKey)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBeTruthy();
      expect(response.body.length).toBeGreaterThan(0);
      expect(
        response.body.every((contract: TestContract) => contract.userContact.email === email)
      ).toBeTruthy();
    });

    it('Should return 200: Should paginate contracts using page and limit parameters', async function () {
      // Create additional contracts to ensure pagination
      await Promise.all([
        createRandomContract(app),
        createRandomContract(app),
        createRandomContract(app),
      ]);

      const limit = 2;
      const page1Response = await request(app)
        .get(`${baseUrl}/contracts?page=1&limit=${limit}`)
        .set('x-api-key', adminApiKey)
        .expect(200);

      const page2Response = await request(app)
        .get(`${baseUrl}/contracts?page=2&limit=${limit}`)
        .set('x-api-key', adminApiKey)
        .expect(200);

      expect(page1Response.body).toBeDefined();
      expect(Array.isArray(page1Response.body)).toBeTruthy();
      expect(page1Response.body.length).toBe(limit);

      expect(page2Response.body).toBeDefined();
      expect(Array.isArray(page2Response.body)).toBeTruthy();

      // Check that the results from page 1 and 2 are different
      const page1Ids = page1Response.body.map(
        (contract: TestContract) => contract.userContact.userId
      );
      const page2Ids = page2Response.body.map(
        (contract: TestContract) => contract.userContact.userId
      );
      expect(page1Ids).not.toEqual(page2Ids);
    });

    it('Should return 200: Should paginate contracts using offset and limit parameters', async function () {
      const limit = 3;
      const offsetResponse = await request(app)
        .get(`${baseUrl}/contracts?offset=3&limit=${limit}`)
        .set('x-api-key', adminApiKey)
        .expect(200);

      expect(offsetResponse.body).toBeDefined();
      expect(Array.isArray(offsetResponse.body)).toBeTruthy();

      // Verify that this is working by comparing with a direct fetch
      const allContracts = await getAllContracts(app);
      const expectedContracts = allContracts.slice(3, 3 + limit);
      expect(offsetResponse.body.length).toBe(expectedContracts.length);
    });

    it('Should return 200: Should sort contracts by firstName in ascending order', async function () {
      const response = await request(app)
        .get(`${baseUrl}/contracts?sort=firstName&order=asc`)
        .set('x-api-key', adminApiKey)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBeTruthy();

      const firstNames = response.body.map(
        (contract: TestContract) => contract.userContact.firstName
      );
      const sortedFirstNames = [...firstNames].sort();
      expect(firstNames).toEqual(sortedFirstNames);
    });

    it('Should return 200: Should sort contracts by lastName in descending order', async function () {
      const response = await request(app)
        .get(`${baseUrl}/contracts?sort=lastName&order=desc`)
        .set('x-api-key', adminApiKey)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBeTruthy();

      const lastNames = response.body.map(
        (contract: TestContract) => contract.userContact.lastName
      );
      const sortedLastNames = [...lastNames].sort().reverse();
      expect(lastNames).toEqual(sortedLastNames);
    });

    it('Should return 200: Should sort contracts by username by default', async function () {
      const response = await request(app)
        .get(`${baseUrl}/contracts`)
        .set('x-api-key', adminApiKey)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBeTruthy();

      const usernames = response.body.map(
        (contract: TestContract) => contract.userContact.username
      );
      const sortedUsernames = [...usernames].sort();
      expect(usernames).toEqual(sortedUsernames);
    });

    it('Should return 200: Should enforce maximum limit value', async function () {
      const response = await request(app)
        .get(`${baseUrl}/contracts?limit=200`)
        .set('x-api-key', adminApiKey)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBeTruthy();
      expect(response.body.length).toBeLessThanOrEqual(100);
    });

    it('Should return 200: Should return filtered contracts by serviceName query parameter', async function () {
      // First, get all contracts to find one with a specific service
      const allContracts = await getAllContracts(app);

      // Find a contract with at least one contracted service
      const testContract = allContracts.find(
        contract => Object.keys(contract.contractedServices).length > 0
      );

      // Get the first serviceName from the contract
      const serviceName = Object.keys(testContract.contractedServices)[0];

      const response = await request(app)
        .get(`${baseUrl}/contracts`)
        .set('x-api-key', adminApiKey)
        .send({ filters: { services: [serviceName] } })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBeTruthy();
      expect(response.body.length).toBeGreaterThan(0);
      expect(
        response.body.every((contract: TestContract) =>
          Object.keys(contract.contractedServices).includes(serviceName)
        )
      ).toBeTruthy();
    });

  it('Should return 200: Should return filtered contracts by services (array)', async function () {
      // Ensure at least one contract exists with a service
      const created = await createRandomContract(app);
      const serviceName = Object.keys(created.contractedServices)[0];

      const response = await request(app)
        .get(`${baseUrl}/contracts`)
        .set('x-api-key', adminApiKey)
        .send({ filters: { services: [serviceName] } })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBeTruthy();
      expect(response.body.length).toBeGreaterThan(0);
      expect(
        response.body.every((c: any) => Object.keys(c.contractedServices).includes(serviceName))
      ).toBeTruthy();
    });

  it('Should return 200: Should return filtered contracts by services with specific versions (object)', async function () {
      // Create a set of contracts for the same service/version
      const first = await createRandomContract(app);
      const serviceName = Object.keys(first.contractedServices)[0];
      const pricingVersion = first.contractedServices[serviceName];

      // Create more contracts with the same service/version
      await createRandomContractsForService(serviceName, pricingVersion, 3, app);

      const response = await request(app)
        .get(`${baseUrl}/contracts`)
        .set('x-api-key', adminApiKey)
        .query({ limit: 50 })
        .send({ filters: { services: { [serviceName]: [pricingVersion] } } })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBeTruthy();
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      expect(
        response.body.every(
          (c: any) => c.contractedServices && c.contractedServices[serviceName] === pricingVersion
        )
      ).toBeTruthy();
    });

  it('Should return 200: Should return filtered contracts by plans', async function () {
      // Create a contract and use its plan for filtering
      const created = await createRandomContract(app);
      const serviceName = Object.keys(created.subscriptionPlans)[0];
      // If no plans were set for the contract, skip this assertion (safety)
      if (!serviceName) return;
      const planName = created.subscriptionPlans[serviceName];

      const response = await request(app)
        .get(`${baseUrl}/contracts`)
        .set('x-api-key', adminApiKey)
        .query({ limit: 50 })
        .send({ filters: { plans: { [serviceName]: [planName] } } })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBeTruthy();
      expect(response.body.length).toBeGreaterThanOrEqual(1);
      expect(
        response.body.every(
          (c: any) => c.subscriptionPlans && c.subscriptionPlans[serviceName] === planName
        )
      ).toBeTruthy();
    });

  it('Should return 200: Should return filtered contracts by addOns', async function () {
      // Find a contract with at least one addOn
      const all = await getAllContracts(app);
      const withAddOn = all.find((c: any) => Object.keys(c.subscriptionAddOns || {}).length > 0);
      if (!withAddOn) {
        // Create a contract that includes addOns by creating several contracts until one contains addOns
        const created = await createRandomContract(app);
        // Try again
        const all2 = await getAllContracts(app);
        const withAddOn2 = all2.find(
          (c: any) => Object.keys(c.subscriptionAddOns || {}).length > 0
        );
        if (!withAddOn2)
          return; // if still none, skip test
        else {
          const svc = Object.keys(withAddOn2.subscriptionAddOns)[0];
          const addOn = Object.keys(withAddOn2.subscriptionAddOns[svc])[0];

          const response = await request(app)
            .get(`${baseUrl}/contracts`)
            .set('x-api-key', adminApiKey)
            .query({ limit: 50 })
            .send({ filters: { addOns: { [svc]: [addOn] } } })
            .expect(200);

          expect(response.body).toBeDefined();
          expect(Array.isArray(response.body)).toBeTruthy();
          expect(response.body.length).toBeGreaterThanOrEqual(1);
          expect(
            response.body.every(
              (c: any) =>
                c.subscriptionAddOns &&
                c.subscriptionAddOns[svc] &&
                c.subscriptionAddOns[svc][addOn] !== undefined
            )
          ).toBeTruthy();
        }
      } else {
        const svc = Object.keys(withAddOn.subscriptionAddOns)[0];
        const addOn = Object.keys(withAddOn.subscriptionAddOns[svc])[0];

        const response = await request(app)
          .get(`${baseUrl}/contracts`)
          .set('x-api-key', adminApiKey)
          .query({ limit: 50 })
          .send({ filters: { addOns: { [svc]: [addOn] } } })
          .expect(200);

        expect(response.body).toBeDefined();
        expect(Array.isArray(response.body)).toBeTruthy();
        expect(response.body.length).toBeGreaterThanOrEqual(1);
        expect(
          response.body.every(
            (c: any) =>
              c.subscriptionAddOns &&
              c.subscriptionAddOns[svc] &&
              c.subscriptionAddOns[svc][addOn] !== undefined
          )
        ).toBeTruthy();
      }
    });

  it('Should return 200: Should return empty array for unknown service', async function () {
      const response = await request(app)
        .get(`${baseUrl}/contracts`)
        .set('x-api-key', adminApiKey)
        .query({ limit: 20 })
        .send({ filters: { services: ['non-existent-service-xyz'] } })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBeTruthy();
      expect(response.body.length).toBe(0);
    });

  it('Should return 200: Should return empty array for known service but non-matching version', async function () {
      const created = await createRandomContract(app);
      const serviceName = Object.keys(created.contractedServices)[0];
      const wrongVersion = '0_0_0_nonexistent';

      const response = await request(app)
        .get(`${baseUrl}/contracts`)
        .set('x-api-key', adminApiKey)
        .query({ limit: 20 })
        .send({ filters: { services: { [serviceName]: [wrongVersion] } } })
        .expect(200);

      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBeTruthy();
      // Should be empty because version doesn't match
      expect(response.body.length).toBe(0);
    });
  });

  describe('POST /contracts', function () {
    it('Should return 201 and the created contract', async function () {
      const { contract: contractToCreate } = await generateContractAndService(undefined, app);
      const response = await request(app)
        .post(`${baseUrl}/contracts`)
        .set('x-api-key', adminApiKey)
        .send(contractToCreate);

      expect(response.status).toBe(201);
      expect(response.body).toBeDefined();
      expect(response.body.userContact.userId).toBe(contractToCreate.userContact.userId);
      expect(response.body).toHaveProperty('billingPeriod');
      expect(response.body).toHaveProperty('usageLevels');
      expect(response.body).toHaveProperty('contractedServices');
      expect(response.body).toHaveProperty('subscriptionPlans');
      expect(response.body).toHaveProperty('subscriptionAddOns');
      expect(response.body).toHaveProperty('history');
      expect(new Date(response.body.billingPeriod.endDate)).toEqual(
        addDays(response.body.billingPeriod.startDate, response.body.billingPeriod.renewalDays)
      );
    });

    it('Should return 422 when userContact.userId is an empty string', async function () {
      const { contract: contractToCreate } = await generateContractAndService(undefined, app);

      // Force empty userId
      contractToCreate.userContact.userId = '';

      const response = await request(app)
        .post(`${baseUrl}/contracts`)
        .set('x-api-key', adminApiKey)
        .send(contractToCreate);

      expect(response.status).toBe(422);
      expect(response.body).toBeDefined();
      expect(response.body.error).toBeDefined();
      // Validation message should mention userContact.userId or cannot be empty
      expect(response.body.error.toLowerCase()).toContain('usercontact.userid');
    });

    it('Should return 400 given a contract with unexistent service', async function () {
      const { contract: contractToCreate } = await generateContractAndService(undefined, app);

      contractToCreate.contractedServices['unexistent-service'] = '1.0.0';

      const response = await request(app)
        .post(`${baseUrl}/contracts`)
        .set('x-api-key', adminApiKey)
        .send(contractToCreate);

      expect(response.status).toBe(400);
      expect(response.body).toBeDefined();
      expect(response.body.error).toBe('Invalid contract: Services not found: unexistent-service');
    });

    it('Should return 400 given a contract with existent service, but invalid version', async function () {
      const { contract: contractToCreate } = await generateContractAndService(undefined, app);

      const existingService = Object.keys(contractToCreate.contractedServices)[0];
      contractToCreate.contractedServices[existingService] = 'invalid-version';

      const response = await request(app)
        .post(`${baseUrl}/contracts`)
        .set('x-api-key', adminApiKey)
        .send(contractToCreate);

      expect(response.status).toBe(400);
      expect(response.body).toBeDefined();
      expect(response.body.error).toBe(
        `Invalid contract: Pricing version invalid-version for service ${existingService} not found`
      );
    });

    it('Should return 400 given a contract with a non-existent plan for a contracted service', async function () {
      const { contract: contractToCreate } = await generateContractAndService(undefined, app);

      const serviceName = Object.keys(contractToCreate.contractedServices)[0];
      // Set an invalid plan name
      contractToCreate.subscriptionPlans[serviceName] = 'NON_EXISTENT_PLAN';

      const response = await request(app)
        .post(`${baseUrl}/contracts`)
        .set('x-api-key', adminApiKey)
        .send(contractToCreate);

      expect(response.status).toBe(400);
      expect(response.body).toBeDefined();
      expect(response.body.error).toBeDefined();
      expect(String(response.body.error)).toContain('Invalid subscription');
    });

    it('Should return 400 given a contract with a non-existent add-on for a contracted service', async function () {
      const { contract: contractToCreate } = await generateContractAndService(undefined, app);

      const serviceName = Object.keys(contractToCreate.contractedServices)[0];
      // Inject an invalid add-on name
      contractToCreate.subscriptionAddOns[serviceName] = { non_existent_addon: 1 };

      const response = await request(app)
        .post(`${baseUrl}/contracts`)
        .set('x-api-key', adminApiKey)
        .send(contractToCreate);

      expect(response.status).toBe(400);
      expect(response.body).toBeDefined();
      expect(response.body.error).toBeDefined();
      expect(String(response.body.error)).toContain('Invalid subscription');
    });

    it('Should return 400 when creating a contract for a userId that already has a contract', async function () {
      // Create initial contract
      const { contract: contractToCreate } = await generateContractAndService(undefined, app);

      const firstResponse = await request(app)
        .post(`${baseUrl}/contracts`)
        .set('x-api-key', adminApiKey)
        .send(contractToCreate);

      expect(firstResponse.status).toBe(201);

      // Try to create another contract with the same userId
      const secondResponse = await request(app)
        .post(`${baseUrl}/contracts`)
        .set('x-api-key', adminApiKey)
        .send(contractToCreate);

      expect(secondResponse.status).toBe(400);
      expect(secondResponse.body).toBeDefined();
      expect(secondResponse.body.error).toBeDefined();
      expect(secondResponse.body.error.toLowerCase()).toContain('already exists');
    });
  });

  describe('GET /contracts/:userId', function () {
    it('Should return 200 and the contract for the given userId', async function () {
      const response = await request(app)
        .get(`${baseUrl}/contracts/${testUserId}`)
        .set('x-api-key', adminApiKey)
        .expect(200);

      const contract: TestContract = response.body;

      expect(contract).toBeDefined();
      expect(contract.userContact.userId).toBe(testUserId);
      expect(contract).toHaveProperty('billingPeriod');
      expect(contract).toHaveProperty('usageLevels');
      expect(contract).toHaveProperty('contractedServices');
      expect(contract).toHaveProperty('subscriptionPlans');
      expect(contract).toHaveProperty('subscriptionAddOns');
      expect(contract).toHaveProperty('history');
      expect(Object.values(Object.values(contract.usageLevels)[0])[0].consumed).toBeTruthy();
    });

    it('Should return 404 if the contract is not found', async function () {
      const response = await request(app)
        .get(`${baseUrl}/contracts/invalid-user-id`)
        .set('x-api-key', adminApiKey)
        .expect(404);

      expect(response.body).toBeDefined();
      expect(response.body.error).toContain('not found');
    });
  });

  describe('PUT /contracts/:userId', function () {
    it('Should return 200 and the novated contract', async function () {
      const newContract = await createRandomContract(app);
      const newContractFullData = await getContractByUserId(newContract.userContact.userId, app);

      const novation = await generateNovation();

      const response = await request(app)
        .put(`${baseUrl}/contracts/${newContract.userContact.userId}`)
        .set('x-api-key', adminApiKey)
        .send(novation)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.userContact.userId).toBe(newContract.userContact.userId);
      expect(response.body).toHaveProperty('billingPeriod');
      expect(response.body).toHaveProperty('usageLevels');
      expect(response.body).toHaveProperty('contractedServices');
      expect(response.body).toHaveProperty('subscriptionPlans');
      expect(response.body).toHaveProperty('subscriptionAddOns');
      expect(response.body).toHaveProperty('history');
      expect(response.body.history.length).toBe(1);
      expect(newContractFullData.billingPeriod.startDate).not.toEqual(
        response.body.billingPeriod.startDate
      );
      expect(new Date(response.body.billingPeriod.endDate)).toEqual(
        addDays(response.body.billingPeriod.startDate, response.body.billingPeriod.renewalDays)
      );
    });
  });

  describe('DELETE /contracts/:userId', function () {
    it('Should return 204', async function () {
      const newContract = await createRandomContract(app);

      await request(app)
        .delete(`${baseUrl}/contracts/${newContract.userContact.userId}`)
        .set('x-api-key', adminApiKey)
        .expect(204);
    });
    it('Should return 404 with invalid userId', async function () {
      const response = await request(app)
        .delete(`${baseUrl}/contracts/invalid-user-id`)
        .set('x-api-key', adminApiKey)
        .expect(404);

      expect(response.body).toBeDefined();
      expect(response.body.error.toLowerCase()).toContain('not found');
    });
  });

  describe('PUT /contracts/:userId/usageLevels', function () {
    it('Should return 200 and the novated contract: Given usage level increment', async function () {
      const newContract: TestContract = await createRandomContract(app);

      const serviceKey = Object.keys(newContract.usageLevels)[0];
      const usageLevelKey = Object.keys(newContract.usageLevels[serviceKey])[0];
      const usageLevel = newContract.usageLevels[serviceKey][usageLevelKey];

      expect(usageLevel.consumed).toBe(0);

      const response = await request(app)
        .put(`${baseUrl}/contracts/${newContract.userContact.userId}/usageLevels`)
        .set('x-api-key', adminApiKey)
        .send({
          [serviceKey]: {
            [usageLevelKey]: 5,
          },
        });

      expect(response.status).toBe(200);

      const updatedContract: TestContract = response.body;

      expect(updatedContract).toBeDefined();
      expect(updatedContract.userContact.userId).toBe(newContract.userContact.userId);
      expect(updatedContract.usageLevels[serviceKey][usageLevelKey].consumed).toBe(5);
    });

    it('Should return 200 and the novated contract: Given reset only', async function () {
      let newContract: TestContract = await createRandomContract(app);

      Object.values(newContract.usageLevels)
        .map((s: Record<string, UsageLevel>) => Object.values(s))
        .flat()
        .forEach((ul: UsageLevel) => {
          expect(ul.consumed).toBe(0);
        });

      newContract = await incrementAllUsageLevel(
        newContract.userContact.userId,
        newContract.usageLevels,
        app
      );

      Object.values(newContract.usageLevels)
        .map((s: Record<string, UsageLevel>) => Object.values(s))
        .flat()
        .forEach((ul: UsageLevel) => {
          expect(ul.consumed).toBeGreaterThan(0);
        });

      const response = await request(app)
        .put(`${baseUrl}/contracts/${newContract.userContact.userId}/usageLevels?reset=true`)
        .set('x-api-key', adminApiKey)
        .expect(200);

      const updatedContract: TestContract = response.body;

      expect(updatedContract).toBeDefined();
      expect(updatedContract.userContact.userId).toBe(newContract.userContact.userId);

      // All RENEWABLE limits are reset to 0
      Object.values(updatedContract.usageLevels)
        .map((s: Record<string, UsageLevel>) => Object.values(s))
        .flat()
        .forEach((ul: UsageLevel) => {
          if (ul.resetTimeStamp) {
            expect(ul.consumed).toBe(0);
          }
        });

      // All NON_RENEWABLE limits are not reset
      Object.values(updatedContract.usageLevels)
        .map((s: Record<string, UsageLevel>) => Object.values(s))
        .flat()
        .forEach((ul: UsageLevel) => {
          if (!ul.resetTimeStamp) {
            expect(ul.consumed).toBeGreaterThan(0);
          }
        });
    });

    it('Should return 200 and the novated contract: Given reset and disabled renewableOnly', async function () {
      let newContract: TestContract = await createRandomContract(app);

      Object.values(newContract.usageLevels)
        .map((s: Record<string, UsageLevel>) => Object.values(s))
        .flat()
        .forEach((ul: UsageLevel) => {
          expect(ul.consumed).toBe(0);
        });

      newContract = await incrementAllUsageLevel(
        newContract.userContact.userId,
        newContract.usageLevels,
        app
      );

      Object.values(newContract.usageLevels)
        .map((s: Record<string, UsageLevel>) => Object.values(s))
        .flat()
        .forEach((ul: UsageLevel) => {
          expect(ul.consumed).toBeGreaterThan(0);
        });

      const response = await request(app)
        .put(
          `${baseUrl}/contracts/${newContract.userContact.userId}/usageLevels?reset=true&renewableOnly=false`
        )
        .set('x-api-key', adminApiKey)
        .expect(200);

      const updatedContract: TestContract = response.body;

      expect(updatedContract).toBeDefined();
      expect(updatedContract.userContact.userId).toBe(newContract.userContact.userId);

      // All usage levels are reset to 0
      Object.values(updatedContract.usageLevels)
        .map((s: Record<string, UsageLevel>) => Object.values(s))
        .flat()
        .forEach((ul: UsageLevel) => {
          expect(ul.consumed).toBe(0);
        });
    });

    it('Should return 200 and the novated contract: Given usageLimit', async function () {
      let newContract: TestContract = await createRandomContract(app);

      Object.values(newContract.usageLevels)
        .map((s: Record<string, UsageLevel>) => Object.values(s))
        .flat()
        .forEach((ul: UsageLevel) => {
          expect(ul.consumed).toBe(0);
        });

      newContract = await incrementAllUsageLevel(
        newContract.userContact.userId,
        newContract.usageLevels,
        app
      );

      Object.values(newContract.usageLevels)
        .map((s: Record<string, UsageLevel>) => Object.values(s))
        .flat()
        .forEach((ul: UsageLevel) => {
          expect(ul.consumed).toBeGreaterThan(0);
        });

      const serviceKey = Object.keys(newContract.usageLevels)[0];
      const sampleUsageLimitKey = Object.keys(newContract.usageLevels[serviceKey])[0];

      const response = await request(app)
        .put(
          `${baseUrl}/contracts/${newContract.userContact.userId}/usageLevels?usageLimit=${sampleUsageLimitKey}`
        )
        .set('x-api-key', adminApiKey);

      expect(response.status).toBe(200);

      const updatedContract: TestContract = response.body;

      expect(updatedContract).toBeDefined();
      expect(updatedContract.userContact.userId).toBe(newContract.userContact.userId);

      // Check if all usage levels are greater than 0, except the one specified in the query
      Object.entries(updatedContract.usageLevels).forEach(([serviceKey, usageLimits]) => {
        Object.entries(usageLimits).forEach(([usageLimitKey, usageLevel]) => {
          if (usageLimitKey === sampleUsageLimitKey) {
            expect(usageLevel.consumed).toBe(0);
          } else {
            expect(usageLevel.consumed).toBeGreaterThan(0);
          }
        });
      });
    });

    it('Should return 404: Given reset and usageLimit', async function () {
      const newContract: TestContract = await createRandomContract(app);

      await request(app)
        .put(
          `${baseUrl}/contracts/${newContract.userContact.userId}/usageLevels?reset=true&usageLimit=test`
        )
        .set('x-api-key', adminApiKey)
        .expect(400);
    });

    it('Should return 404: Given invalid usageLimit', async function () {
      const newContract: TestContract = await createRandomContract(app);

      await request(app)
        .put(
          `${baseUrl}/contracts/${newContract.userContact.userId}/usageLevels?usageLimit=invalid-usage-limit`
        )
        .set('x-api-key', adminApiKey)
        .expect(404);
    });

    it('Should return 422: Given invalid body', async function () {
      const newContract: TestContract = await createRandomContract(app);

      await request(app)
        .put(`${baseUrl}/contracts/${newContract.userContact.userId}/usageLevels`)
        .set('x-api-key', adminApiKey)
        .send({
          test: 'invalid object',
        })
        .expect(422);
    });
  });

  describe('PUT /contracts/:userId/userContact', function () {
    it('Should return 200 and the updated contract', async function () {
      const newContract: TestContract = await createRandomContract(app);

      const newUserContactFields = {
        username: 'newUsername',
        firstName: 'newFirstName',
        lastName: 'newLastName',
      };

      const response = await request(app)
        .put(`${baseUrl}/contracts/${newContract.userContact.userId}/userContact`)
        .set('x-api-key', adminApiKey)
        .send(newUserContactFields)
        .expect(200);
      const updatedContract: TestContract = response.body;

      expect(updatedContract).toBeDefined();
      expect(updatedContract.userContact.username).toBe(newUserContactFields.username);
      expect(updatedContract.userContact.firstName).toBe(newUserContactFields.firstName);
      expect(updatedContract.userContact.lastName).toBe(newUserContactFields.lastName);
      expect(updatedContract.userContact.email).toBe(newContract.userContact.email);
      expect(updatedContract.userContact.phone).toBe(newContract.userContact.phone);
    });
  });

  describe('PUT /contracts/:userId/billingPeriod', function () {
    it('Should return 200 and the updated contract', async function () {
      const newContract: TestContract = await createRandomContract(app);

      const newBillingPeriodFields = {
        endDate: addDays(newContract.billingPeriod.endDate, 3),
        autoRenew: true,
        renewalDays: 30,
      };

      const response = await request(app)
        .put(`${baseUrl}/contracts/${newContract.userContact.userId}/billingPeriod`)
        .set('x-api-key', adminApiKey)
        .send(newBillingPeriodFields)
        .expect(200);
      const updatedContract: TestContract = response.body;

      expect(updatedContract).toBeDefined();
      expect(new Date(updatedContract.billingPeriod.endDate)).toEqual(
        addDays(newContract.billingPeriod.endDate, 3)
      );
      expect(updatedContract.billingPeriod.autoRenew).toBe(true);
      expect(updatedContract.billingPeriod.renewalDays).toBe(30);
    });
  });

  describe('DELETE /contracts', function () {
    it('Should return 204 and delete all contracts', async function () {
      const servicesBefore = await getAllContracts(app);
      expect(servicesBefore.length).toBeGreaterThan(0);

      await request(app).delete(`${baseUrl}/contracts`).set('x-api-key', adminApiKey).expect(204);

      const servicesAfter = await getAllContracts(app);
      expect(servicesAfter.length).toBe(0);
    });
  });
});
