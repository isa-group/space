import container from '../config/container';
import { OrganizationApiKeyRole } from '../types/permissions';
import OrganizationRepository from '../repositories/mongoose/OrganizationRepository';
import {
  LeanApiKey,
  LeanOrganization,
  OrganizationFilter,
  OrganizationMember,
} from '../types/models/Organization';
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

  async findByApiKey(
    apiKey: string
  ): Promise<{ organization: LeanOrganization; apiKeyData: LeanApiKey }> {
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
      apiKeyData,
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
      apiKeys: [
        {
          key: generateOrganizationApiKey(),
          scope: 'ALL',
        },
      ],
      members: [],
    };

    const organization = await this.organizationRepository.create(organizationData);
    return organization;
  }

  async addApiKey(
    organizationId: string,
    keyScope: OrganizationApiKeyRole,
    reqUser: any
  ): Promise<void> {
    // 1. Basic Input Validation
    const validScopes = ['ALL', 'MANAGEMENT', 'EVALUATION'];
    if (!keyScope || !validScopes.includes(keyScope)) {
      throw new Error(`INVALID DATA: keyScope must be one of ${validScopes.join(', ')}.`);
    }

    const organization = await this.organizationRepository.findById(organizationId);

    if (!organization) {
      throw new Error(`Organization with ID ${organizationId} does not exist.`);
    }

    // 2. Identify roles and context once (O(n) search)
    const isSpaceAdmin = reqUser.role === 'ADMIN';
    const isOwner = organization.owner === reqUser.username;

    // Find the requester within the organization members
    const reqMember = organization.members.find(m => m.username === reqUser.username);
    const reqMemberRole = reqMember?.role;

    // Define privilege tiers
    const hasManagerPrivileges = ['OWNER', 'ADMIN', 'MANAGER'].includes(reqMemberRole || '');
    const hasHighPrivileges = ['OWNER', 'ADMIN'].includes(reqMemberRole || '');

    // --- PERMISSION CHECKS ---

    // Rule 1: General permission to add API keys
    // Requires Space Admin, Org Owner, or Org Manager+
    if (!isSpaceAdmin && !isOwner && !hasManagerPrivileges) {
      throw new Error(
        'PERMISSION ERROR: Only SPACE admins or organization-level OWNER, ADMIN and MANAGER can add API keys.'
      );
    }

    // Rule 2: Protection for 'ALL' scope keys
    // 'ALL' scope keys are powerful; only Space Admins or Org Owner/Admins can create them.
    if (keyScope === 'ALL' && !isSpaceAdmin && !isOwner && !hasHighPrivileges) {
      throw new Error(
        'PERMISSION ERROR: Only SPACE admins or organization-level OWNER and ADMIN can add API keys with ALL scope.'
      );
    }

    // 3. Data Generation & Persistence
    // We generate the key only after all permissions are verified
    const apiKeyData: LeanApiKey = {
      key: generateOrganizationApiKey(),
      scope: keyScope,
    };

    await this.organizationRepository.addApiKey(organizationId, apiKeyData);
  }

  async addMember(
    organizationId: string,
    organizationMember: OrganizationMember,
    reqUser: any
  ): Promise<void> {
    // 1. Basic validation
    if (!organizationMember.username || !organizationMember.role) {
      throw new Error('INVALID DATA: organizationMember must have username and role.');
    }

    const organization = await this.organizationRepository.findById(organizationId);

    if (!organization) {
      throw new Error(`Organization with ID ${organizationId} does not exist.`);
    }

    // 2. Identify roles and context once
    const isSpaceAdmin = reqUser.role === 'ADMIN';
    const isOwner = organization.owner === reqUser.username;

    // Locate the requester within the organization's member list
    const reqMember = organization.members.find(m => m.username === reqUser.username);
    const reqMemberRole = reqMember?.role;

    // Define privilege tiers
    const hasManagerPrivileges = ['OWNER', 'ADMIN', 'MANAGER'].includes(reqMemberRole || '');
    const hasHighPrivileges = ['OWNER', 'ADMIN'].includes(reqMemberRole || '');

    // --- PERMISSION CHECKS ---

    // Rule 1: General permission to add members
    // Requires Space Admin, Org Owner, or Org Manager+
    if (!isSpaceAdmin && !isOwner && !hasManagerPrivileges) {
      throw new Error(
        'PERMISSION ERROR: Only SPACE admins or organization-level OWNER, ADMIN and MANAGER can add members.'
      );
    }

    // Rule 2: Escalated permission for adding High-Level roles
    // Only Space Admins or Org Owner/Admins can grant OWNER or ADMIN roles
    const targetIsHighLevel = ['OWNER', 'ADMIN'].includes(organizationMember.role);
    if (targetIsHighLevel && !isSpaceAdmin && !isOwner && !hasHighPrivileges) {
      throw new Error(
        'PERMISSION ERROR: Only SPACE admins or organization-level OWNER/ADMIN can add high-level members.'
      );
    }

    // 3. External dependency check (User existence)
    const userToAssign = await this.userService.findByUsername(organizationMember.username);

    if (!userToAssign) {
      throw new Error(`User with username ${organizationMember.username} does not exist.`);
    }

    // 4. Persistence
    await this.organizationRepository.addMember(organizationId, organizationMember);
  }

  async update(organizationId: string, updateData: any, reqUser: any): Promise<void> {
    const organization = await this.organizationRepository.findById(organizationId);

    if (!organization) {
      throw new Error(`Organization with ID ${organizationId} does not exist.`);
    }

    if (
      organization.owner !== reqUser.username &&
      reqUser.role !== 'ADMIN' &&
      !organization.members
        .filter(m => m.username && ['OWNER', 'ADMIN', 'MANAGER'].includes(m.role))
        .map(m => m.username)
        .includes(reqUser.username)
    ) {
      throw new Error(
        'PERMISSION ERROR: Only SPACE admins or organization-level OWNER, ADMIN and MANAGER can update organizations.'
      );
    }

    if (updateData.name) {
      if (typeof updateData.name !== 'string') {
        throw new Error('INVALID DATA: Invalid organization name.');
      }

      organization.name = updateData.name;
    }

    if (updateData.owner) {
      if (reqUser.role !== 'ADMIN' && organization.owner !== reqUser.username) {
        throw new Error(
          'PERMISSION ERROR: Only SPACE admins or organization owners can change organization ownership.'
        );
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

    // 1. Identify the specific API key to be removed
    const targetKey = organization.apiKeys.find(k => k.key === apiKey);
    if (!targetKey) {
      throw new Error(`API Key not found in organization ${organizationId}.`);
    }

    // 2. Identify roles and context (O(n) search)
    const isSpaceAdmin = reqUser.role === 'ADMIN';
    const isOwner = organization.owner === reqUser.username;

    const reqMember = organization.members.find(m => m.username === reqUser.username);
    const reqMemberRole = reqMember?.role;

    // Define privilege tiers
    const hasManagerPrivileges = ['OWNER', 'ADMIN', 'MANAGER'].includes(reqMemberRole || '');
    const hasHighPrivileges = ['OWNER', 'ADMIN'].includes(reqMemberRole || '');

    // --- PERMISSION CHECKS ---

    // Rule 1: General removal permission
    // At minimum, you must be an Org Manager, Org Owner, or Space Admin to remove any key.
    if (!isSpaceAdmin && !isOwner && !hasManagerPrivileges) {
      throw new Error(
        'PERMISSION ERROR: Only SPACE admins or organization-level OWNER, ADMIN and MANAGER can remove API keys.'
      );
    }

    // Rule 2: Protection for 'ALL' scope keys
    // If the key has 'ALL' scope, Managers are NOT allowed to remove it.
    if (targetKey.scope === 'ALL' && !isSpaceAdmin && !isOwner && !hasHighPrivileges) {
      throw new Error(
        'PERMISSION ERROR: Only SPACE admins or organization-level OWNER and ADMIN can remove API keys with ALL scope.'
      );
    }

    // 3. Execution
    await this.organizationRepository.removeApiKey(organizationId, apiKey);
  }

  async removeMember(organizationId: string, username: string, reqUser: any): Promise<void> {
    const organization = await this.organizationRepository.findById(organizationId);

    if (!organization) {
      throw new Error(`Organization with ID ${organizationId} does not exist.`);
    }

    // 1. Identify key roles and context once (O(n) complexity instead of multiple loops)
    const isSpaceAdmin = reqUser.role === 'ADMIN';
    const isOwner = organization.owner === reqUser.username;

    // Find the requester and the target member within the organization's member list
    const reqMember = organization.members.find(m => m.username === reqUser.username);
    const targetMember = organization.members.find(m => m.username === username);

    const reqMemberRole = reqMember?.role;
    const targetMemberRole = targetMember?.role;

    // 2. Define permission flags based on hierarchy
    // Managers and above (Owner, Admin, Manager)
    const hasManagerPrivileges = ['OWNER', 'ADMIN', 'MANAGER'].includes(reqMemberRole || '');
    // High-level staff (Owner, Admin)
    const hasHighPrivileges = ['OWNER', 'ADMIN'].includes(reqMemberRole || '');

    // --- VALIDATION RULES ---

    // Rule 1: General removal permission
    // Only Space Admins, the Organization Owner, or Org-level Managers and above can perform removals.
    if (!isSpaceAdmin && !isOwner && !hasManagerPrivileges) {
      throw new Error(
        'PERMISSION ERROR: Only SPACE admins or organization-level OWNER, ADMIN and MANAGER can remove members.'
      );
    }

    // Rule 2: Protection for ADMIN members
    // Admin members are protected; they can only be removed by Space Admins, the Owner, or other Org Admins.
    if (targetMemberRole === 'ADMIN') {
      if (!isSpaceAdmin && !isOwner && !hasHighPrivileges) {
        throw new Error(
          'PERMISSION ERROR: Only SPACE admins or organization-level OWNER/ADMIN can remove ADMIN members.'
        );
      }
    }

    // Rule 3: Evaluator restrictions
    // Evaluators do not have management permissions; they can only opt-out (remove themselves).
    if (reqMemberRole === 'EVALUATOR' && username !== reqUser.username) {
      throw new Error('PERMISSION ERROR: Organization EVALUATOR can only remove themselves.');
    }

    // 3. Execute the atomic removal operation in the database
    await this.organizationRepository.removeMember(organizationId, username);
  }
}

export default OrganizationService;
