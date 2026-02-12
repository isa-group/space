import { LeanApiKey, LeanOrganization, OrganizationMember } from '../../../main/types/models/Organization';
import { createTestUser } from '../users/userTestUtils';
import OrganizationMongoose from '../../../main/repositories/mongoose/models/OrganizationMongoose';
import container from '../../../main/config/container';

// Create a test user directly in the database
export const createTestOrganization = async (owner?: string): Promise<LeanOrganization> => {
  
  if (!owner){
    owner = (await createTestUser('ADMIN')).username;
  }
  
  const organizationData = {
    name: `test_org_${Date.now()}`,
    owner: owner,
    apiKeys: [],
    members: [],
  };

  // Create user directly in the database
  const organization = new OrganizationMongoose(organizationData);
  await organization.save();
  
  return organization.toObject();
};

export const addApiKeyToOrganization = async (orgId: string, apiKey: LeanApiKey): Promise<void> => {
  const organizationRepository = container.resolve('organizationRepository');
  
  await organizationRepository.addApiKey(orgId, apiKey);
};

export const addMemberToOrganization = async (orgId: string, organizationMember: OrganizationMember): Promise<void> => {
  if (!organizationMember.username || !organizationMember.role){
    throw new Error('Both username and role are required to add a member to an organization.');
  }
  
  const organizationRepository = container.resolve('organizationRepository');
  
  try{
    await organizationRepository.addMember(orgId, organizationMember);
  }catch (error){
    console.log(`Error adding member ${organizationMember.username} to organization ${orgId}:`, error);
  }
};

export const removeApiKeyFromOrganization = async (orgId: string, apiKey: string): Promise<void> => {
  const organizationRepository = container.resolve('organizationRepository');
  
  await organizationRepository.removeApiKey(orgId, apiKey);
};

export const removeMemberFromOrganization = async (orgId: string, username: string): Promise<void> => {
  const organizationRepository = container.resolve('organizationRepository');
  
  await organizationRepository.removeMember(orgId, username);
};

export const deleteTestOrganization = async (orgId: string): Promise<void> => {
  await OrganizationMongoose.deleteOne({ _id: orgId });
};