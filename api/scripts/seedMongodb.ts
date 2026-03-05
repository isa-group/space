import mongoose from 'mongoose';
import {seedDatabase} from '../src/main/database/seeders/mongo/seeder';
import { getMongoDBConnectionURI } from '../src/main/config/mongoose';

await mongoose.connect(getMongoDBConnectionURI());
await seedDatabase();
await mongoose.disconnect();