import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { io, Socket } from 'socket.io-client';
import request from 'supertest';
import { baseUrl, getApp, shutdownApp } from './utils/testApp';
import { Server } from 'http';
import { cleanupAuthResources, getTestAdminApiKey, getTestAdminUser } from './utils/auth';
import { addArchivedPricingToService, addPricingToService, createTestService, deleteTestService, getRandomPricingFile } from './utils/services/serviceTestUtils';
import { v4 as uuidv4 } from 'uuid';
import { LeanOrganization } from '../main/types/models/Organization';
import { LeanUser } from '../main/types/models/User';
import { createTestUser, deleteTestUser } from './utils/users/userTestUtils';
import { addApiKeyToOrganization, createTestOrganization, deleteTestOrganization } from './utils/organization/organizationTestUtils';
import { LeanService } from '../main/types/models/Service';
import { generateOrganizationApiKey } from '../main/utils/users/helpers';
import { getFirstPlanFromPricing } from './utils/regex';

// Helper sencillo para esperar mensajes (evita el callback hell)
const waitForPricingEvent = (socket: Socket, eventCode: string) => {
  return new Promise<any>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error(`Timeout waiting for event code: ${eventCode}`));
    }, 4000); // 4s timeout interno

    const listener = (data: any) => {
      if (data && data.code === eventCode) {
        clearTimeout(timeout);
        socket.off('message', listener); // Limpieza importante
        resolve(data);
      }
    };
    
    socket.on('message', listener);
  });
};

describe('Events API Test Suite', function () {
  let app: Server;
  let socketClient: Socket;
  let pricingNamespace: Socket;
  let testOwner: LeanUser;
  let testAdmin: LeanUser;
  let testOrganization: LeanOrganization;
  let testOrgApiKey: string;
  let testService: LeanService;

  beforeAll(async function () {
    app = await getApp();
    socketClient = io(`ws://localhost:3000`, {
      path: '/events',
      autoConnect: false, 
      transports: ['websocket'],
    });
    pricingNamespace = socketClient.io.socket('/pricings');
  });

  beforeEach(async () => {
    // 1. Iniciamos conexión
    pricingNamespace.connect();
    
    // 2. 🛑 ESPERAMOS explícitamente a que conecte antes de soltar el test
    if (!pricingNamespace.connected) {
        await new Promise<void>((resolve, reject) => {
            const timer = setTimeout(() => reject(new Error('Connection timeout')), 1000);
            pricingNamespace.once('connect', () => {
                clearTimeout(timer);
                resolve();
            });
            pricingNamespace.once('connect_error', (err) => {
                clearTimeout(timer);
                reject(err);
            });
        });
    }

    // 3. Crear datos
    testOwner = await createTestUser("USER");
    testAdmin = await createTestUser("ADMIN");
    testOrganization = await createTestOrganization(testOwner.username);
    testOrgApiKey = generateOrganizationApiKey();
    await addApiKeyToOrganization(testOrganization.id!, { key: testOrgApiKey, scope: "ALL"});
    testService = await createTestService(testOrganization.id);
  });

  afterEach(async () => {
    pricingNamespace.removeAllListeners(); // 💡 MUY IMPORTANTE
    
    if (pricingNamespace.connected) {
      pricingNamespace.disconnect();
    }

    // Cleanup created users and organization
    if (testService.id) {
      await deleteTestService(testService.name, testOrganization.id!);
    }

    if (testOrganization.id) {
      await deleteTestOrganization(testOrganization.id);
    }

    if (testOwner.id) {
      await deleteTestUser(testOwner.id);
    }

    if (testAdmin.id) {
      await deleteTestUser(testAdmin.id);
    }
  });

  afterAll(async function () {
    // Ensure socket disconnection
    if (pricingNamespace.connected) {
      pricingNamespace.disconnect();
    }

    // Cleanup authentication resources
    await cleanupAuthResources();
    await shutdownApp();
  });

  describe('WebSocket Connection', function () {
    it('Should connect to the WebSocket server successfully', async () => {
      expect(pricingNamespace.connected).toBe(true);
      });
    });

  describe('Events API Endpoints', function () {
    it('Should return status 200 when checking event service status', async function () {
      const response = await request(app)
        .get(`${baseUrl}/events/status`)
        .set('x-api-key', testOrgApiKey);

      expect(response.status).toEqual(200);
      expect(response.body).toBeDefined();
      expect(response.body.status).toBeDefined();
    });

    it('Should emit test event via API endpoint', async () => {
      // 1. Preparamos la "trampa" (listener) ANTES de disparar la acción
      const eventPromise = waitForPricingEvent(pricingNamespace, 'PRICING_ARCHIVED');

      // 2. Disparamos la acción (Ya estamos conectados gracias al beforeEach)
      await request(app)
        .post(`${baseUrl}/events/test-event`)
        .set('x-api-key', testOrgApiKey)
        .send({
          serviceName: 'test-service',
          pricingVersion: '2025',
        })
        .expect(200); // Supertest maneja errores http

      // 3. Esperamos a que caiga la presa
      const data = await eventPromise;

      // 4. Aseveramos
      expect(data.details.serviceName).toEqual('test-service');
      expect(data.details.pricingVersion).toEqual('2025');
    });
  });

  describe('Pricing Creation Events', function () {
    it('Should emit event when uploading a new pricing file', async () => {
      // 1. Preparar escucha
      const eventPromise = waitForPricingEvent(pricingNamespace, 'PRICING_CREATED');

      // 2. Acción
      const pricingFilePath = await getRandomPricingFile(new Date().getTime().toString());
      await request(app)
          .post(`${baseUrl}/services`)
          .set('x-api-key', testOrgApiKey)
          .attach('pricing', pricingFilePath)
          .expect(201);

      // 3. Validación
      const data = await eventPromise;
      expect(data.details).toBeDefined();
    });

    it('Should emit event when changing pricing availability', async () => {
      // 1. Preparar escucha
      const eventPromise = waitForPricingEvent(pricingNamespace, 'PRICING_ARCHIVED');

      // 2. Acción
      const pricingVersion = "2.0.0";
      await addArchivedPricingToService(testOrganization.id!, testService.name, pricingVersion);
      
      // 3. Validación
      const data = await eventPromise;
      expect(data.details.serviceName).toEqual(testService.name);
      expect(data.details.pricingVersion).toEqual(pricingVersion);      
    });
  });
});
