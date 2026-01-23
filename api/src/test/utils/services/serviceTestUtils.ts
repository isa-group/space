import fs from 'fs';
import request from 'supertest';
import { baseUrl, getApp, useApp } from '../testApp';
import { clockifyPricingPath, githubPricingPath, zoomPricingPath } from './ServiceTestData';
import { generatePricingFile } from './pricingTestUtils';
import { v4 as uuidv4 } from 'uuid';
import { TestService } from '../../types/models/Service';
import { TestPricing } from '../../types/models/Pricing';
import { getTestAdminApiKey } from '../auth';
import { createTestOrganization } from '../organization/organizationTestUtils';
import ServiceMongoose from '../../../main/repositories/mongoose/models/ServiceMongoose';
import PricingMongoose from '../../../main/repositories/mongoose/models/PricingMongoose';
import { LeanService } from '../../../main/types/models/Service';
import container from '../../../main/config/container';
import { createTestUser } from '../users/userTestUtils';
import { LeanUser } from '../../../main/types/models/User';

function getRandomPricingFile(name?: string) {
  return generatePricingFile(name);
}

async function createTestService(organizationId?: string, serviceName?: string): Promise<LeanService> {

  if (!serviceName){
    serviceName = `test-service-${Date.now()}`;
  }

  if (!organizationId){
    const testOrganization = await createTestOrganization();
    organizationId = testOrganization.id!;
  }

  const enabledPricingPath = await generatePricingFile(serviceName);
  const serviceService = container.resolve('serviceService');

  const service = await serviceService.create({path: enabledPricingPath}, "file", organizationId);
  
  return service as unknown as LeanService;
}

async function addPricingToService(organizationId?: string, serviceName?: string): Promise<string> {
  const pricingPath = await generatePricingFile(serviceName);
  const serviceService = container.resolve('serviceService');
  await serviceService.addPricingToService(serviceName!, {path: pricingPath}, "file", organizationId!);
  
  return pricingPath.split('/').pop()!.replace('.yaml', '');
}

async function deleteTestService(serviceId: string): Promise<void> {
  const serviceService = container.resolve('serviceService');
  await serviceService.delete(serviceId);
}

async function getAllServices(app?: any): Promise<TestService[]> {
  let appCopy = app;

  if (!app) {
    appCopy = getApp();
  }

  const apiKey = await getTestAdminApiKey();
  const services = await request(appCopy).get(`${baseUrl}/services`).set('x-api-key', apiKey);

  return services.body;
}

async function getPricingFromService(
  serviceName: string,
  pricingVersion: string,
  app?: any
): Promise<TestPricing> {
  let appCopy = app;

  if (!app) {
    appCopy = getApp();
  }

  const apiKey = await getTestAdminApiKey();
  const pricing = await request(appCopy)
    .get(`${baseUrl}/services/${serviceName}/pricings/${pricingVersion}`)
    .set('x-api-key', apiKey);

  return pricing.body;
}

async function getRandomService(app?: any): Promise<TestService> {
  let appCopy = app;

  if (!app) {
    appCopy = await getApp();
  }

  const apiKey = await getTestAdminApiKey();
  const response = await request(appCopy).get(`${baseUrl}/services`).set('x-api-key', apiKey);

  if (response.status !== 200) {
    throw new Error(`Failed to get services data: ${response.text}`);
  }

  const services = response.body;

  if (!services || services.length === 0) {
    throw new Error('No services found');
  }

  const randomIndex = Math.floor(Math.random() * services.length);
  const randomService = services[randomIndex];

  if (!randomService) {
    throw new Error('Random service not found');
  }

  return randomService;
}

async function getService(organizationId: string, serviceName: string, app?: any): Promise<TestService> {
  let appCopy = app;

  if (!app) {
    appCopy = await getApp();
  }

  const adminUser: LeanUser = await createTestUser('ADMIN');
  const apiKey = adminUser.apiKey;
  const response = await request(appCopy)
    .get(`${baseUrl}/organizations/${organizationId}/services/${serviceName}`)
    .set('x-api-key', apiKey);

  if (response.status !== 200) {
    throw new Error(`Failed to get service data: ${response.text}`);
  }

  const service = response.body;

  if (!service) {
    throw new Error(`Service not found: ${serviceName}`);
  }

  return service;
}

/**
 * Asynchronously creates a service by sending a POST request to the `${baseUrl}/services` endpoint
 * with a pricing file attached. The pricing file path is determined based on the provided
 * service name.
 *
 * @param testService - The name of the service to create. Supported values are:
 *   - `'github'`: Uses the `githubPricingPath` file.
 *   - `'zoom'`: Uses the `zoomPricingPath` file.
 *   - `'clockify'`: Uses the `clockifyPricingPath` file.
 *   - If the service name does not match any of the above, the default is `clockifyPricingPath`.
 *
 * @returns A promise that resolves to the created service object if the request is successful.
 *
 * @throws An error if:
 *   - The pricing file does not exist at the determined path.
 *   - The service creation request fails (response status is not 201).
 */
async function createService(testService?: string) {
  let pricingFilePath;

  switch ((testService ?? '').toLowerCase()) {
    case 'github':
      pricingFilePath = githubPricingPath;
      break;
    case 'zoom':
      pricingFilePath = zoomPricingPath;
      break;
    case 'clockify':
      pricingFilePath = clockifyPricingPath;
      break;
    default:
      pricingFilePath = clockifyPricingPath;
  }

  if (fs.existsSync(pricingFilePath)) {
    const app = await getApp();
    const apiKey = await getTestAdminApiKey();

    const response = await request(app)
      .post(`${baseUrl}/services`)
      .set('x-api-key', apiKey)
      .attach('pricing', pricingFilePath);

    if (response.status !== 201) {
      throw new Error(`Failed to create service: ${response.text}`);
    }
    const service = response.body;

    return service;
  } else {
    throw new Error(`File not found at ${pricingFilePath}`);
  }
}

async function createRandomService(app?: any) {
  let appCopy = app;

  if (!app) {
    appCopy = await getApp();
  }

  const pricingFilePath = await generatePricingFile(
    uuidv4()
  );

  const apiKey = await getTestAdminApiKey();
  const response = await request(appCopy)
    .post(`${baseUrl}/services`)
    .set('x-api-key', apiKey)
    .attach('pricing', pricingFilePath);

  if (response.status !== 201) {
    throw new Error(`Failed to create service: ${response.text}`);
  }
  const service = response.body;

  return service;
}

async function archivePricingFromService(
  organizationId: string,
  serviceName: string,
  pricingVersion: string,
  app?: any
) {
  let appCopy = await useApp(app);

  const apiKey = await getTestAdminApiKey();
  const response = await request(appCopy)
    .put(`${baseUrl}/organizations/${organizationId}/services/${serviceName}/pricings/${pricingVersion}?availability=archived`)
    .set('x-api-key', apiKey)
    .send({
      subscriptionPlan: "BASIC"
    });

  if (response.status !== 200) {
    throw new Error(`Failed to archive pricing: ${response.text}`);
  }
  const pricing = response.body;
  if (!pricing) {
    throw new Error(`Pricing not found: ${pricingVersion}`);
  }
  return pricing;
}

async function deletePricingFromService(
  organizationId: string,
  serviceName: string,
  pricingVersion: string,
  app?: any
): Promise<void> {
  let appCopy = app;

  if (!app) {
    appCopy = await getApp();
  }

  const apiKey = await getTestAdminApiKey();
  const response = await request(appCopy)
    .delete(`${baseUrl}/organizations/${organizationId}/services/${serviceName}/pricings/${pricingVersion}`)
    .set('x-api-key', apiKey);

  if (response.status !== 204 && response.status !== 404) {
    throw new Error(`Failed to delete pricing: ${response.text}`);
  }
}

export {
  addPricingToService,
  getAllServices,
  getRandomPricingFile,
  getService,
  getPricingFromService,
  getRandomService,
  createService,
  createTestService,
  createRandomService,
  archivePricingFromService,
  deletePricingFromService,
  deleteTestService,
};
