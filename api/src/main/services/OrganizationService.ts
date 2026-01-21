import container from '../config/container';
import { OrganizationApiKeyRole } from '../types/permissions';
import OrganizationRepository from '../repositories/mongoose/OrganizationRepository';
import { LeanApiKey, LeanOrganization, OrganizationFilter } from '../types/models/Organization';
import { generateOrganizationApiKey } from '../utils/users/helpers';
import UserService from './UserService';
import { validateOrganizationData } from './validation/OrganizationServiceValidations';

class OrganizationService {
  private organizationRepository: OrganizationRepository;
  private userService: UserService;

  constructor() {
    this.organizationRepository = container.resolve('organizationRepository');
    this.userService = container.resolve('userService');
  }

  async findAll(filters: OrganizationFilter): Promise<LeanOrganization[]> {
    const organizations = await this.organizationRepository.findAll(filters);
    return organizations;
  }

  async findById(organizationId: string): Promise<LeanOrganization | null> {
    const organization = await this.organizationRepository.findById(organizationId);
    return organization;
  }

  async findByOwner(owner: string): Promise<LeanOrganization | null> {
    const organization = await this.organizationRepository.findByOwner(owner);
    return organization;
  }

  async findByApiKey(apiKey: string): Promise<{ organization: LeanOrganization; apiKeyData: LeanApiKey }> {
    const organization = await this.organizationRepository.findByApiKey(apiKey);
    
    if (!organization) {
      throw new Error('Invalid API Key');
    }

    // Find the specific API key data
    const apiKeyData = organization.apiKeys.find(key => key.key === apiKey);
    
    if (!apiKeyData) {
      throw new Error('Invalid API Key');
    }

    return {
      organization,
      apiKeyData
    };
  }

  async create(organizationData: any): Promise<LeanOrganization> {
    
    validateOrganizationData(organizationData);
    const proposedOwner = await this.userService.findByUsername(organizationData.owner);

    if (!proposedOwner) {
      throw new Error(`User with username ${organizationData.owner} does not exist.`);
    }

    organizationData = {
      name: organizationData.name,
      owner: organizationData.owner,
      apiKeys: [{
        key: generateOrganizationApiKey(),
        scope: "ALL"
      }],
      members: []
    }
    
    const organization = await this.organizationRepository.create(organizationData);
    return organization;
  }

  async addApiKey(organizationId: string, keyScope: OrganizationApiKeyRole): Promise<void> {
    const apiKeyData: LeanApiKey = {
      key: generateOrganizationApiKey(),
      scope: keyScope
    }
    
    await this.organizationRepository.addApiKey(organizationId, apiKeyData);
  }

  async addMember(organizationId: string, username: string): Promise<void> {
    
    const newMember = await this.userService.findByUsername(username);

    if (!newMember) {
      throw new Error(`User with username ${username} does not exist.`);
    }
    
    await this.organizationRepository.addMember(organizationId, username);
  }

  async update(organizationId: string, updateData: any): Promise<void> {
    
    const organization = await this.organizationRepository.findById(organizationId);

    if (!organization) {
      throw new Error(`Organization with ID ${organizationId} does not exist.`);
    }

    if (updateData.name) {
      if (typeof updateData.name !== 'string'){
        throw new Error('INVALID DATA: Invalid organization name.');
      }

      organization.name = updateData.name;
    }

    if (updateData.owner) {
      const proposedOwner = await this.userService.findByUsername(updateData.owner);
      if (!proposedOwner) {
        throw new Error(`INVALID DATA: User with username ${updateData.owner} does not exist.`);
      }

      organization.owner = updateData.owner;
    }
    
    await this.organizationRepository.update(organizationId, updateData);
  }

  async removeApiKey(organizationId: string, apiKey: string): Promise<void> {
    await this.organizationRepository.removeApiKey(organizationId, apiKey);
  }

  async removeMember(organizationId: string, username: string): Promise<void> {
    await this.organizationRepository.removeMember(organizationId, username);
  }
}

export default OrganizationService;
