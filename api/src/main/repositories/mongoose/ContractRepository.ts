import RepositoryBase from '../RepositoryBase';
import ContractMongoose from './models/ContractMongoose';
import { ContractQueryFilters, ContractToCreate, LeanContract } from '../../types/models/Contract';
import { toPlainObject } from '../../utils/mongoose';

class ContractRepository extends RepositoryBase {
  /**
   * Find contracts using advanced filters provided in `filters` key of queryFilters.
   * filters may contain:
   * - services: either array of service names OR object { serviceName: [versions] }
   * - plans: { serviceName: [planNames] }
   * - addOns: { serviceName: [addOnNames] }
   */
  async findByFilters(queryFilters: any) {
    const {
      username,
      firstName,
      lastName,
      email,
      page = 1,
      offset = 0,
      limit = 20,
      sort,
      order = 'asc',
      filters,
    } = queryFilters || {};

    const matchConditions: any[] = [];

    if (username) {
      matchConditions.push({ 'userContact.username': { $regex: username, $options: 'i' } });
    }
    if (firstName) {
      matchConditions.push({ 'userContact.firstName': { $regex: firstName, $options: 'i' } });
    }
    if (lastName) {
      matchConditions.push({ 'userContact.lastName': { $regex: lastName, $options: 'i' } });
    }
    if (email) {
      matchConditions.push({ 'userContact.email': { $regex: email, $options: 'i' } });
    }

    // We'll convert contractedServices object to array to ease matching
    const pipeline: any[] = [
      { $addFields: { contractedServicesArray: { $objectToArray: '$contractedServices' } } },
    ];

    if (filters) {
      // services filter
      if (filters.services) {
        const services = filters.services;
        if (Array.isArray(services)) {
          // array of service names: contractedServicesArray.k in list
          matchConditions.push({ 'contractedServicesArray.k': { $in: services.map((s: string) => s.toLowerCase()) } });
        } else if (typeof services === 'object') {
          // object mapping serviceName -> [versions]
          const perServiceMatches: any[] = [];
          for (const [serviceName, versions] of Object.entries(services)) {
            if (!Array.isArray(versions) || versions.length === 0) {
              // match any version for the service
              perServiceMatches.push({ 'contractedServicesArray': { $elemMatch: { k: serviceName.toLowerCase() } } });
            } else {
              // match if contractedServices has key serviceName and its v (value) in provided versions
              perServiceMatches.push({
                $and: [
                  { 'contractedServicesArray': { $elemMatch: { k: serviceName.toLowerCase(), v: { $in: versions.map((v: string) => v.replace(/\./g, '_')) } } } },
                ],
              });
            }
          }
          if (perServiceMatches.length > 0) {
            matchConditions.push({ $or: perServiceMatches });
          }
        }
      }

      // plans filter: subscriptionPlans is an object serviceName -> planName
      if (filters.plans && typeof filters.plans === 'object') {
        const perServicePlanMatches: any[] = [];
        for (const [serviceName, plans] of Object.entries(filters.plans)) {
          if (Array.isArray(plans) && plans.length > 0) {
            perServicePlanMatches.push({ [`subscriptionPlans.${serviceName.toLowerCase()}`]: { $in: plans.map((p: string) => new RegExp(`^${p}$`, 'i')) } });
          }
        }
        if (perServicePlanMatches.length > 0) {
          matchConditions.push({ $or: perServicePlanMatches });
        }
      }

      // addOns filter: subscriptionAddOns is object serviceName -> { addOnName: count }
      if (filters.addOns && typeof filters.addOns === 'object') {
        const perServiceAddOnMatches: any[] = [];
        for (const [serviceName, addOns] of Object.entries(filters.addOns)) {
          if (Array.isArray(addOns) && addOns.length > 0) {
            // We need to check keys of subscriptionAddOns[serviceName]
            perServiceAddOnMatches.push({
              $or: addOns.map((addOnName: string) => ({ [`subscriptionAddOns.${serviceName.toLowerCase()}.${addOnName.toLowerCase()}`]: { $exists: true } })),
            });
          }
        }
        if (perServiceAddOnMatches.length > 0) {
          matchConditions.push({ $or: perServiceAddOnMatches });
        }
      }
    }

    if (matchConditions.length > 0) {
      pipeline.push({ $match: { $and: matchConditions } });
    }

    pipeline.push({
      $sort: {
        [`userContact.${sort ?? 'username'}`]: order === 'asc' ? 1 : -1,
      },
    });

    pipeline.push({ $skip: offset === 0 ? (page - 1) * limit : offset });
    pipeline.push({ $limit: Math.min(limit, 100) });

    const contracts = await ContractMongoose.aggregate(pipeline);

    return contracts.map(contract => toPlainObject<LeanContract>(contract));
  }

  async findByUserId(userId: string): Promise<LeanContract | null> {
    const contract = await ContractMongoose.findOne({ 'userContact.userId': userId });
    return contract ? toPlainObject<LeanContract>(contract.toJSON()) : null;
  }

  async create(contractData: ContractToCreate): Promise<LeanContract> {
    const contract = new ContractMongoose(contractData);
    await contract.save();
    return toPlainObject<LeanContract>(contract.toJSON());
  }

  async update(
    userId: string,
    contractData: Partial<ContractToCreate>
  ): Promise<LeanContract | null> {
    const contract = await ContractMongoose.findOneAndUpdate(
      { 'userContact.userId': userId },
      { $set: contractData },
      { new: true }
    );
    return contract ? toPlainObject<LeanContract>(contract.toJSON()) : null;
  }

  async bulkUpdate(contracts: LeanContract[], disable = false): Promise<boolean> {
    if (contracts.length === 0) {
      return true;
    }

    const bulkOps = contracts.map(contract => ({
      updateOne: {
        filter: { 'userContact.userId': contract.userContact.userId },
        update: {
          $set: {
            ...contract,
            disable: disable,
          },
        },
        upsert: true,
      },
    }));

    const result = await ContractMongoose.bulkWrite(bulkOps);

    if (result.modifiedCount === 0 && result.upsertedCount === 0) {
      throw new Error('No contracts were updated or inserted');
    }

    return true;
  }

  async prune(): Promise<number> {
    const result = await ContractMongoose.deleteMany({});
    if (result.deletedCount === 0) {
      throw new Error('No contracts found to delete');
    }
    return result.deletedCount;
  }

  async destroy(userId: string): Promise<void> {
    const result = await ContractMongoose.deleteOne({ 'userContact.userId': userId });
    if (result.deletedCount === 0) {
      throw new Error(`Contract with userId ${userId} not found`);
    }
  }
}

export default ContractRepository;
