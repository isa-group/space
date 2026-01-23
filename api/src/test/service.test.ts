import request from 'supertest';
import { baseUrl, getApp, shutdownApp } from './utils/testApp';
import { Server } from 'http';
import { describe, it, expect, beforeAll, afterAll, afterEach, beforeEach } from 'vitest';
import {
  archivePricingFromService,
  createRandomService,
  createTestService,
  deletePricingFromService,
  deleteTestService,
  getRandomPricingFile,
  getService,
} from './utils/services/serviceTestUtils';
import { zoomPricingPath } from './utils/services/ServiceTestData';
import { retrievePricingFromPath } from 'pricing4ts/server';
import { ExpectedPricingType, LeanUsageLimit } from '../main/types/models/Pricing';
import { TestContract } from './types/models/Contract';
import { createRandomContract, createRandomContractsForService } from './utils/contracts/contracts';
import { isSubscriptionValid } from '../main/controllers/validation/ContractValidation';
import { generatePricingFile } from './utils/services/pricingTestUtils';
import { createTestUser, deleteTestUser } from './utils/users/userTestUtils';
import { LeanService } from '../main/types/models/Service';
import { LeanOrganization } from '../main/types/models/Organization';
import { LeanUser } from '../main/types/models/User';
import { addApiKeyToOrganization, createTestOrganization, deleteTestOrganization } from './utils/organization/organizationTestUtils';
import { generateOrganizationApiKey } from '../main/utils/users/helpers';

describe('Services API Test Suite', function () {
  let app: Server;
  let adminUser: LeanUser;
  let ownerUser: LeanUser;
  let testService: LeanService;
  let testOrganization: LeanOrganization;
  let testApiKey: string;

  beforeAll(async function () {
    app = await getApp();
  });

  beforeEach(async function () {
    adminUser = await createTestUser('ADMIN');
    ownerUser = await createTestUser('USER');
    testOrganization = await createTestOrganization(ownerUser.username);
    testService = await createTestService(testOrganization.id);
    
    testApiKey = generateOrganizationApiKey();
    
    await addApiKeyToOrganization(testOrganization.id!, {key: testApiKey, scope: 'ALL'})

  });

  afterEach(async function () {
    if (testService.id){
      await deleteTestService(testService.id);
    }
    if (testOrganization.id){
      await deleteTestOrganization(testOrganization.id);
    }
    if (adminUser.id){
      await deleteTestUser(adminUser.id);
    }
    if (ownerUser.id){
      await deleteTestUser(ownerUser.id);
    }
  });

  afterAll(async function () {
    await shutdownApp();
  });

  describe('GET /services', function () {
    it('Should return 200 and the services', async function () {
      const response = await request(app).get(`${baseUrl}/services`).set('x-api-key', testApiKey);
      expect(response.status).toEqual(200);
      expect(response.body).toBeDefined();
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
    });
  });

  describe('POST /services', function () {
    it('Should return 201 and the created service: Given Pricing2Yaml file in the request', async function () {
      const pricingFilePath = await getRandomPricingFile(new Date().getTime().toString());
      const response = await request(app)
        .post(`${baseUrl}/services`)
        .set('x-api-key', testApiKey)
        .attach('pricing', pricingFilePath);
      expect(response.status).toEqual(201);
      expect(response.body).toBeDefined();
      expect(Object.keys(response.body.activePricings).length).greaterThan(0);
      expect((Object.values(response.body.activePricings)[0] as any).id).toBeDefined();
      expect((Object.values(response.body.activePricings)[0] as any).url).toBeUndefined();
      expect(response.body.archivedPricings).toBeUndefined();
    });

    it('Should return 201 and the created service: Given url in the request', async function () {
      const response = await request(app)
        .post(`${baseUrl}/services`)
        .set('x-api-key', testApiKey)
        .send({
          pricing:
            'https://sphere.score.us.es/static/collections/63f74bf8eeed64058364b52e/IEEE TSC 2025/notion/2025.yml',
        });
      expect(response.status).toEqual(201);
      expect(response.body).toBeDefined();
      expect(Object.keys(response.body.activePricings).length).greaterThan(0);
      expect((Object.values(response.body.activePricings)[0] as any).id).toBeUndefined();
      expect((Object.values(response.body.activePricings)[0] as any).url).toBeDefined();
      expect(response.body.archivedPricings).toBeUndefined();
    });

    it('Should return 4XX when creating a service with the same name as an existing one', async function () {
      // create initial service
      const pricingFilePath = await getRandomPricingFile(new Date().getTime().toString());
      const first = await request(app)
        .post(`${baseUrl}/services`)
        .set('x-api-key', testApiKey)
        .attach('pricing', pricingFilePath);

      expect(first.status).toEqual(201);

      // attempt to create another service with the same pricing (and thus same saasName)
      const second = await request(app)
        .post(`${baseUrl}/services`)
        .set('x-api-key', testApiKey)
        .attach('pricing', pricingFilePath);

      // It must be a 4xx error (client error), not 5xx
      expect(second.status).toBeGreaterThanOrEqual(400);
      expect(second.status).toBeLessThan(500);

      expect(second.body).toBeDefined();
      expect(second.body.error).toBeDefined();
      const errMsg = String(second.body.error).toLowerCase();
      expect(errMsg.length).toBeGreaterThan(0);
      // Error message should mention existence/duplication
      expect(['exists', 'already', 'duplicate'].some(k => errMsg.includes(k))).toBeTruthy();
    });
  });

  describe('GET /services/{serviceName}', function () {
    it('Should return 200: Given existent service name in lower case', async function () {
      const response = await request(app)
        .get(`${baseUrl}/services/${testService.name.toLowerCase()}`)
        .set('x-api-key', testApiKey);
      expect(response.status).toEqual(200);
      expect(Array.isArray(response.body)).toBe(false);
      expect(response.body.name.toLowerCase()).toBe(testService.name.toLowerCase());
    });

    it('Should return 200: Given existent service name in upper case', async function () {
      const response = await request(app)
        .get(`${baseUrl}/services/${testService.name.toUpperCase()}`)
        .set('x-api-key', testApiKey);
      expect(response.status).toEqual(200);
      expect(Array.isArray(response.body)).toBe(false);
      expect(response.body.name.toLowerCase()).toBe(testService.name.toLowerCase());
    });

    it('Should return 404 due to service not found', async function () {
      const response = await request(app)
        .get(`${baseUrl}/services/unexistent-service`)
        .set('x-api-key', testApiKey);
      expect(response.status).toEqual(404);
      expect(response.body.error).toBe('Service unexistent-service not found');
    });
  });

  describe('PUT /services/{serviceName}', function () {
    afterEach(async function () {
      await request(app)
        .put(`${baseUrl}/services/${testService.name.toLowerCase()}`)
        .set('x-api-key', testApiKey)
        .send({ name: testService });
    });

    it('Should return 200 and the updated service', async function () {
      const newName = 'new name for service';

      const serviceBeforeUpdate = await getService(testOrganization.id!, testService.name, app);
      expect(serviceBeforeUpdate.name.toLowerCase()).toBe(testService.name.toLowerCase());
      const responseUpdate = await request(app)
        .put(`${baseUrl}/services/${testService.name.toLowerCase()}`)
        .set('x-api-key', testApiKey)
        .send({ name: newName });
      expect(responseUpdate.status).toEqual(200);
      expect(responseUpdate.body).toBeDefined();
      expect(responseUpdate.body.name).toEqual(newName);

      await request(app)
        .put(`${baseUrl}/services/${responseUpdate.body.name.toLowerCase()}`)
        .set('x-api-key', testApiKey)
        .send({ name: testService.name });

      const serviceAfterUpdate = await getService(testOrganization.id!, testService.name, app);
      expect(serviceAfterUpdate.name.toLowerCase()).toBe(testService.name.toLowerCase());
    });
    
    it('Should return 200 and change service organization', async function () {
      const newOrganization =  await createTestOrganization(ownerUser.username);

      const serviceBeforeUpdate = await getService(testOrganization.id!, testService.name, app);
      expect(serviceBeforeUpdate.name.toLowerCase()).toBe(testService.name.toLowerCase());
      const responseUpdate = await request(app)
        .put(`${baseUrl}/services/${testService.name.toLowerCase()}`)
        .set('x-api-key', testApiKey)
        .send({ organizationId: newOrganization.id });
      
        expect(responseUpdate.status).toEqual(200);
      expect(responseUpdate.body).toBeDefined();
      expect(responseUpdate.body.organizationId).toEqual(newOrganization.id);
    });
  });

  describe('DELETE /services/{serviceName}', function () {
    it('Should return 204', async function () {
      const newContract = await createRandomContract();
      const serviceName = Object.keys(newContract.contractedServices)[0];

      const responseBefore = await request(app)
        .get(`${baseUrl}/services/${serviceName}`)
        .set('x-api-key', testApiKey);
      expect(responseBefore.status).toEqual(200);
      expect(responseBefore.body.name.toLowerCase()).toBe(serviceName.toLowerCase());

      const responseDelete = await request(app)
        .delete(`${baseUrl}/services/${serviceName}`)
        .set('x-api-key', testApiKey);
      expect(responseDelete.status).toEqual(204);

      const responseAfter = await request(app)
        .get(`${baseUrl}/services/${serviceName}`)
        .set('x-api-key', testApiKey);
      expect(responseAfter.status).toEqual(404);

      const contractsAfter = await request(app)
        .get(`${baseUrl}/contracts`)
        .set('x-api-key', testApiKey)
        .send({ filters: { services: [serviceName] } });
      expect(contractsAfter.status).toEqual(200);
      expect(Array.isArray(contractsAfter.body)).toBe(true);
      expect(
        contractsAfter.body.every(
          (c: TestContract) => new Date() > c.billingPeriod.endDate && !c.billingPeriod.autoRenew
        )
      ).toBeTruthy();
    });
  });

  describe('GET /services/{serviceName}/pricings', function () {
    it('Should return 200: Given existent service name in lower case', async function () {
      const response = await request(app)
        .get(`${baseUrl}/services/${testService.name.toLowerCase()}/pricings`)
        .set('x-api-key', testApiKey);
      expect(response.status).toEqual(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].features).toBeDefined();
      expect(Object.keys(response.body[0].features).length).toBeGreaterThan(0);
      expect(response.body[0].usageLimits).toBeDefined();
      expect(response.body[0].plans).toBeDefined();
      expect(response.body[0].addOns).toBeDefined();

      const service = await getService(testOrganization.id!, testService.name, app);
      expect(service.name.toLowerCase()).toBe(testService.name.toLowerCase());
      expect(response.body.map((p: ExpectedPricingType) => p.version).sort()).toEqual(
        Object.keys(service.activePricings).sort()
      );
    });

    it('Should return 200: Given existent service name in lower case and "archived" in query', async function () {
      const response = await request(app)
        .get(`${baseUrl}/services/${testService.name.toLowerCase()}/pricings?pricingStatus=archived`)
        .set('x-api-key', testApiKey);
      expect(response.status).toEqual(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].features).toBeDefined();
      expect(Object.keys(response.body[0].features).length).toBeGreaterThan(0);
      expect(response.body[0].usageLimits).toBeDefined();
      expect(response.body[0].plans).toBeDefined();
      expect(response.body[0].addOns).toBeDefined();

      const service = await getService(testOrganization.id!, testService.name, app);
      expect(service.name.toLowerCase()).toBe(testService.name.toLowerCase());
      expect(response.body.map((p: ExpectedPricingType) => p.version).sort()).toEqual(
        Object.keys(service.archivedPricings).sort()
      );
    });

    it('Should return 200: Given existent service name in upper case', async function () {
      const response = await request(app)
        .get(`${baseUrl}/services/${testService.name.toUpperCase()}/pricings`)
        .set('x-api-key', testApiKey);
      expect(response.status).toEqual(200);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBeGreaterThan(0);
      expect(response.body[0].features).toBeDefined();
      expect(Object.keys(response.body[0].features).length).toBeGreaterThan(0);
      expect(response.body[0].usageLimits).toBeDefined();
      expect(response.body[0].plans).toBeDefined();
      expect(response.body[0].addOns).toBeDefined();
    });

    it('Should return 404 due to service not found', async function () {
      const response = await request(app)
        .get(`${baseUrl}/services/unexistent-service/pricings`)
        .set('x-api-key', testApiKey);
      expect(response.status).toEqual(404);
      expect(response.body.error).toBe('Service unexistent-service not found');
    });
  });

  describe('POST /services/{serviceName}/pricings', function () {
    let versionToAdd = '2025';
    let skipAfterEach = false;

    afterEach(async function () {
      if (skipAfterEach) {
        skipAfterEach = false;
        return;
      }

      await archivePricingFromService(testOrganization.id!, testService.name, versionToAdd, app);
      await deletePricingFromService(testOrganization.id!, testService.name, versionToAdd, app);
    });

    it('Should return 200', async function () {
      const serviceBefore = await getService(testOrganization.id!, testService.name, app);
      expect(serviceBefore.activePricings).toBeDefined();

      const previousActivePricingsAmount = Object.keys(serviceBefore.activePricings).length;

      const newPricingVersion = zoomPricingPath;
      versionToAdd = '2025';

      const response = await request(app)
        .post(`${baseUrl}/services/${testService.name}/pricings`)
        .set('x-api-key', testApiKey)
        .attach('pricing', newPricingVersion);
      expect(response.status).toEqual(201);
      expect(serviceBefore.activePricings).toBeDefined();
      const newActivePricingsAmount = Object.keys(response.body.activePricings).length;
      expect(newActivePricingsAmount).toBeGreaterThan(previousActivePricingsAmount);

      // Check if the new pricing is the latest in activePricings
      const parsedPricing = retrievePricingFromPath(newPricingVersion);
      expect(
        Object.keys(response.body.activePricings).includes(parsedPricing.version)
      ).toBeTruthy();
    });

    it('Should return 200 even though the service has no archived pricings', async function () {
      const newService = await createRandomService(app);
      const newPricing = await generatePricingFile(newService.name);
      skipAfterEach = true;

      const response = await request(app)
        .post(`${baseUrl}/services/${newService.name}/pricings`)
        .set('x-api-key', testApiKey)
        .attach('pricing', newPricing);
      expect(response.status).toEqual(201);
      expect(newService.activePricings).toBeDefined();
      const newActivePricingsAmount = Object.keys(response.body.activePricings).length;
      expect(newActivePricingsAmount).toBeGreaterThan(
        Object.keys(newService.activePricings).length
      );
    });

    it('Should return 200 given a pricing with a link', async function () {
      const serviceBefore = await getService(testOrganization.id!, testService.name, app);
      expect(serviceBefore.activePricings).toBeDefined();

      const previousActivePricingsAmount = Object.keys(serviceBefore.activePricings).length;

      versionToAdd = '2019';

      const response = await request(app)
        .post(`${baseUrl}/services/${testService}/pricings`)
        .set('x-api-key', testApiKey)
        .send({
          pricing:
            'https://sphere.score.us.es/static/collections/63f74bf8eeed64058364b52e/IEEE TSC 2025/zoom/2019.yml',
        });

      expect(response.status).toEqual(201);
      expect(serviceBefore.activePricings).toBeDefined();
      expect(Object.keys(response.body.activePricings).length).toBeGreaterThan(
        previousActivePricingsAmount
      );
    });

    it('Should return 400 given a pricing with a link that do not coincide in saasName', async function () {
      const serviceBefore = await getService(testOrganization.id!, testService.name, app);
      expect(serviceBefore.activePricings).toBeDefined();

      skipAfterEach = true;

      const response = await request(app)
        .post(`${baseUrl}/services/${testService}/pricings`)
        .set('x-api-key', testApiKey)
        .send({
          pricing:
            'https://sphere.score.us.es/static/collections/63f74bf8eeed64058364b52e/IEEE TSC 2025/zoom/2025.yml',
        });

      expect(response.status).toEqual(400);
      expect(response.body.error).toBe(
        'Invalid request: The service name in the pricing file (Zoom - One) does not match the service name in the URL (Zoom)'
      );
    });
  });

  describe('GET /services/{serviceName}/pricings/{pricingVersion}', function () {
    it('Should return 200: Given existent service name and pricing version', async function () {
      const response = await request(app)
        .get(`${baseUrl}/services/${testService}/pricings/2.0.0`)
        .set('x-api-key', testApiKey);
      expect(response.status).toEqual(200);
      expect(response.body.features).toBeDefined();
      expect(Object.keys(response.body.features).length).toBeGreaterThan(0);
      expect(response.body.usageLimits).toBeDefined();
      expect(response.body.plans).toBeDefined();
      expect(response.body.addOns).toBeDefined();
      expect(response.body.id).toBeUndefined();
      expect(response.body._serviceName).toBeUndefined();
      expect(response.body._id).toBeUndefined();
    });

    it('Should return 200: Given existent service name in upper case and pricing version', async function () {
      const response = await request(app)
        .get(`${baseUrl}/services/${testService}/pricings/2.0.0`)
        .set('x-api-key', testApiKey);
      expect(response.status).toEqual(200);
      expect(response.body.features).toBeDefined();
      expect(Object.keys(response.body.features).length).toBeGreaterThan(0);
      expect(response.body.usageLimits).toBeDefined();
      expect(response.body.plans).toBeDefined();
      expect(response.body.addOns).toBeDefined();
      expect(response.body.id).toBeUndefined();
      expect(response.body._serviceName).toBeUndefined();
      expect(response.body._id).toBeUndefined();
    });

    it('Should return 404 due to service not found', async function () {
      const response = await request(app)
        .get(`${baseUrl}/services/unexistent-service/pricings/2.0.0`)
        .set('x-api-key', testApiKey);
      expect(response.status).toEqual(404);
      expect(response.body.error).toBe('Service unexistent-service not found');
    });

    it('Should return 404 due to pricing not found', async function () {
      const response = await request(app)
        .get(`${baseUrl}/services/${testService}/pricings/unexistent-version`)
        .set('x-api-key', testApiKey);
      expect(response.status).toEqual(404);
      expect(response.body.error).toBe(
        `Pricing version unexistent-version not found for service ${testService}`
      );
    });
  });

  describe('PUT /services/{serviceName}/pricings/{pricingVersion}', function () {
    const versionToArchive = '2.0.0';

    afterEach(async function () {
      await request(app)
        .put(`${baseUrl}/services/${testService}/pricings/${versionToArchive}?availability=active`)
        .set('x-api-key', testApiKey);
    });

    it('Should return 200: Changing visibility using default value', async function () {
      const responseBefore = await request(app)
        .get(`${baseUrl}/services/${testService}`)
        .set('x-api-key', testApiKey);
      expect(responseBefore.status).toEqual(200);
      expect(responseBefore.body.activePricings).toBeDefined();
      expect(
        Object.keys(responseBefore.body.activePricings).includes(versionToArchive)
      ).toBeTruthy();
      expect(
        Object.keys(responseBefore.body.archivedPricings).includes(versionToArchive)
      ).toBeFalsy();

      const responseUpdate = await request(app)
        .put(`${baseUrl}/services/${testService}/pricings/${versionToArchive}`)
        .set('x-api-key', testApiKey)
        .send({
          subscriptionPlan: 'PRO',
          subscriptionAddOns: {
            largeMeetings: 1,
          },
        });
      expect(responseUpdate.status).toEqual(200);
      expect(responseUpdate.body.activePricings).toBeDefined();
      expect(
        Object.keys(responseUpdate.body.activePricings).includes(versionToArchive)
      ).toBeFalsy();
      expect(
        Object.keys(responseUpdate.body.archivedPricings).includes(versionToArchive)
      ).toBeTruthy();
    });

    it('Should return 200: Changing visibility using "archived"', async function () {
      const responseBefore = await request(app)
        .get(`${baseUrl}/services/${testService}`)
        .set('x-api-key', testApiKey);
      expect(responseBefore.status).toEqual(200);
      expect(responseBefore.body.activePricings).toBeDefined();
      expect(
        Object.keys(responseBefore.body.activePricings).includes(versionToArchive)
      ).toBeTruthy();
      expect(
        Object.keys(responseBefore.body.archivedPricings).includes(versionToArchive)
      ).toBeFalsy();

      const responseUpdate = await request(app)
        .put(
          `${baseUrl}/services/${testService}/pricings/${versionToArchive}?availability=archived`
        )
        .set('x-api-key', testApiKey)
        .send({
          subscriptionPlan: 'PRO',
          subscriptionAddOns: {
            largeMeetings: 1,
          },
        });
      expect(responseUpdate.status).toEqual(200);
      expect(responseUpdate.body.activePricings).toBeDefined();
      expect(
        Object.keys(responseUpdate.body.activePricings).includes(versionToArchive)
      ).toBeFalsy();
      expect(
        Object.keys(responseUpdate.body.archivedPricings).includes(versionToArchive)
      ).toBeTruthy();
    });

    it('Should return 200: Changing visibility using "active"', async function () {
      const responseBefore = await request(app)
        .put(`${baseUrl}/services/${testService}/pricings/${versionToArchive}`)
        .set('x-api-key', testApiKey)
        .send({
          subscriptionPlan: 'PRO',
          subscriptionAddOns: {
            largeMeetings: 1,
          },
        });
      expect(responseBefore.status).toEqual(200);
      expect(responseBefore.body.activePricings).toBeDefined();
      expect(
        Object.keys(responseBefore.body.activePricings).includes(versionToArchive)
      ).toBeFalsy();
      expect(
        Object.keys(responseBefore.body.archivedPricings).includes(versionToArchive)
      ).toBeTruthy();

      const responseUpdate = await request(app)
        .put(`${baseUrl}/services/${testService}/pricings/${versionToArchive}?availability=active`)
        .set('x-api-key', testApiKey);
      expect(responseUpdate.status).toEqual(200);
      expect(responseUpdate.body.activePricings).toBeDefined();
      expect(
        Object.keys(responseUpdate.body.activePricings).includes(versionToArchive)
      ).toBeTruthy();
      expect(
        Object.keys(responseUpdate.body.archivedPricings).includes(versionToArchive)
      ).toBeFalsy();
    });

    it(
      'Should return 200 and novate all contracts: Changing visibility using "archived"',
      async function () {
        await createRandomContractsForService(testOrganization.id!, testService.name, versionToArchive, 5, app);

        const responseUpdate = await request(app)
          .put(
            `${baseUrl}/services/${testService}/pricings/${versionToArchive}?availability=archived`
          )
          .set('x-api-key', testApiKey)
          .send({
            subscriptionPlan: 'PRO',
            subscriptionAddOns: {
              largeMeetings: 1,
            },
          });
        expect(responseUpdate.status).toEqual(200);
        expect(responseUpdate.body.activePricings).toBeDefined();
        expect(
          Object.keys(responseUpdate.body.activePricings).includes(versionToArchive)
        ).toBeFalsy();
        expect(
          Object.keys(responseUpdate.body.archivedPricings).includes(versionToArchive)
        ).toBeTruthy();

        const reponseContractsAfter = await request(app)
          .get(`${baseUrl}/contracts`)
          .set('x-api-key', testApiKey)
          .send({ filters: { services: [testService] } });

        expect(reponseContractsAfter.status).toEqual(200);
        expect(Array.isArray(reponseContractsAfter.body)).toBe(true);

        for (const contract of reponseContractsAfter.body) {
          expect(contract.contractedServices[testService.name.toLowerCase()]).toBeDefined();
          expect(contract.contractedServices[testService.name.toLowerCase()]).not.toEqual(
            versionToArchive
          );

          // Alternative approach with try/catch
          try {
            await isSubscriptionValid({
              contractedServices: contract.contractedServices,
              subscriptionPlans: contract.subscriptionPlans,
              subscriptionAddOns: contract.subscriptionAddOns,
            });
          } catch (error) {
            expect.fail(`Contract subscription validation failed: ${(error as Error).message}`);
          }
        }
      },
      { timeout: 10000 }
    );

    it('Should return 400: Changing visibility using "invalidValue"', async function () {
      const responseUpdate = await request(app)
        .put(
          `${baseUrl}/services/${testService}/pricings/${versionToArchive}?availability=invalidValue`
        )
        .set('x-api-key', testApiKey);
      expect(responseUpdate.status).toEqual(400);
      expect(responseUpdate.body.error).toBe(
        'Invalid availability status. Either provide "active" or "archived"'
      );
    });

    it('Should return 400: Changing visibility to archived when is the last activePricing', async function () {
      await request(app)
        .put(`${baseUrl}/services/${testService}/pricings/${versionToArchive}`)
        .set('x-api-key', testApiKey)
        .send({
          subscriptionPlan: 'PRO',
          subscriptionAddOns: {
            largeMeetings: 1,
          },
        })
        .expect(200);

      const lastVersionToArchive = '2023';

      const responseUpdate = await request(app)
        .put(`${baseUrl}/services/${testService}/pricings/${lastVersionToArchive}`)
        .set('x-api-key', testApiKey);
      expect(responseUpdate.status).toEqual(400);
      expect(responseUpdate.body.error).toBe(
        `You cannot archive the last active pricing for service ${testService}`
      );
    });
  });

  describe('DELETE /services/{serviceName}/pricings/{pricingVersion}', function () {
    it('Should return 204', async function () {
      const versionToDelete = '2025';

      const responseBefore = await request(app)
        .post(`${baseUrl}/services/${testService}/pricings`)
        .set('x-api-key', testApiKey)
        .attach('pricing', zoomPricingPath);
      expect(responseBefore.status).toEqual(201);
      expect(responseBefore.body.activePricings).toBeDefined();
      expect(
        Object.keys(responseBefore.body.activePricings).includes(versionToDelete)
      ).toBeTruthy();

      // Necesary to delete
      await archivePricingFromService(testOrganization.id!, testService.name, versionToDelete, app);

      const responseDelete = await request(app)
        .delete(`${baseUrl}/services/${testService}/pricings/${versionToDelete}`)
        .set('x-api-key', testApiKey);
      expect(responseDelete.status).toEqual(204);

      const responseAfter = await request(app)
        .get(`${baseUrl}/services/${testService}`)
        .set('x-api-key', testApiKey);
      expect(responseAfter.status).toEqual(200);
      expect(responseAfter.body.activePricings).toBeDefined();
      expect(Object.keys(responseAfter.body.activePricings).includes(versionToDelete)).toBeFalsy();
    });

    it('Should return 204 with semver pricing version', async function () {
      const versionToDelete = '2.0.0';

      const responseBefore = await request(app)
        .post(`${baseUrl}/services/${testService}/pricings`)
        .set('x-api-key', testApiKey)
        .attach('pricing', zoomPricingPath);
      expect(responseBefore.status).toEqual(201);
      expect(responseBefore.body.activePricings).toBeDefined();
      expect(
        Object.keys(responseBefore.body.activePricings).includes(versionToDelete)
      ).toBeTruthy();

      // Necesary to delete
      await archivePricingFromService(testOrganization.id!, testService.name, versionToDelete, app);

      const responseDelete = await request(app)
        .delete(`${baseUrl}/services/${testService}/pricings/${versionToDelete}`)
        .set('x-api-key', testApiKey);
      expect(responseDelete.status).toEqual(204);

      const responseAfter = await request(app)
        .get(`${baseUrl}/services/${testService}`)
        .set('x-api-key', testApiKey);
      expect(responseAfter.status).toEqual(200);
      expect(responseAfter.body.activePricings).toBeDefined();
      expect(Object.keys(responseAfter.body.activePricings).includes(versionToDelete)).toBeFalsy();
    });

    it('Should return 404 since pricing to delete has not been archived before deleting', async function () {
      const versionToDelete = '2025';

      const responseBefore = await request(app)
        .post(`${baseUrl}/services/${testService}/pricings`)
        .set('x-api-key', testApiKey)
        .attach('pricing', zoomPricingPath);
      if (responseBefore.status === 400) {
        expect(responseBefore.body.error).toContain('exists');
      } else {
        expect(responseBefore.status).toEqual(201);
        expect(responseBefore.body.activePricings).toBeDefined();
        expect(
          Object.keys(responseBefore.body.activePricings).includes(versionToDelete)
        ).toBeTruthy();
      }

      const responseDelete = await request(app)
        .delete(`${baseUrl}/services/${testService}/pricings/${versionToDelete}`)
        .set('x-api-key', testApiKey);

      expect(responseDelete.status).toEqual(403);
      expect(responseDelete.body.error).toBe(
        `Forbidden: You cannot delete an active pricing version ${versionToDelete} for service ${testService}. Please archive it first.`
      );

      // Necesary to delete
      await archivePricingFromService(testOrganization.id!, testService.name, versionToDelete, app);
      await request(app)
        .delete(`${baseUrl}/services/${testService}/pricings/${versionToDelete}`)
        .set('x-api-key', testApiKey)
        .expect(204);
    });

    it('Should return 404: Given an invalid pricing version', async function () {
      const versionToDelete = 'invalid';

      const responseDelete = await request(app)
        .delete(`${baseUrl}/services/${testService}/pricings/${versionToDelete}`)
        .set('x-api-key', testApiKey);
      expect(responseDelete.status).toEqual(404);
      expect(responseDelete.body.error).toBe(
        `Invalid request: No archived version ${versionToDelete} found for service ${testService}. Remember that a pricing must be archived before it can be deleted.`
      );
    });
  });

  describe('DELETE /services', function () {
    it('Should return 200', async function () {
      // Checks if there are services to delete
      const responseIndexBeforeDelete = await request(app)
        .get(`${baseUrl}/services`)
        .set('x-api-key', testApiKey);

      expect(responseIndexBeforeDelete.status).toEqual(200);
      expect(Array.isArray(responseIndexBeforeDelete.body)).toBe(true);
      expect(responseIndexBeforeDelete.body.length).greaterThan(0);

      // Deletes all services
      const responseDelete = await request(app)
        .delete(`${baseUrl}/services`)
        .set('x-api-key', testApiKey);
      expect(responseDelete.status).toEqual(200);

      // Checks if there are no services after delete
      const responseIndexAfterDelete = await request(app)
        .get(`${baseUrl}/services`)
        .set('x-api-key', testApiKey);

      expect(responseIndexAfterDelete.status).toEqual(200);
      expect(Array.isArray(responseIndexAfterDelete.body)).toBe(true);
      expect(responseIndexAfterDelete.body.length).toBe(0);
    });
  });
});
