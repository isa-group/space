import container from '../config/container';
import ContractService from '../services/ContractService';
import {
  ContractQueryFilters,
  ContractToCreate,
  Subscription,
  UsageLevelsResetQuery,
} from '../types/models/Contract';
import { removeOptionalFieldsOfQueryParams } from '../utils/controllerUtils';

class ContractController {
  private readonly contractService: ContractService;

  constructor() {
    this.contractService = container.resolve('contractService');
    this.index = this.index.bind(this);
    this.show = this.show.bind(this);
    this.create = this.create.bind(this);
    this.novate = this.novate.bind(this);
    this.novateUserContact = this.novateUserContact.bind(this);
    this.novateBillingPeriod = this.novateBillingPeriod.bind(this);
    this.resetUsageLevels = this.resetUsageLevels.bind(this);
    this.prune = this.prune.bind(this);
    this.destroy = this.destroy.bind(this);
  }

  async index(req: any, res: any) {
    try {
      const queryParams = this._transformIndexQueryParams(req.query);
      const filters = req.body?.filters;

      if (filters) {
        // merge filters into top-level params and delegate to index which will call repository.findByFilters
        const merged = { ...queryParams, filters };
        const contracts = await this.contractService.index(merged);
        res.json(contracts);
        return;
      }

      const contracts = await this.contractService.index(queryParams);
      res.json(contracts);
    } catch (err: any) {
      if (err.message.toLowerCase().includes('validation of query params')) {
        res.status(400).send({ error: err.message });
      } else {
        res.status(500).send({ error: err.message });
      }
    }
  }

  async show(req: any, res: any) {
    try {
      const userId = req.params.userId;
      const contract = await this.contractService.show(userId);
      res.json(contract);
    } catch (err: any) {
      if (err.message.toLowerCase().includes('not found')) {
        res.status(404).send({ error: err.message });
      } else {
        res.status(500).send({ error: err.message });
      }
    }
  }

  async create(req: any, res: any) {
    try {
      const contractData: ContractToCreate = req.body;
      const contract = await this.contractService.create(contractData);
      res.status(201).json(contract);
    } catch (err: any) {
      if (err.message.toLowerCase().includes('invalid')) {
        res.status(400).send({ error: err.message });
      } else {
      res.status(500).send({ error: err.message });
      }
    }
  }

  async novate(req: any, res: any) {
    try {
      const userId = req.params.userId;
      const newSubscription: Subscription = req.body;
      const contract = await this.contractService.novate(userId, newSubscription);
      res.status(200).json(contract);
    } catch (err: any) {
      if (err.message.toLowerCase().includes('not found')) {
        res.status(404).send({ error: err.message });
      } else if (err.message.toLowerCase().includes('invalid subscription:')) {
        res.status(400).send({ error: err.message });
      } else {
        res.status(500).send({ error: err.message });
      }
    }
  }

  async novateUserContact(req: any, res: any) {
    try {
      const userId = req.params.userId;
      const userContact = req.body;
      const contract = await this.contractService.novateUserContact(userId, userContact);
      res.status(200).json(contract);
    } catch (err: any) {
      if (err.message.toLowerCase().includes('not found')) {
        res.status(404).send({ error: err.message });
      } else {
        res.status(500).send({ error: err.message });
      }
    }
  }

  async novateBillingPeriod(req: any, res: any) {
    try {
      const userId = req.params.userId;
      const billingPeriod = req.body;
      const contract = await this.contractService.novateBillingPeriod(userId, billingPeriod);
      res.status(200).json(contract);
    } catch (err: any) {
      if (err.message.toLowerCase().includes('not found')) {
        res.status(404).send({ error: err.message });
      } else {
        res.status(500).send({ error: err.message });
      }
    }
  }

  async resetUsageLevels(req: any, res: any) {
    try {
      const userId = req.params.userId;
      const queryParams = this._transformUsageLevelsResetQueryParams(req.query);
      const usageLevelsIncrements = req.body;
      const novatedContract = await this.contractService.resetUsageLevels(
        userId,
        queryParams,
        usageLevelsIncrements
      );
      res.status(200).json(novatedContract);
    } catch (err: any) {
      if (err.message.toLowerCase().includes('not found')) {
        res.status(404).send({ error: err.message });
      } else if (err.message.toLowerCase().includes('invalid query:')) {
        res.status(400).send({ error: err.message });
      } else {
        res.status(500).send({ error: err.message });
      }
    }
  }

  async prune(req: any, res: any) {
    try {
      const result: number = await this.contractService.prune();
      res.status(204).json({ message: `Deleted ${result} contracts successfully` });
    } catch (err: any) {
      if (err.message.toLowerCase().includes('not found')) {
        res.status(404).send({ error: err.message });
      } else {
        res.status(500).send({ error: err.message });
      }
    }
  }

  async destroy(req: any, res: any) {
    try {
      const userId = req.params.userId;
      await this.contractService.destroy(userId);
      res.status(204).json({ message: `Deleted contract with userId ${userId} successfully` });
    } catch (err: any) {
      if (err.message.toLowerCase().includes('not found')) {
        res.status(404).send({ error: err.message });
      } else {
        res.status(500).send({ error: err.message });
      }
    }
  }

  _transformIndexQueryParams(
    indexQueryParams: Record<string, string | number>
  ): ContractQueryFilters {
    const transformedData: ContractQueryFilters = {
      username: indexQueryParams.username as string,
      firstName: indexQueryParams.firstName as string,
      lastName: indexQueryParams.lastName as string,
      email: indexQueryParams.email as string,
      page: parseInt(indexQueryParams['page'] as string) || 1,
      offset: parseInt(indexQueryParams['offset'] as string) || 0,
      limit: parseInt(indexQueryParams['limit'] as string) || 20,
      sort: indexQueryParams.sort as 'firstName' | 'lastName' | 'username' | 'email',
      order: (indexQueryParams.order as 'asc' | 'desc') || 'asc',
    };

    const optionalFields: string[] = Object.keys(transformedData);

    removeOptionalFieldsOfQueryParams(transformedData, optionalFields);

    return transformedData;
  }

  _transformUsageLevelsResetQueryParams(
    indexQueryParams: Record<string, string>
  ): UsageLevelsResetQuery {
    const transformedData: UsageLevelsResetQuery = {
      reset: indexQueryParams.reset === 'true' || undefined,
      renewableOnly: indexQueryParams.renewableOnly !== 'false',
      usageLimit: indexQueryParams.usageLimit,
    };

    if (indexQueryParams.reset && indexQueryParams.usageLimit) {
      throw new Error(
        'Invalid query: Both reset and usageLimit cannot be provided at the same time'
      );
    }

    return transformedData;
  }
}

export default ContractController;
