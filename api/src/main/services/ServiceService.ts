import { retrievePricingFromPath, retrievePricingFromText } from 'pricing4ts/server';
import container from '../config/container';
import ServiceRepository, { ServiceQueryFilters } from '../repositories/mongoose/ServiceRepository';
import { parsePricingToSpacePricingObject } from '../utils/pricing-yaml2json';
import { Pricing } from 'pricing4ts';
import fetch from 'node-fetch';
import https from 'https';
import path from 'path';
import fs from 'fs';
import PricingRepository from '../repositories/mongoose/PricingRepository';
import { validatePricingData } from './validation/PricingServiceValidation';
import { LeanService } from '../types/models/Service';
import { ExpectedPricingType, LeanPricing } from '../types/models/Pricing';
import { FallBackSubscription, LeanContract } from '../types/models/Contract';
import ContractRepository from '../repositories/mongoose/ContractRepository';
import { performNovation } from '../utils/contracts/novation';
import { isSubscriptionValidInPricing } from '../controllers/validation/ContractValidation';
import { generateUsageLevels } from '../utils/contracts/helpers';
import { escapeVersion } from '../utils/helpers';
import { resetEscapeVersionInService } from '../utils/services/helpers';
import CacheService from './CacheService';

class ServiceService {
  private readonly serviceRepository: ServiceRepository;
  private readonly pricingRepository: PricingRepository;
  private readonly contractRepository: ContractRepository;
  private readonly cacheService: CacheService;
  private readonly eventService;

  constructor() {
    this.serviceRepository = container.resolve('serviceRepository');
    this.pricingRepository = container.resolve('pricingRepository');
    this.contractRepository = container.resolve('contractRepository');
    this.eventService = container.resolve('eventService');
    this.cacheService = container.resolve('cacheService');
  }

  async index(queryParams: ServiceQueryFilters) {
    const services = await this.serviceRepository.findAll(queryParams);

    for (const service of services) {
      resetEscapeVersionInService(service);
    }

    return services;
  }

  async indexByNames(serviceNames: string[]) {
    if (!Array.isArray(serviceNames) || serviceNames.length === 0) {
      throw new Error('Invalid request: serviceNames must be a non-empty array');
    }

    const services = await this.serviceRepository.findByNames(serviceNames);
    return services;
  }

  async indexPricings(serviceName: string, pricingStatus: string) {
    let service = await this.cacheService.get(`service.${serviceName}`);

    if (!service) {
      service = await this.serviceRepository.findByName(serviceName);
      await this.cacheService.set(`service.${serviceName}`, service, 3600, true);
    }

    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }

    const pricingsToReturn =
      pricingStatus === 'active' ? service.activePricings : service.archivedPricings;

    if (!pricingsToReturn) {
      return [];
    }

    const versionsToRetrieve = Object.keys(pricingsToReturn);

    const versionsToRetrieveLocally = versionsToRetrieve.filter(
      version => pricingsToReturn[version]?.id
    );
    const versionsToRetrieveRemotely = versionsToRetrieve.filter(
      version => !pricingsToReturn[version]?.id
    );

    const locallySavedPricings =
      (await this.serviceRepository.findPricingsByServiceName(
        service.name,
        versionsToRetrieveLocally
      )) ?? [];

    const remotePricings = [];

    // Fetch remote pricings in parallel with a small concurrency limit and using cache
    const concurrency = 10;
    for (let i = 0; i < versionsToRetrieveRemotely.length; i += concurrency) {
      const batch = versionsToRetrieveRemotely.slice(i, i + concurrency);
      const batchResults = await Promise.all(
        batch.map(async (version) => {
          const url = pricingsToReturn[version].url;
          // Try cache first
          let pricing = await this.cacheService.get(`pricing.url.${url}`);
          if (!pricing) {
            pricing = await this._getPricingFromUrl(url);
            try {
              await this.cacheService.set(`pricing.url.${url}`, pricing, 3600, true);
            } catch (err) {
              // Don't fail the pricing retrieval if cache set fails. Log for debugging.
              // eslint-disable-next-line no-console
              console.debug('Cache set failed for pricing.url.' + url, err);
            }
          }
          return pricing;
        })
      );
      remotePricings.push(...batchResults);
    }

    return (locallySavedPricings as unknown as ExpectedPricingType[]).concat(remotePricings);
  }

  async show(serviceName: string) {
    let service = await this.cacheService.get(`service.${serviceName}`);

    if (!service) {
      service = await this.serviceRepository.findByName(serviceName);
      await this.cacheService.set(`service.${serviceName}`, service, 3600, true);
      if (!service) {
        throw new Error(`Service ${serviceName} not found`);
      }
    }

    resetEscapeVersionInService(service);

    return service;
  }

  async showPricing(serviceName: string, pricingVersion: string) {

    let service = await this.cacheService.get(`service.${serviceName}`);

    if (!service){
      service = await this.serviceRepository.findByName(serviceName);
    }

    const formattedPricingVersion = escapeVersion(pricingVersion);
    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }

    const pricingLocator =
      service.activePricings[formattedPricingVersion] ||
      service.archivedPricings[formattedPricingVersion];

    if (!pricingLocator) {
      throw new Error(`Pricing version ${pricingVersion} not found for service ${serviceName}`);
    }

    if (!pricingLocator.id && !pricingLocator.url) {
      throw new Error(
        `Neither Pricing URL or id found for version ${pricingVersion} in service ${serviceName}`
      );
    }

    if (pricingLocator.id) {

      let pricing = await this.cacheService.get(`pricing.id.${pricingLocator.id}`);

      if (!pricing){
        pricing = await this.pricingRepository.findById(pricingLocator.id);
        await this.cacheService.set(`pricing.id.${pricingLocator.id}`, pricing, 3600, true);
      }

      return pricing;
    } else {

      let pricing = await this.cacheService.get(`pricing.url.${pricingLocator.url}`);

      if (!pricing) {
        pricing = await this._getPricingFromUrl(pricingLocator.url);
        await this.cacheService.set(`pricing.url.${pricingLocator.url}`, pricing, 3600, true);
      }

      return pricing;
    }
  }

  async create(receivedPricing: any, pricingType: 'file' | 'url') {
    try {
      
      await this.cacheService.del("features.*");

      if (pricingType === 'file') {
        return await this._createFromFile(receivedPricing);
      } else {
        return await this._createFromUrl(receivedPricing);
      }
    } catch (err) {
      throw new Error((err as Error).message);
    }
  }

  async addPricingToService(
    serviceName: string,
    receivedPricing: any,
    pricingType: 'file' | 'url'
  ) {
    try {
      await this.cacheService.del("features.*");
      await this.cacheService.del(`service.${serviceName}`);
      
      if (pricingType === 'file') {
        return await this._createFromFile(receivedPricing, serviceName);
      } else {
        return await this._createFromUrl(receivedPricing, serviceName);
      }
    } catch (err) {
      throw new Error((err as Error).message);
    }
  }

  async _createFromFile(pricingFile: any, serviceName?: string) {
    let service: LeanService | null = null;

    // Step 1: Parse and validate pricing

    const uploadedPricing: Pricing = await this._getPricingFromPath(pricingFile.path);
    const formattedPricingVersion = escapeVersion(uploadedPricing.version);
    // Step 1.1: Load the service if already exists
    if (serviceName) {
      if (uploadedPricing.saasName !== serviceName) {
        throw new Error(
          `Invalid request: The service name in the pricing file (${uploadedPricing.saasName}) does not match the service name in the URL (${serviceName})`
        );
      }
      service = await this.serviceRepository.findByName(serviceName);
      if (!service) {
        throw new Error(`Service ${serviceName} not found`);
      }

      if (
        (service.activePricings && service.activePricings[formattedPricingVersion]) ||
        (service.archivedPricings && service.archivedPricings[formattedPricingVersion])
      ) {
        throw new Error(
          `Pricing version ${uploadedPricing.version} already exists for service ${serviceName}`
        );
      }
    }

    const pricingData: ExpectedPricingType & { _serviceName: string } = {
      _serviceName: uploadedPricing.saasName,
      ...parsePricingToSpacePricingObject(uploadedPricing),
    };

    const validationErrors: string[] = validatePricingData(pricingData);

    if (validationErrors.length > 0) {
      throw new Error(`Validation errors: ${validationErrors.join(', ')}`);
    }
    
    // Step 2:
    // - If the service does not exist (enabled), creates it
    // - If an enabled service exists, updates it with the new pricing
    // - If a disabled service exists with the same name, re-enable it, make the
    //   uploaded pricing the only active pricing and move all previous active/archived
    //   entries into archivedPricings (renaming collisions by appending timestamp)
    if (!service) {
      // Check if an enabled service exists
      const existingEnabled = await this.serviceRepository.findByName(uploadedPricing.saasName, false);
      const existingDisabled = await this.serviceRepository.findByName(uploadedPricing.saasName, true);

      if (existingEnabled) {
        throw new Error(`Invalid request: Service ${uploadedPricing.saasName} already exists`);
      }

      // Step 3: Create the service as it does not exist and add the pricing
      const savedPricing = await this.pricingRepository.create(pricingData);
  
      if (!savedPricing) {
        throw new Error(`Pricing ${uploadedPricing.version} not saved`);
      }

      if (existingDisabled) {
        // Re-enable flow: archive existing active pricings and archived pricings
        const newArchived: Record<string, any> = { ...(existingDisabled.archivedPricings || {}) };

        // rename any archived entry that collides with the new version
        if (newArchived[formattedPricingVersion]) {
          const newKey = `${formattedPricingVersion}_${Date.now()}`;
          newArchived[newKey] = newArchived[formattedPricingVersion];
          delete newArchived[formattedPricingVersion];
        }

        // move previous active pricings into archived (renaming collisions)
        if (existingDisabled.activePricings) {
          for (const key of Object.keys(existingDisabled.activePricings)) {
            if (key === formattedPricingVersion) {
              const newKey = `${key}_${Date.now()}`;
              newArchived[newKey] = existingDisabled.activePricings[key];
            } else {
              // if archived already has this key, append timestamp
              if (newArchived[key]) {
                const newKey = `${key}_${Date.now()}`;
                newArchived[newKey] = existingDisabled.activePricings[key];
              } else {
                newArchived[key] = existingDisabled.activePricings[key];
              }
            }
          }
        }

        const updateData: any = {
          disabled: false,
          activePricings: {
            [formattedPricingVersion]: {
              id: savedPricing.id,
            },
          },
          archivedPricings: newArchived,
        };

        const updated = await this.serviceRepository.update(existingDisabled.name, updateData);
        if (!updated) {
          throw new Error(`Service ${uploadedPricing.saasName} not updated`);
        }

        service = updated;
      } else {
        const serviceData = {
          name: uploadedPricing.saasName,
          activePricings: {
            [formattedPricingVersion]: {
              id: savedPricing.id,
            },
          },
        };

        try {
          service = await this.serviceRepository.create(serviceData);
        } catch (err) {
          throw new Error(`Service ${uploadedPricing.saasName} not saved: ${(err as Error).message}`);
        }
      }
    } else {
      // service exists (serviceName provided)
      // If pricing already exists as ACTIVE, we disallow
      if (service.activePricings && service.activePricings[formattedPricingVersion]) {
        throw new Error(
          `Pricing version ${uploadedPricing.version} already exists for service ${serviceName}`
        );
      }

      // If pricing exists in archived, rename archived entry to free the key
      const archivedExists = service.archivedPricings && service.archivedPricings[formattedPricingVersion];
      const updatePayload: any = {};

      if (archivedExists) {
        const newKey = `${formattedPricingVersion}_${Date.now()}`;
        updatePayload[`archivedPricings.${newKey}`] = service.archivedPricings[formattedPricingVersion];
        updatePayload[`archivedPricings.${formattedPricingVersion}`] = undefined;
      }

      // Step 3: Create the service as it does not exist and add the pricing
      const savedPricing = await this.pricingRepository.create(pricingData);
  
      if (!savedPricing) {
        throw new Error(`Pricing ${uploadedPricing.version} not saved`);
      }

      // If the service is disabled, re-enable it and move previous active/archived to archived
      if ((service as any).disabled) {
        const newArchived: Record<string, any> = { ...(service.archivedPricings || {}) };

        if (newArchived[formattedPricingVersion]) {
          const newKey = `${formattedPricingVersion}_${Date.now()}`;
          newArchived[newKey] = newArchived[formattedPricingVersion];
          delete newArchived[formattedPricingVersion];
        }

        if (service.activePricings) {
          for (const key of Object.keys(service.activePricings)) {
            if (key === formattedPricingVersion) {
              const newKey = `${key}_${Date.now()}`;
              newArchived[newKey] = service.activePricings[key];
            } else {
              if (newArchived[key]) {
                const newKey = `${key}_${Date.now()}`;
                newArchived[newKey] = service.activePricings[key];
              } else {
                newArchived[key] = service.activePricings[key];
              }
            }
          }
        }

        updatePayload.disabled = false;
        updatePayload.activePricings = {
          [formattedPricingVersion]: {
            id: savedPricing.id,
          },
        };
        updatePayload.archivedPricings = newArchived;
      } else {
        // Normal update: keep existing active pricings and just add the new one
        updatePayload[`activePricings.${formattedPricingVersion}`] = {
          id: savedPricing.id,
        };
      }

      const updatedService = await this.serviceRepository.update(service.name, updatePayload);

      service = updatedService;
    }

    if (!service) {
      throw new Error(`Service ${uploadedPricing.saasName} not saved`);
    }

    // Emit pricing creation event
    this.eventService.emitPricingCreatedMessage(service.name, uploadedPricing.version);

    // Step 4: Link the pricing to the service
    // await this.pricingRepository.addServiceNameToPricing(
    //   savedPricing.id!.toString(),
    //   service!.name.toString()
    // );

    // Step 5: If everythign was ok, remove the uploaded file

    const directory = path.dirname(pricingFile.path);
    if (fs.readdirSync(directory).length === 1) {
      fs.rmdirSync(directory, { recursive: true });
    } else {
      fs.rmSync(pricingFile.path);
    }

    resetEscapeVersionInService(service);

    // Step 6: Return the saved service
    return service;
  }

  async _createFromUrl(pricingUrl: string, serviceName?: string) {
    const uploadedPricing: Pricing = await this._getPricingFromRemoteUrl(pricingUrl);
    const formattedPricingVersion = escapeVersion(uploadedPricing.version);

    if (!serviceName) {
      // Create a new service or re-enable a disabled one
      const existingEnabled = await this.serviceRepository.findByName(uploadedPricing.saasName, false);
      const existingDisabled = await this.serviceRepository.findByName(uploadedPricing.saasName, true);

      if (existingEnabled) {
        throw new Error(`Invalid request: Service ${uploadedPricing.saasName} already exists`);
      }

      if (existingDisabled) {
        const newArchived: Record<string, any> = { ...(existingDisabled.archivedPricings || {}) };

        if (newArchived[formattedPricingVersion]) {
          const newKey = `${formattedPricingVersion}_${Date.now()}`;
          newArchived[newKey] = newArchived[formattedPricingVersion];
          delete newArchived[formattedPricingVersion];
        }

        if (existingDisabled.activePricings) {
          for (const key of Object.keys(existingDisabled.activePricings)) {
            if (key === formattedPricingVersion) {
              const newKey = `${key}_${Date.now()}`;
              newArchived[newKey] = existingDisabled.activePricings[key];
            } else {
              if (newArchived[key]) {
                const newKey = `${key}_${Date.now()}`;
                newArchived[newKey] = existingDisabled.activePricings[key];
              } else {
                newArchived[key] = existingDisabled.activePricings[key];
              }
            }
          }
        }

        const updateData: any = {
          disabled: false,
          activePricings: {
            [formattedPricingVersion]: {
              url: pricingUrl,
            },
          },
          archivedPricings: newArchived,
        };

        const updated = await this.serviceRepository.update(existingDisabled.name, updateData);
        if (!updated) {
          throw new Error(`Service ${uploadedPricing.saasName} not updated`);
        }

        return updated;
      }

      const serviceData = {
        name: uploadedPricing.saasName,
        activePricings: {
          [formattedPricingVersion]: {
            url: pricingUrl,
          },
        },
      };

      const service = await this.serviceRepository.create(serviceData);
      
      // Emit pricing creation event
      this.eventService.emitPricingCreatedMessage(service.name, uploadedPricing.version);
      
      return service;
    } else {
      if (uploadedPricing.saasName !== serviceName) {
        throw new Error(
          `Invalid request: The service name in the pricing file (${uploadedPricing.saasName}) does not match the service name in the URL (${serviceName})`
        );
      }
      // Update an existing service
      const service = await this.serviceRepository.findByName(serviceName);
      if (!service) {
        throw new Error(`Service ${serviceName} not found`);
      }

      // If already active, reject
      if (service.activePricings && service.activePricings[formattedPricingVersion]) {
        throw new Error(
          `Pricing version ${uploadedPricing.version} already exists for service ${serviceName}`
        );
      }

      const updatePayload: any = {};

      // If exists in archived, rename archived entry first
      if (service.archivedPricings && service.archivedPricings[formattedPricingVersion]) {
        const newKey = `${formattedPricingVersion}_${Date.now()}`;
        updatePayload[`archivedPricings.${newKey}`] = service.archivedPricings[formattedPricingVersion];
        updatePayload[`archivedPricings.${formattedPricingVersion}`] = undefined;
      }

      // If disabled, re-enable and move previous active into archived
      if ((service as any).disabled) {
        const newArchived: Record<string, any> = { ...(service.archivedPricings || {}) };

        if (newArchived[formattedPricingVersion]) {
          const newKey = `${formattedPricingVersion}_${Date.now()}`;
          newArchived[newKey] = newArchived[formattedPricingVersion];
          delete newArchived[formattedPricingVersion];
        }

        if (service.activePricings) {
          for (const key of Object.keys(service.activePricings)) {
            if (key === formattedPricingVersion) {
              const newKey = `${key}_${Date.now()}`;
              newArchived[newKey] = service.activePricings[key];
            } else {
              if (newArchived[key]) {
                const newKey = `${key}_${Date.now()}`;
                newArchived[newKey] = service.activePricings[key];
              } else {
                newArchived[key] = service.activePricings[key];
              }
            }
          }
        }

        updatePayload.disabled = false;
        updatePayload.activePricings = {
          [formattedPricingVersion]: {
            url: pricingUrl,
          },
        };
        updatePayload.archivedPricings = newArchived;
      } else {
        updatePayload[`activePricings.${formattedPricingVersion}`] = {
          url: pricingUrl,
        };
      }

      const updatedService = await this.serviceRepository.update(service.name, updatePayload);

      if (!updatedService) {
        throw new Error(`Service ${serviceName} not updated with pricing ${uploadedPricing.version}`);
      }

      resetEscapeVersionInService(updatedService);
      
      // Emit pricing creation event
      this.eventService.emitPricingCreatedMessage(service.name, uploadedPricing.version);
      
      return updatedService;
    }
  }

  async update(serviceName: string, newServiceData: any) {

    let service = await this.cacheService.get(`service.${serviceName}`);

    if (!service) {
      service = await this.serviceRepository.findByName(serviceName);
    }

    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }

    const updatedService = await this.serviceRepository.update(service.name, newServiceData);
    if (newServiceData.name && newServiceData.name !== service.name) {
      // If the service name has changed, we need to update the cache key
      await this.cacheService.del(`service.${service.name}`);
      serviceName = newServiceData.name;
    }
    await this.cacheService.set(`service.${serviceName}`, updatedService, 3600, true);

    return updatedService;
  }

  async updatePricingAvailability(
    serviceName: string,
    pricingVersion: string,
    newAvailability: 'active' | 'archived',
    fallBackSubscription: FallBackSubscription
  ) {

    let service = await this.cacheService.get(`service.${serviceName}`);

    if (!service) {
      service = await this.serviceRepository.findByName(serviceName);
    }

    const formattedPricingVersion = escapeVersion(pricingVersion);

    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }

    // If newAvailability is the same as the current one, return the service
    if (
      (newAvailability === 'active' && service.activePricings[formattedPricingVersion]) ||
      (newAvailability === 'archived' &&
        service.archivedPricings &&
        service.archivedPricings[formattedPricingVersion])
    ) {
      return service;
    }

    if (
      newAvailability === 'archived' &&
      Object.keys(service.activePricings).length === 1 &&
      service.activePricings[formattedPricingVersion]
    ) {
      throw new Error(`You cannot archive the last active pricing for service ${serviceName}`);
    }

    if (newAvailability === 'archived' && Object.keys(fallBackSubscription).length === 0) {
      throw new Error(
        `Invalid request: Archiving pricing version ${formattedPricingVersion} of service ${serviceName} cannot be completed. To proceed, you must provide a fallback subscription in the request body. All active contracts will be novated to this new version upon archiving.`
      );
    }

    const pricingLocator =
      service.activePricings[formattedPricingVersion] ??
      service.archivedPricings[formattedPricingVersion];

    if (!pricingLocator) {
      throw new Error(`Pricing version ${pricingVersion} not found for service ${serviceName}`);
    }

    let updatedService;

    if (newAvailability === 'active') {
      updatedService = await this.serviceRepository.update(service.name, {
        [`activePricings.${formattedPricingVersion}`]: pricingLocator,
        [`archivedPricings.${formattedPricingVersion}`]: undefined,
      });

      // Emitir evento de cambio de pricing (activación)
      this.eventService.emitPricingActivedMessage(service.name, pricingVersion);
      await this.cacheService.set(`service.${serviceName}`, updatedService, 3600, true);
    } else {
      updatedService = await this.serviceRepository.update(service.name, {
        [`activePricings.${formattedPricingVersion}`]: undefined,
        [`archivedPricings.${formattedPricingVersion}`]: pricingLocator,
      });

      // Emitir evento de cambio de pricing (archivado)
      this.eventService.emitPricingArchivedMessage(service.name, pricingVersion);
      await this.cacheService.set(`service.${serviceName}`, updatedService, 3600, true);

      if (
        fallBackSubscription &&
        fallBackSubscription.subscriptionPlan === undefined &&
        fallBackSubscription.subscriptionAddOns === undefined
      ) {
        throw new Error(
          `Invalid request: In order to novate contracts to the latest version, the provided fallback subscription must contain at least a subscriptionPlan (if the pricing has plans), and optionally a subset of add-ons. If the pricing do not have plans, the set of add-ons is mandatory.`
        );
      }

      await this._novateContractsToLatestVersion(
        service.name.toLowerCase(),
        escapeVersion(pricingVersion),
        fallBackSubscription
      );
    }

    if (updatedService) {
      resetEscapeVersionInService(updatedService);
    }

    return updatedService;
  }

  async prune() {
    const result = await this.serviceRepository.prune();
    return result;
  }

  async disable(serviceName: string) {
    let service = await this.cacheService.get(`service.${serviceName}`);

    if (!service) {
      service = await this.serviceRepository.findByName(serviceName);
    }

    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }

    const contractNovationResult = await this._removeServiceFromContracts(service.name);

    if (!contractNovationResult) {
      throw new Error(`Failed to remove service ${serviceName} from contracts`);
    }

    const result = await this.serviceRepository.disable(service.name);
  
    this.eventService.emitServiceDisabledMessage(service.name);
    this.cacheService.del(`service.${serviceName}`);

    return result;
  }

  async destroyPricing(serviceName: string, pricingVersion: string) {

    let service = await this.cacheService.get(`service.${serviceName}`);

    if (!service) {
      service = await this.serviceRepository.findByName(serviceName);
    }

    if (!service) {
      throw new Error(`Service ${serviceName} not found`);
    }

    const formattedPricingVersion = escapeVersion(pricingVersion);

    if (service.activePricings[formattedPricingVersion]) {
      throw new Error(
        `Forbidden: You cannot delete an active pricing version ${pricingVersion} for service ${serviceName}. Please archive it first.`
      );
    }

    const pricingLocator = service.archivedPricings[formattedPricingVersion];

    if (!pricingLocator) {
      throw new Error(
        `Invalid request: No archived version ${pricingVersion} found for service ${serviceName}. Remember that a pricing must be archived before it can be deleted.`
      );
    }

    if (pricingLocator.id) {
      await this.pricingRepository.destroy(pricingLocator.id);
      this.cacheService.del(`pricing.id.${pricingLocator.id}`);
      this.cacheService.del(`pricing.url.${pricingLocator.url}`);
    }

    const result = await this.serviceRepository.update(service.name, {
      [`activePricings.${formattedPricingVersion}`]: undefined,
      [`archivedPricings.${formattedPricingVersion}`]: undefined,
    });
    await this.cacheService.set(`service.${serviceName}`, result, 3600, true);

    return result;
  }

  async _novateContractsToLatestVersion(
    serviceName: string,
    pricingVersion: string,
    fallBackSubscription: FallBackSubscription
  ): Promise<void> {
    const serviceContracts: LeanContract[] = await this.contractRepository.findByFilters({
      services: [serviceName],
    });

    if (Object.keys(fallBackSubscription).length === 0) {
      throw new Error(
        `No fallback subscription provided for service ${serviceName}. Novation to new version cannot be performed to affected contracts`
      );
    }

    const pricingVersionContracts: LeanContract[] = serviceContracts.filter(
      contract => contract.contractedServices[serviceName] === pricingVersion
    );

    if (pricingVersionContracts.length === 0) {
      return;
    }

    const serviceLatestPricing = await this._getLatestActivePricing(serviceName);

    if (!serviceLatestPricing) {
      throw new Error(`No active pricing found for service ${serviceName}`);
    }

    const serviceUsageLevels = generateUsageLevels(serviceLatestPricing);

    if (serviceLatestPricing !== null) {
      pricingVersionContracts.forEach(contract => {
        contract.contractedServices[serviceName] = serviceLatestPricing.version;
        contract.subscriptionPlans[serviceName] = fallBackSubscription.subscriptionPlan;
        contract.subscriptionAddOns[serviceName] = fallBackSubscription.subscriptionAddOns;

        try {
          isSubscriptionValidInPricing(
            serviceName,
            {
              contractedServices: contract.contractedServices,
              subscriptionPlans: contract.subscriptionPlans,
              subscriptionAddOns: contract.subscriptionAddOns,
            },
            serviceLatestPricing
          );
        } catch (err) {
          throw new Error(
            `The configuration provided to novate affected contracts is not valid for version ${serviceLatestPricing.version} of service ${serviceName}. Error: ${err}`
          );
        }

        if (serviceUsageLevels) {
          contract.usageLevels[serviceName] = serviceUsageLevels;
        } else {
          delete contract.usageLevels[serviceName];
        }
      });

      const resultNovations = await this.contractRepository.bulkUpdate(pricingVersionContracts);

      if (!resultNovations) {
        throw new Error(`Failed to novate contracts for service ${serviceName}`);
      }
    }
  }

  async _getLatestActivePricing(serviceName: string): Promise<LeanPricing | null> {
    const pricings = await this.indexPricings(serviceName, 'active');

    const sortedPricings = pricings.sort((a, b) => {
      // Sort by createdAt date (descending - newest first)
      if (a.createdAt && b.createdAt) {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }

      return 0;
    });

    return sortedPricings.length > 0 ? sortedPricings[0] : null;
  }

  async _getPricingFromUrl(url: string) {
    const isLocalUrl = url.startsWith('public/');
    return parsePricingToSpacePricingObject(
      await (isLocalUrl ? this._getPricingFromPath(url) : this._getPricingFromRemoteUrl(url))
    );
  }

  async _getPricingFromPath(path: string) {
    try {
      const pricing = retrievePricingFromPath(path);
      return pricing;
    } catch (err) {
      throw new Error(`Pricing parsing error: ${(err as Error).message}`);
    }
  }

  async _getPricingFromRemoteUrl(url: string) {
    const agent = new https.Agent({ rejectUnauthorized: false });
    // Abort fetch if it takes longer than timeoutMs
    const timeoutMs = 5000;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    let response;
    try {
      response = await fetch(url, { agent, signal: controller.signal });
    } catch (err) {
      if ((err as any).name === 'AbortError') {
        throw new Error(`Timeout fetching pricing from URL: ${url}`);
      }
      throw err;
    } finally {
      clearTimeout(id);
    }

    if (!response.ok) {
      throw new Error(`Failed to fetch pricing from URL: ${url}, status: ${response.status}`);
    }
    const remotePricingYaml = await response.text();
    return retrievePricingFromText(remotePricingYaml);
  }

  async _removeServiceFromContracts(serviceName: string): Promise<boolean> {
    const contracts: LeanContract[] = await this.contractRepository.findByFilters({});
    const novatedContracts: LeanContract[] = [];
    const contractsToDisable: LeanContract[] = [];

    for (const contract of contracts) {
      // Remove this service from the subscription objects
      const newSubscription: Record<string, any> = {
        contractedServices: {},
        subscriptionPlans: {},
        subscriptionAddOns: {},
      };

      // Rebuild subscription objects without the service to be removed
      for (const key in contract.contractedServices) {
        if (key !== serviceName) {
          newSubscription.contractedServices[key] = contract.contractedServices[key];
        }
      }

      for (const key in contract.subscriptionPlans) {
        if (key !== serviceName) {
          newSubscription.subscriptionPlans[key] = contract.subscriptionPlans[key];
        }
      }

      for (const key in contract.subscriptionAddOns) {
        if (key !== serviceName) {
          newSubscription.subscriptionAddOns[key] = contract.subscriptionAddOns[key];
        }
      }

      // Check if objects have the same content by comparing their JSON string representation
      const hasContractChanged =
        JSON.stringify(contract.contractedServices) !==
        JSON.stringify(newSubscription.contractedServices);

      // If objects are equal, skip this contract
      if (!hasContractChanged) {
        continue;
      }

      const newContract = performNovation(contract, newSubscription);

      if (contract.usageLevels[serviceName]) {
        delete contract.usageLevels[serviceName];
      }

      if (Object.keys(newSubscription.contractedServices).length === 0) {
        newContract.usageLevels = {};
        newContract.billingPeriod = {
          startDate: new Date(),
          endDate: new Date(),
          autoRenew: false,
          renewalDays: 0,
        };

        contractsToDisable.push(newContract);
        continue;
      }

      novatedContracts.push(newContract);
    }

    const resultNovations = await this.contractRepository.bulkUpdate(novatedContracts);
    const resultDisables = await this.contractRepository.bulkUpdate(contractsToDisable, true);

    return resultNovations && resultDisables;
  }
}

export default ServiceService;
