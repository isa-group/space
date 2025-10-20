import container from '../config/container';
import {
  ContractToCreate,
  LeanContract,
  UsageLevel,
  UsageLevelsResetQuery,
  UserContact,
} from '../types/models/Contract';
import ContractRepository from '../repositories/mongoose/ContractRepository';
import { validateContractQueryFilters } from './validation/ContractServiceValidation';
import ServiceService from './ServiceService';
import { LeanPricing } from '../types/models/Pricing';
import { addDays, isAfter } from 'date-fns';
import { isSubscriptionValid } from '../controllers/validation/ContractValidation';
import { performNovation } from '../utils/contracts/novation';
import CacheService from './CacheService';
import { addPeriodToDate, convertKeysToLowercase, escapeVersion, resetEscapeVersion } from '../utils/helpers';
import { generateUsageLevels, resetEscapeContractedServiceVersions } from '../utils/contracts/helpers';

class ContractService {
  private readonly contractRepository: ContractRepository;
  private readonly serviceService: ServiceService;
  private readonly cacheService: CacheService;

  constructor() {
    this.contractRepository = container.resolve('contractRepository');
    this.serviceService = container.resolve('serviceService');
    this.cacheService = container.resolve('cacheService');
  }

  async index(queryParams: any) {
    const errors = validateContractQueryFilters(queryParams);

    if (errors.length > 0) {
      throw new Error(
        'Errors where found during validation of query params: ' + errors.join(' | ')
      );
    }

    const contracts: LeanContract[] = await this.contractRepository.findByFilters(queryParams);

    for (const contract of contracts) {
      contract.contractedServices = resetEscapeContractedServiceVersions(contract.contractedServices);
    }

    return contracts;
  }

  async show(userId: string): Promise<LeanContract> {

    let contract = await this.cacheService.get(`contracts.${userId}`);

    if (!contract) {
      contract = await this.contractRepository.findByUserId(userId);
      await this.cacheService.set(`contracts.${userId}`, contract, 3600, true); // Cache for 1 hour
    }

    if (!contract) {
      throw new Error(`Contract with userId ${userId} not found`);
    }

    contract.contractedServices = resetEscapeContractedServiceVersions(contract.contractedServices);

    return contract;
  }

  async create(contractData: ContractToCreate): Promise<LeanContract> {
    // Prevent creating more than one contract per userId
    if (!contractData || !contractData.userContact || !contractData.userContact.userId) {
      throw new Error('Invalid request: Missing userContact.userId');
    }

    const existingContract = await this.contractRepository.findByUserId(
      contractData.userContact.userId
    );

    if (existingContract) {
      throw new Error(
        `Invalid request: Contract for user ${contractData.userContact.userId} already exists`
      );
    }

    const servicesKeys = Object.keys(contractData.contractedServices || {}).map((key) => key.toLowerCase());
    const services = await this.serviceService.indexByNames(servicesKeys);

    if (!services || services.length === 0) {
      throw new Error(`Invalid contract: Services not found: ${servicesKeys.join(', ')}`);
    }

    if (services && servicesKeys.length !== services.length) {
      const missingServices = servicesKeys.filter(
        (key) => !services.some((service) => service.name.toLowerCase() === key.toLowerCase())
      );
      throw new Error(`Invalid contract: Services not found: ${missingServices.join(', ')}`);
    }

    for (const serviceName in contractData.contractedServices) {
      const pricingVersion = escapeVersion(contractData.contractedServices[serviceName]);
      const service = services.find(
        (s) => s.name.toLowerCase() === serviceName.toLowerCase()
      );

      if (!service) {
        throw new Error(`Invalid contract: Services not found: ${serviceName}`);
      }

      if (!Object.keys(service.activePricings).includes(pricingVersion)) {
        throw new Error(
          `Invalid contract: Pricing version ${pricingVersion} for service ${serviceName} not found`
        );
      }

      contractData.contractedServices[serviceName] = escapeVersion(pricingVersion); // Ensure the version is stored correctly
    }
    
    const startDate = new Date();
    const renewalDays = contractData.billingPeriod?.renewalDays ?? 30; // Default to 30 days if not provided
    const endDate = addDays(new Date(startDate), renewalDays);

    // Convert keys to lowercase for contractedServices, subscriptionPlans and subscriptionAddOns
    contractData.contractedServices = convertKeysToLowercase(contractData.contractedServices);
    contractData.subscriptionPlans = convertKeysToLowercase(contractData.subscriptionPlans);
    contractData.subscriptionAddOns = convertKeysToLowercase(contractData.subscriptionAddOns);

    const contractDataToCreate: LeanContract = {
      ...contractData,
      billingPeriod: {
        startDate: startDate,
        endDate: endDate,
        autoRenew: contractData.billingPeriod?.autoRenew ?? false,
        renewalDays: renewalDays,
      },
      usageLevels: (await this._createUsageLevels(contractData.contractedServices)) || {},
      history: [],
    };
    try {
      await isSubscriptionValid({
        contractedServices: contractData.contractedServices,
        subscriptionPlans: contractData.subscriptionPlans,
        subscriptionAddOns: contractData.subscriptionAddOns,
      });
    } catch (error) {
      throw new Error(`Invalid subscription: ${error}`);
    }

    const contract = await this.contractRepository.create(contractDataToCreate);
    
    contract.contractedServices = resetEscapeContractedServiceVersions(contract.contractedServices);
    
    await this.cacheService.set(`contracts.${contract.userContact.userId}`, contract, 3600, true); // Cache for 1 hour

    return contract;
  }

  async novate(userId: string, newSubscription: any): Promise<LeanContract> {
    let contract = await this.cacheService.get(`contracts.${userId}`);

    if (!contract) {
      contract = await this.contractRepository.findByUserId(userId);
    }

    if (!contract) {
      throw new Error(`Contract with userId ${userId} not found`);
    }

    const newContract = performNovation(contract, newSubscription);

    const result = await this.contractRepository.update(userId, newContract);
    
    if (!result) {
      throw new Error(`Failed to update contract for userId ${userId}`);
    }
    
    result.contractedServices = resetEscapeContractedServiceVersions(result.contractedServices);
    
    await this.cacheService.set(`contracts.${userId}`, result, 3600, true); // Cache for 1 hour
    await this.cacheService.del(`features.${userId}.*`)

    return result;
  }

  async renew(userId: string): Promise<LeanContract> {
    let contract = await this.cacheService.get(`contracts.${userId}`);

    if (!contract) {
      contract = await this.contractRepository.findByUserId(userId);
    }

    if (!contract) {
      throw new Error(`Contract with userId ${userId} not found`);
    }

    if (!contract.billingPeriod.autoRenew) {
      throw new Error(
        `Contract with userId ${userId} is not set to auto-renew. It must be renewed manually.`
      );
    }

    const newEndDate = addDays(
      new Date(contract.billingPeriod.endDate),
      contract.billingPeriod.renewalDays
    );
    contract.billingPeriod.endDate = newEndDate;

    const result = await this.contractRepository.update(userId, contract);

    if (!result) {
      throw new Error(`Failed to update contract for userId ${userId}`);
    }

    result.contractedServices = resetEscapeContractedServiceVersions(result.contractedServices);
    
    await this.cacheService.set(`contracts.${userId}`, result, 3600, true); // Cache for 1 hour
    await this.cacheService.del(`features.${userId}.*`)

    return result;
  }

  async novateUserContact(
    userId: string,
    userContact: Omit<UserContact, 'userId'>
  ): Promise<LeanContract> {
    let contract = await this.cacheService.get(`contracts.${userId}`);

    if (!contract) {
      contract = await this.contractRepository.findByUserId(userId);
    }

    if (!contract) {
      throw new Error(`Contract with userId ${userId} not found`);
    }

    contract.userContact = {
      ...contract.userContact,
      ...userContact,
    };

    const result = await this.contractRepository.update(userId, contract);

    if (!result) {
      throw new Error(`Failed to update contract for userId ${userId}`);
    }

    result.contractedServices = resetEscapeContractedServiceVersions(result.contractedServices);
    
    await this.cacheService.set(`contracts.${userId}`, result, 3600, true); // Cache for 1 hour
    await this.cacheService.del(`features.${userId}.*`)

    return result;
  }

  async novateBillingPeriod(
    userId: string,
    newBillingPeriod: { endDate: Date; autoRenew: boolean; renewalDays: number }
  ): Promise<LeanContract> {
    let contract = await this.cacheService.get(`contracts.${userId}`);

    if (!contract) {
      contract = await this.contractRepository.findByUserId(userId);
    }

    if (!contract) {
      throw new Error(`Contract with userId ${userId} not found`);
    }

    if (new Date(newBillingPeriod.endDate) < new Date(contract.billingPeriod.startDate)) {
      throw new Error('End date cannot be before the start date');
    }

    contract.billingPeriod = {
      ...contract.billingPeriod,
      ...newBillingPeriod,
    };

    const result = await this.contractRepository.update(userId, contract);

    if (!result) {
      throw new Error(`Failed to update contract for userId ${userId}`);
    }

    result.contractedServices = resetEscapeContractedServiceVersions(result.contractedServices);
    
    await this.cacheService.set(`contracts.${userId}`, result, 3600, true); // Cache for 1 hour
    await this.cacheService.del(`features.${userId}.*`)

    return result;
  }

  async resetUsageLevels(
    userId: string,
    queryParams: UsageLevelsResetQuery,
    usageLevelsIncrements?: Record<string, Record<string, number>>
  ): Promise<LeanContract> {
    let contract = await this.cacheService.get(`contracts.${userId}`);

    if (!contract) {
      contract = await this.contractRepository.findByUserId(userId);
    }

    if (!contract) {
      throw new Error(`Contract with userId ${userId} not found`);
    }

    if (queryParams.usageLimit) {
      await this._resetUsageLimitUsageLevels(contract, queryParams.usageLimit);
    } else if (queryParams.reset) {
      await this._resetUsageLevels(contract, queryParams.renewableOnly);
    } else if (usageLevelsIncrements) {
      for (const serviceName in usageLevelsIncrements) {
        for (const usageLimit in usageLevelsIncrements[serviceName]) {
          if (contract.usageLevels[serviceName][usageLimit]) {
            contract.usageLevels[serviceName][usageLimit].consumed +=
              usageLevelsIncrements[serviceName][usageLimit];
          }
        }
      }
    } else {
      throw new Error(`Invalid query params: ${JSON.stringify(queryParams)}`);
    }

    const updatedContract = await this.contractRepository.update(userId, contract);

    if (!updatedContract) {
      throw new Error(`Failed to update contract for userId ${userId}`);
    }

    updatedContract.contractedServices = resetEscapeContractedServiceVersions(updatedContract.contractedServices);

    await this.cacheService.set(`contracts.${userId}`, updatedContract, 3600, true); // Cache for 1 hour
    await this.cacheService.del(`features.${userId}.*`)
    
    return updatedContract;
  }

  async _applyExpectedConsumption(
    userId: string,
    usageLimitId: string,
    expectedConsumption: number
  ): Promise<void> {
    let contract = await this.cacheService.get(`contracts.${userId}`);

    if (!contract) {
      contract = await this.contractRepository.findByUserId(userId);
    }

    if (!contract) {
      throw new Error(`Contract with userId ${userId} not found`);
    }

    const serviceName: string = usageLimitId.split('-')[0];
    const usageLimit: string = usageLimitId.split('-')[1];

    if (contract.usageLevels[serviceName][usageLimit]) {
      await this.cacheService.set(
        `${new Date().getTime()}.usageLevels.${userId}.${serviceName}.${usageLimit}`,
        contract.usageLevels[serviceName][usageLimit].consumed,
        120
      ); // 120 secs = 2 mins

      contract.usageLevels[serviceName][usageLimit].consumed += expectedConsumption;

      const updatedContract = await this.contractRepository.update(userId, contract);

      if (!updatedContract) {
        throw new Error(`Failed to update contract for userId ${userId}`);
      }

      await this.cacheService.set(`contracts.${userId}`, updatedContract, 3600, true); // Cache for 1 hour

    } else {
      throw new Error(`Usage level ${usageLimit} not found in contract for userId ${userId}`);
    }
  }

  async _revertExpectedConsumption(
    userId: string,
    usageLimitId: string,
    latest: boolean = false
  ): Promise<void> {
    let contract = await this.cacheService.get(`contracts.${userId}`);

    if (!contract) {
      contract = await this.contractRepository.findByUserId(userId);
    }

    if (!contract) {
      throw new Error(`Contract with userId ${userId} not found`);
    }

    const serviceName: string = usageLimitId.split('.')[0];
    const usageLimit: string = usageLimitId.split('.')[1];

    if (contract.usageLevels[serviceName][usageLimit]) {
      const previousCachedValue = await this._getCachedUsageLevel(
        userId,
        serviceName,
        usageLimit,
        latest
      );

      if (!previousCachedValue) {
        throw new Error(
          `No previous cached value found for user ${contract.userContact.username}, serviceName ${serviceName}, usageLimit ${usageLimit}. This may be caused because the usage level update that you are trying to revert was made more that 2 minutes ago.`
        );
      }

      contract.usageLevels[serviceName][usageLimit].consumed += previousCachedValue;

      const updatedContract = await this.contractRepository.update(userId, contract);

      if (!updatedContract) {
        throw new Error(`Failed to update contract for userId ${userId}`);
      }

      await this.cacheService.set(`contracts.${userId}`, updatedContract, 3600, true); // Cache for 1 hour
    } else {
      throw new Error(
        `Usage level ${usageLimit} not found in contract for user ${contract.userContact.username}`
      );
    }
  }

  async prune(): Promise<number> {
    const result: number = await this.contractRepository.prune();

    return result;
  }

  async destroy(userId: string): Promise<void> {
    let contract = await this.cacheService.get(`contracts.${userId}`);

    if (!contract) {
      contract = await this.contractRepository.findByUserId(userId);
    }

    if (!contract) {
      throw new Error(`Contract with userId ${userId} not found`);
    }

    await this.contractRepository.destroy(userId);

    this.cacheService.del(`contracts.${userId}`);
  }

  async _getCachedUsageLevel(
    userId: string,
    serviceName: string,
    usageLimit: string,
    latest: boolean = false
  ): Promise<number | null> {
    let cachedValues: string[] = await this.cacheService.match(
      `*.usageLevels.${userId}.${serviceName}.${usageLimit}`
    );
    cachedValues = cachedValues.sort((a, b) => {
      const aTimestamp = parseInt(a.split('.')[0]);
      const bTimestamp = parseInt(b.split('.')[0]);
      return aTimestamp - bTimestamp;
    });

    if (cachedValues.length === 0) {
      return null;
    }

    return await this.cacheService.get(
      latest ? cachedValues[cachedValues.length - 1] : cachedValues[0]
    );
  }

  async _createUsageLevels(
    services: Record<string, string>
  ): Promise<Record<string, Record<string, UsageLevel>>> {
    const usageLevels: Record<string, Record<string, UsageLevel>> = {};

    for (const serviceName in services) {
      const pricing: LeanPricing = await this.serviceService.showPricing(
        serviceName,
        services[serviceName]
      );

      const serviceUsageLevels: Record<string, UsageLevel> | undefined = generateUsageLevels(pricing);

      if (serviceUsageLevels) {
        usageLevels[serviceName] = serviceUsageLevels;
      }

    }
    return usageLevels;
  }

  _discoverUsageLimitServices(contract: LeanContract, usageLimit: string): string[] {
    const serviceNames: string[] = [];
    for (const serviceName in contract.usageLevels) {
      if (contract.usageLevels[serviceName][usageLimit]) {
        serviceNames.push(serviceName);
      }
    }
    return serviceNames;
  }

  async _resetUsageLimitUsageLevels(contract: LeanContract, usageLimit: string): Promise<void> {
    const serviceNames: string[] = this._discoverUsageLimitServices(contract, usageLimit);

    if (serviceNames.length === 0) {
      throw new Error(
        `Usage limit: ${usageLimit} not found in the contract. Maybe it's not being tracked as usage level`
      );
    }

    for (const serviceName of serviceNames) {
      contract.usageLevels[serviceName][usageLimit].consumed = 0;

      if (contract.usageLevels[serviceName][usageLimit].resetTimeStamp) {
        await this._setResetTimeStamp(contract, serviceName, usageLimit);
      }
    }
  }

  async _setResetTimeStamp(
    contract: LeanContract,
    serviceName: string,
    usageLimit: string
  ): Promise<void> {
    const pricingVersion = contract.contractedServices[serviceName];

    const servicePricing: LeanPricing = await this.serviceService.showPricing(
      serviceName,
      pricingVersion
    );

    contract.usageLevels[serviceName][usageLimit].resetTimeStamp = addPeriodToDate(
      contract.usageLevels[serviceName][usageLimit].resetTimeStamp!, // Cannot be undefined, since we are inside the if
      servicePricing.usageLimits![usageLimit].period! // Cannot be undefined, since renewawlPeriod was assigned to the usage level during the contract creation
    );
  }

  async _resetUsageLevels(contract: LeanContract, renewableOnly: boolean): Promise<void> {
    for (const serviceName in contract.usageLevels) {
      for (const usageLimit in contract.usageLevels[serviceName]) {
        if (renewableOnly && !contract.usageLevels[serviceName][usageLimit].resetTimeStamp) {
          continue;
        }
        contract.usageLevels[serviceName][usageLimit].consumed = 0;
        if (contract.usageLevels[serviceName][usageLimit].resetTimeStamp) {
          await this._setResetTimeStamp(contract, serviceName, usageLimit);
        }
      }
    }
  }

  async _resetRenewableUsageLevels(contract: LeanContract, usageLimitsToRenew: string[]): Promise<LeanContract> {
    
    if (usageLimitsToRenew.length === 0) {
      return contract;
    }
    
    const contractToUpdate = { ...contract };

    for (const usageLimitId of usageLimitsToRenew) {
      const serviceName: string = usageLimitId.split('-')[0];
      const usageLimitName: string = usageLimitId.split('-')[1];
      let currentResetTimeStamp = contractToUpdate.usageLevels[serviceName][usageLimitName].resetTimeStamp;

      if (currentResetTimeStamp && isAfter(new Date(), currentResetTimeStamp)) {
        const pricing: LeanPricing = await this.serviceService.showPricing(
          serviceName,
          contractToUpdate.contractedServices[serviceName]
        );
        currentResetTimeStamp = addPeriodToDate(
          currentResetTimeStamp,
          pricing.usageLimits![usageLimitName].period!
        );
        contractToUpdate.usageLevels[serviceName][usageLimitName].consumed = 0;
      }
    }

    const updatedContract = await this.contractRepository.update(contract.userContact.userId, contractToUpdate);
    
    if (!updatedContract) {
      throw new Error(`Failed to update contract for userId ${contract.userContact.userId}`);
    }

    return updatedContract;
  }
}

export default ContractService;
