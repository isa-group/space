import RepositoryBase from '../RepositoryBase';
import PricingMongoose from './models/PricingMongoose';
import ServiceMongoose from './models/ServiceMongoose';
import { LeanService } from '../../types/models/Service';
import { toPlainObject } from '../../utils/mongoose';
import { LeanPricing } from '../../types/models/Pricing';

export type ServiceQueryFilters = {
  name?: string;
  page?: number;
  offset?: number;
  limit?: number;
  order?: 'asc' | 'desc';
}

class ServiceRepository extends RepositoryBase {
  async findAll(organizationId: string, queryFilters?: ServiceQueryFilters, disabled = false) {
    const { name, page = 1, offset = 0, limit = 20, order = 'asc' } = queryFilters || {};
    
    const query: any = {
      ...(name ? { name: { $regex: name, $options: 'i' } } : {}),
      disabled: disabled,
      organizationId: organizationId
    };
    
    const services = await ServiceMongoose.find(query)
      .skip(offset == 0 ? (page - 1) * limit : offset)
      .limit(limit)
      .sort({ name: order === 'asc' ? 1 : -1 });
    
    return services.map((service) => toPlainObject<LeanService>(service.toJSON()));
  }

  async findAllNoQueries(organizationId: string, disabled = false, projection: any = { name: 1, activePricings: 1, archivedPricings: 1 }): Promise<LeanService[] | null> {
    const query: any = { disabled: disabled, organizationId: organizationId };
    const services = await ServiceMongoose.find(query).select(projection);

    if (!services || Array.isArray(services) && services.length === 0) {
      return null;
    }
    
    return services.map((service) => toPlainObject<LeanService>(service.toJSON()));
  }

  async findByName(name: string, organizationId: string, disabled = false): Promise<LeanService | null> {
    const query: any = { name: { $regex: name, $options: 'i' }, disabled: disabled, organizationId: organizationId };
    const service = await ServiceMongoose.findOne(query);
    if (!service) {
      return null;
    }

    return toPlainObject<LeanService>(service.toJSON());
  }

  async findByNames(names: string[], organizationId: string, disabled = false): Promise<LeanService[] | null> {
    const query: any = { name: { $in: names.map(name => new RegExp(name, 'i')) }, disabled: disabled, organizationId: organizationId };
    const services = await ServiceMongoose.find(query);
    if (!services || Array.isArray(services) && services.length === 0) {
      return null;
    }
    return services.map((service) => toPlainObject<LeanService>(service.toJSON()));
  }

  async findPricingsByServiceName(serviceName: string, versionsToRetrieve: string[], organizationId: string, disabled = false): Promise<LeanPricing[] | null> {
    const query: any = { _serviceName: { $regex: serviceName, $options: 'i' }, version: { $in: versionsToRetrieve }, _organizationId: organizationId };
    const pricings = await PricingMongoose.find(query);
    if (!pricings || Array.isArray(pricings) && pricings.length === 0) {
      return null;
    }

    return pricings.map((p) => toPlainObject<LeanPricing>(p.toJSON()));
  }

  async create(data: any) {
    
    const service = await ServiceMongoose.insertOne(data);
    
    return toPlainObject<LeanService>(service.toJSON());
  }

  async update(name: string, data: any, organizationId: string) {
    const query: any = { name: { $regex: name, $options: 'i' } };
    if (organizationId) {
      query.organizationId = organizationId;
    }
    const service = await ServiceMongoose.findOne(query);
    if (!service) {
      return null;
    }

    service.set(data);
    await service.save();

    return toPlainObject<LeanService>(service.toJSON());
  }

  async disable(name: string, organizationId: string) {
    const query: any = { name: { $regex: name, $options: 'i' }, organizationId: organizationId };
    const service = await ServiceMongoose.findOne(query);

    if (!service) {
      return null;
    }

    // Normalize archived and active pricings to plain objects to avoid Mongoose Map cast issues
    const existingArchived = service.archivedPricings ? JSON.parse(JSON.stringify(service.archivedPricings)) : {};
    const existingActive = service.activePricings ? JSON.parse(JSON.stringify(service.activePricings)) : {};

    const mergedArchived: Record<string, any> = { ...existingArchived };

    // Move active pricings into archived, renaming collisions
    for (const key of Object.keys(existingActive)) {
      if (mergedArchived[key]) {
        const newKey = `${key}_${Date.now()}`;
        mergedArchived[newKey] = existingActive[key];
      } else {
        mergedArchived[key] = existingActive[key];
      }
    }

    service.set({
      disabled: true,
      activePricings: {},
      archivedPricings: mergedArchived,
    });

    await service.save();

    return toPlainObject<LeanService>(service.toJSON());
  }

  async destroy(name: string, organizationId: string, ...args: any) {
    const query: any = { name: { $regex: name, $options: 'i' }, organizationId: organizationId };
    const result = await ServiceMongoose.deleteOne(query);
    
    if (!result) {
      return null;
    }
    if (result.deletedCount === 0) {
      return null;
    }
  
    if (result.deletedCount === 1) {
      await PricingMongoose.deleteMany({ _serviceName: name });
    }

    return true;
  }

  async prune() {
    const result = await ServiceMongoose.deleteMany({});

    if (result.deletedCount === 0) {
      return null;
    }

    return result.deletedCount;
  }
}

export default ServiceRepository;
