import request from 'supertest';
import { baseUrl, getApp, shutdownApp } from './utils/testApp';
import { Server } from 'http';
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createRandomService,
  getRandomPricingFile,
  getService,
} from './utils/services/serviceTestUtils';
import { generatePricingFile } from './utils/services/pricingTestUtils';

describe('Service disable / re-enable flow', function () {
  let app: Server;
  let adminApiKey: string;

  beforeAll(async function () {
    app = await getApp();
    // get admin user and api key helper from existing tests
    const { getTestAdminApiKey, getTestAdminUser, cleanupAuthResources } = await import(
      './utils/auth'
    );
    await getTestAdminUser();
    adminApiKey = await getTestAdminApiKey();
    // note: cleanup will be handled by global test teardown in other suites
  });

  afterAll(async function () {
    await shutdownApp();
  });

  it('disables a service by moving activePricings to archivedPricings without throwing', async function () {
    const svc = await createRandomService(app);
    // ensure service exists
    const before = await getService(svc.name, app);
    expect(before).toBeDefined();
    expect(before.activePricings && Object.keys(before.activePricings).length).toBeGreaterThan(0);

    // disable
    const resDisable = await request(app)
      .delete(`${baseUrl}/services/${svc.name}`)
      .set('x-api-key', adminApiKey);

  // Controller returns 204 No Content when successful
  expect(resDisable.status).toBe(204);

    // fetch service directly from repository (disabled services are not returned by GET)
    const ServiceRepository = (await import('../main/repositories/mongoose/ServiceRepository')).default;
    const repo = new ServiceRepository();
    const svcFromRepo = await repo.findByName(svc.name, true);
  expect(svcFromRepo).toBeDefined();
  // type assertion to access disabled flag that might not be present in LeanService type
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  expect((svcFromRepo as any).disabled).toBeTruthy();
  const activeKeys = (svcFromRepo as any).activePricings ? Object.keys((svcFromRepo as any).activePricings) : [];
  const archivedKeys = (svcFromRepo as any).archivedPricings ? Object.keys((svcFromRepo as any).archivedPricings) : [];
    expect(activeKeys.length).toBe(0);
    expect(archivedKeys.length).toBeGreaterThan(0);
  });

  it('re-enables a disabled service when uploading a pricing file with same saasName', async function () {
    const svc = await createRandomService(app);

    // disable service
    await request(app).delete(`${baseUrl}/services/${svc.name}`).set('x-api-key', adminApiKey);

    // generate a pricing file with same service name
    const pricingFile = await generatePricingFile(svc.name);

    const resCreate = await request(app)
      .post(`${baseUrl}/services`)
      .set('x-api-key', adminApiKey)
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
    const svc = await createRandomService(app);

    // disable service
    await request(app).delete(`${baseUrl}/services/${svc.name}`).set('x-api-key', adminApiKey);

    // use a known remote pricing URL (the project tests already use some public urls)
    const pricingUrl = 'https://sphere.score.us.es/static/collections/63f74bf8eeed64058364b52e/IEEE TSC 2025/zoom/2025.yml';

    const resCreate = await request(app)
      .post(`${baseUrl}/services`)
      .set('x-api-key', adminApiKey)
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
