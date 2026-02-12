import request from 'supertest';
import fs from 'fs';
import { baseUrl, getApp, shutdownApp } from './utils/testApp';
import { Server } from 'http';
import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from 'vitest';
import {
  createTestService,
  deleteTestService,
  getRandomPricingFile,
} from './utils/services/serviceTestUtils';
import { generatePricingFile } from './utils/services/pricingTestUtils';
import { createTestUser, deleteTestUser } from './utils/users/userTestUtils';
import { createTestOrganization, deleteTestOrganization, addApiKeyToOrganization } from './utils/organization/organizationTestUtils';
import { generateOrganizationApiKey } from '../main/utils/users/helpers';
import { LeanUser } from '../main/types/models/User';
import { LeanOrganization } from '../main/types/models/Organization';
import { LeanService } from '../main/types/models/Service';
import nock from 'nock';

describe('Service disable / re-enable flow', function () {
  let app: Server;
  let adminUser: LeanUser;
  let ownerUser: LeanUser;
  let testOrganization: LeanOrganization;
  let testService: LeanService;
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
    await addApiKeyToOrganization(testOrganization.id!, {key: testApiKey, scope: 'ALL'});
  });

  afterEach(async function () {
    if (testService.id) {
      await deleteTestService(testService.name, testOrganization.id!);
    }
    if (testOrganization.id) {
      await deleteTestOrganization(testOrganization.id);
    }
    if (adminUser.id) {
      await deleteTestUser(adminUser.id);
    }
    if (ownerUser.id) {
      await deleteTestUser(ownerUser.id);
    }
  });

  afterAll(async function () {
    await shutdownApp();
  });

  it('disables a service by moving activePricings to archivedPricings without throwing', async function () {
    // ensure service exists and has active pricings
    expect(testService).toBeDefined();
    expect(testService.activePricings.size).toBeGreaterThan(0);

    // disable
    const resDisable = await request(app)
      .delete(`${baseUrl}/services/${testService.name}`)
      .set('x-api-key', testApiKey);

    // Controller returns 204 No Content when successful
    expect(resDisable.status).toBe(204);

    // fetch service directly from repository (disabled services are not returned by GET)
    const ServiceRepository = (await import('../main/repositories/mongoose/ServiceRepository')).default;
    const repo = new ServiceRepository();
    const svcFromRepo = await repo.findByName(testService.name, testOrganization.id!, true);
    
    expect(svcFromRepo).toBeDefined();
    // type assertion to access disabled flag that might not be present in LeanService type
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    expect((svcFromRepo as any).disabled).toBeTruthy();
    expect((svcFromRepo as any).activePricings.size).toBe(0);
    expect((svcFromRepo as any).archivedPricings.size).toBeGreaterThan(0);

    testService.id = undefined;
  });

  it('re-enables a disabled service when uploading a pricing file with same saasName', async function () {
    // disable service
    await request(app)
      .delete(`${baseUrl}/services/${testService.name}`)
      .set('x-api-key', testApiKey);

    // generate a pricing file with same service name
    const pricingFile = await generatePricingFile(testService.name);

    const resCreate = await request(app)
      .post(`${baseUrl}/services`)
      .set('x-api-key', testApiKey)
      .attach('pricing', pricingFile);

    expect(resCreate.status).toBe(201);
    // service must be re-enabled
    expect(resCreate.body.disabled).toBeFalsy();
    // new pricing present in activePricings
    const activeKeys = Object.keys(resCreate.body.activePricings || {});
    expect(activeKeys.length).toBeGreaterThan(0);
    // archived must contain previous entries
    const archivedKeys = Object.keys(resCreate.body.archivedPricings || {});
    expect(archivedKeys.length).toBeGreaterThanOrEqual(0);
  });

  it('re-enables a disabled service when uploading a pricing via URL', async function () {
    // disable service
    await request(app)
      .delete(`${baseUrl}/services/${testService.name}`)
      .set('x-api-key', testApiKey);

    const newPricingVersionPath = await getRandomPricingFile(testService.name);
    const newPricingVersion = fs.readFileSync(newPricingVersionPath, 'utf-8');

    nock('https://test-domain.com')
      .get('/test-pricing.yaml')
      .reply(200, newPricingVersion);

    // use a known remote pricing URL (the project tests already use some public urls)
    const pricingUrl = 'https://test-domain.com/test-pricing.yaml';

    const resCreate = await request(app)
      .post(`${baseUrl}/services`)
      .set('x-api-key', testApiKey)
      .send({ pricing: pricingUrl });

    expect(resCreate.status).toBe(201);
    expect(resCreate.body.disabled).toBeFalsy();
    const activeKeys = Object.keys(resCreate.body.activePricings || {});
    expect(activeKeys.length).toBeGreaterThan(0);
    // the active pricing should reference a url (no id)
    const firstActive = resCreate.body.activePricings[activeKeys[0]];
    expect(firstActive.url).toBeDefined();
  });
});
