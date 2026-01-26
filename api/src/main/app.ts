import * as dotenv from 'dotenv';
import express, { Application } from 'express';
import type { Server } from 'http';
import type { AddressInfo } from 'net';

import container from './config/container';
import { disconnectMongoose, initMongoose } from './config/mongoose';
import { initRedis } from './config/redis';
import { seedDatabase } from './database/seeders/mongo/seeder';
import loadGlobalMiddlewares from './middlewares/GlobalMiddlewaresLoader';
import routes from './routes/index';
import { seedDefaultAdmin } from './database/seeders/common/userSeeder';

const green = '\x1b[32m';
const blue = '\x1b[36m';
const reset = '\x1b[0m';
const bold = '\x1b[1m';

const initializeApp = async (seedDatabase: boolean = true) => {
  dotenv.config();
  const app: Application = express();
  loadGlobalMiddlewares(app);
  await routes(app);
  await initializeDatabase(seedDatabase);
  const redisClient = await initRedis();
  if (['development', 'testing'].includes(process.env.ENVIRONMENT ?? '')) {
    await redisClient.sendCommand(['FLUSHALL']);
    console.log(`${green}➜${reset}  ${bold}Redis cache cleared.${reset}`);
  }
  container.resolve('cacheService').setRedisClient(redisClient);
  // await postInitializeDatabase(app)
  return app;
};

const initializeServer = async (
  seedDatabase: boolean = true
): Promise<{
  server: Server;
  app: Application;
}> => {
  const app: Application = await initializeApp(seedDatabase);
  const port = 3000;

  // Using a promise to ensure the server is started before returning it
  const server: Server = await new Promise((resolve, reject) => {
    const server = app.listen(port, (err?: Error) => {
      if (err) return reject(err);
      resolve(server);
    });
  });

  const addressInfo: AddressInfo = server.address() as AddressInfo;

  // Inicializar el servicio de eventos con el servidor HTTP
  container.resolve('eventService').initialize(server);

  console.log(
    `  ${green}➜${reset}  ${bold}API:${reset}     ${blue}http://localhost${addressInfo.port !== 80 ? `:${bold}${addressInfo.port}${reset}/` : '/'}`
  );
  console.log(
    `  ${green}➜${reset}  ${bold}WebSockets:${reset} ${blue}ws://localhost${addressInfo.port !== 80 ? `:${bold}${addressInfo.port}${reset}/events/pricings` : '/events/pricings'}`
  );

  if (['development', 'testing'].includes(process.env.ENVIRONMENT ?? '')) {
    console.log(`${green}➜${reset}  ${bold}Loaded Routes:${reset}`);
    app._router.stack
      .filter((layer: any) => layer.route)
      .forEach((layer: any) => {
        console.log(`  ${blue}${layer.route.path}${reset}`);
      });
  }

  return { server, app };
};

const initializeDatabase = async (seedDatabaseFlag: boolean = true) => {
  let connection;
  try {
    switch (process.env.DATABASE_TECHNOLOGY ?? 'mongoDB') {
      case 'mongoDB':
        connection = await initMongoose();
        if (['development', 'testing'].includes(process.env.ENVIRONMENT ?? '')) {
          if (seedDatabaseFlag) {
            await seedDatabase();
          }
        } else {
          if (seedDatabaseFlag) {
            await seedDefaultAdmin();
          }
        }
        break;
      default:
        throw new Error('Unsupported database technology');
    }
  } catch (error) {
    console.error(error);
  }
  return connection;
};

const disconnectDatabase = async () => {
  try {
    switch (process.env.DATABASE_TECHNOLOGY ?? 'mongoDB') {
      case 'mongoDB':
        await disconnectMongoose();
        break;
      default:
        throw new Error('Unsupported database technology');
    }
  } catch (error) {
    console.error(error);
  }
};

export { disconnectDatabase, initializeServer };
