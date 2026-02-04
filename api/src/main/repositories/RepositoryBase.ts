import mongoose from 'mongoose';
import container from '../config/container';
import CacheService from '../services/CacheService';

class RepositoryBase {

  readonly cacheService: CacheService;

  constructor() {
    this.cacheService = container.resolve('cacheService');
  }

  async findById (id: string, ...args: any[]): Promise<any> {
    throw new Error('Not Implemented Exception');
  }

  async findAll (...args: any[]): Promise<any> {
    throw new Error('Not Implemented Exception');
  }

  async create (data: any, ...args: any[]): Promise<any> {
    throw new Error('Not Implemented Exception');
  }

  async update (data: any, ...args: any[]): Promise<any> {
    throw new Error('Not Implemented Exception');
  }

  async destroy (id: any, ...args: any[]): Promise<any> {
    throw new Error('Not Implemented Exception');
  }

  isValidObjectId (id: string) {
    if (mongoose.Types.ObjectId.isValid(id)) {
      if ((String)(new mongoose.Types.ObjectId(id)) === id) { return true; }
      return false;
    }
    return false;
  }
}

export default RepositoryBase;
