import container from '../config/container';
import { OrganizationApiKeyRole } from '../types/permissions';
import OrganizationRepository from '../repositories/mongoose/OrganizationRepository';
import { LeanApiKey, LeanOrganization, OrganizationFilter, OrganizationMember } from '../types/models/Organization';
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

  async create(organizationData: any, reqUser: any): Promise<LeanOrganization> {
    
    validateOrganizationData(organizationData);
    const proposedOwner = await this.userService.findByUsername(organizationData.owner);

    if (!proposedOwner) {
      throw new Error(`User with username ${organizationData.owner} does not exist.`);
    }

    if (proposedOwner.username !== reqUser.username && reqUser.role !== 'ADMIN') {
      throw new Error('Only admins can create organizations for other users.');
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

  async addApiKey(organizationId: string, keyScope: OrganizationApiKeyRole, reqUser: any): Promise<void> {
    
    const organization = await this.organizationRepository.findById(organizationId);

    if (!organization) {
      throw new Error(`Organization with ID ${organizationId} does not exist.`);
    }

    if (organization.owner !== reqUser.username && reqUser.role !== 'ADMIN' && !organization.members.filter(m => m.username && ["OWNER", "ADMIN", "MANAGER"].includes(m.role)).map(m => m.username).includes(reqUser.username)) {
      throw new Error('PERMISSION ERROR: Only SPACE admins or organization-level OWNER, ADMIN and MANAGER can add API keys to organizations they don\'t own.');
    }
    
    const apiKeyData: LeanApiKey = {
      key: generateOrganizationApiKey(),
      scope: keyScope
    }
    
    await this.organizationRepository.addApiKey(organizationId, apiKeyData);
  }

  async addMember(organizationId: string, organizationMember: OrganizationMember, reqUser: any): Promise<void> {
    
    if (!organizationMember.username || !organizationMember.role) {
      throw new Error('INVALID DATA: organizationMember must have username and role.');
    }

    const organization = await this.organizationRepository.findById(organizationId);

    if (!organization) {
      throw new Error(`Organization with ID ${organizationId} does not exist.`);
    }

    if (organization.owner !== reqUser.username && reqUser.role !== 'ADMIN' && !organization.members.filter(m => m.username && ["OWNER", "ADMIN", "MANAGER"].includes(m.role)).map(m => m.username).includes(reqUser.username)) {
      throw new Error('PERMISSION ERROR: Only SPACE admins or organization-level OWNER, ADMIN and MANAGER can add members to organizations they don\'t own.');
    }

    const newMember = await this.userService.findByUsername(organizationMember.username);

    if (!newMember) {
      throw new Error(`User with username ${organizationMember.username} does not exist.`);
    }
    
    await this.organizationRepository.addMember(organizationId, organizationMember);
  }

  async update(organizationId: string, updateData: any, reqUser: any): Promise<void> {
    
    const organization = await this.organizationRepository.findById(organizationId);

    if (!organization) {
      throw new Error(`Organization with ID ${organizationId} does not exist.`);
    }

    if (organization.owner !== reqUser.username && reqUser.role !== 'ADMIN' && !organization.members.filter(m => m.username && ["OWNER", "ADMIN", "MANAGER"].includes(m.role)).map(m => m.username).includes(reqUser.username)) {
      throw new Error('PERMISSION ERROR: Only SPACE admins or organization-level OWNER, ADMIN and MANAGER can update organizations.');
    }

    if (updateData.name) {
      if (typeof updateData.name !== 'string'){
        throw new Error('INVALID DATA: Invalid organization name.');
      }

      organization.name = updateData.name;
    }

    if (updateData.owner) {
      if (reqUser.role !== 'ADMIN' && organization.owner !== reqUser.username) {
        throw new Error('PERMISSION ERROR: Only SPACE admins or organization owners can change organization ownership.');
      }

      const proposedOwner = await this.userService.findByUsername(updateData.owner);
      if (!proposedOwner) {
        throw new Error(`INVALID DATA: User with username ${updateData.owner} does not exist.`);
      }

      organization.owner = updateData.owner;
    }
    
    await this.organizationRepository.update(organizationId, updateData);
  }

  async removeApiKey(organizationId: string, apiKey: string, reqUser: any): Promise<void> {
    const organization = await this.organizationRepository.findById(organizationId);
    
    if (!organization) {
      throw new Error(`Organization with ID ${organizationId} does not exist.`);
    }

    if (organization.owner !== reqUser.username && reqUser.role !== 'ADMIN' && !organization.members.filter(m => m.username && ["OWNER", "ADMIN", "MANAGER"].includes(m.role)).includes(reqUser.username)) {
      throw new Error('PERMISSION ERROR: Only SPACE admins or organization-level OWNER, ADMIN and MANAGER can remove API keys from organizations.');
    }
    
    await this.organizationRepository.removeApiKey(organizationId, apiKey);
  }

  async removeMember(organizationId: string, username: string, reqUser: any): Promise<void> {
    const organization = await this.organizationRepository.findById(organizationId);

    if (!organization) {
      throw new Error(`Organization with ID ${organizationId} does not exist.`);
    }

    if (organization.owner !== reqUser.username && reqUser.role !== 'ADMIN' && !organization.members.filter(m => m.username && ["OWNER", "ADMIN", "MANAGER"].includes(m.role)).includes(reqUser.username)) {
      throw new Error('PERMISSION ERROR: Only SPACE admins or organization-level OWNER, ADMIN and MANAGER can remove members from organizations.');
    }
    
    await this.organizationRepository.removeMember(organizationId, username);
  }
}

export default OrganizationService;
