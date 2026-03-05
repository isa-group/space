import dotenv from 'dotenv';
import type { Server } from 'http';
import { initializeServer, disconnectDatabase } from '../../main/app';
import { Application } from 'express';

dotenv.config();

let testServer: Server | null = null;
let testApp: Application | null = null;

const baseUrl = process.env.BASE_URL_PATH ?? '/api/v1';

const getApp = async (): Promise<Server> => {
  if (!testServer) {
    const { server, app } = await initializeServer(false);
    testServer = server;
    testApp = app;
  }
  return testServer;
};

const useApp = async (app?: any) => {

  return app ?? (await getApp());
};

const shutdownApp = async () => {
  if (testServer) {
    await testServer.close();
    await disconnectDatabase();
    testApp = null;
    testServer = null;
  }
};

const getIdType = () => {
  switch (process.env.DATABASE_TECHNOLOGY) {
    case 'mongoDB':
      return String;
    default:
      throw new Error('Unsupported database technology');
  }
};

export { baseUrl, getApp, useApp, shutdownApp, getIdType };
