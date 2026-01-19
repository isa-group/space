import { LeanApiKey, LeanOrganization, OrganizationFilter } from '../../types/models/Organization';
import RepositoryBase from '../RepositoryBase';
import OrganizationMongoose from './models/OrganizationMongoose';

class OrganizationRepository extends RepositoryBase {
  
  async findAll(filters: OrganizationFilter): Promise<LeanOrganization[]> {
    const organizations = await OrganizationMongoose.find(filters).exec();
    return organizations.map(org => org.toObject() as unknown as LeanOrganization);
  }
  
  async findById(organizationId: string): Promise<LeanOrganization | null> {
    const organization = await OrganizationMongoose.findOne({ _id: organizationId }).populate('owner').exec();

    return organization ? organization.toObject() as unknown as LeanOrganization : null;
  }

  async findByOwner(owner: string): Promise<LeanOrganization | null> {
    const organization = await OrganizationMongoose.findOne({ owner }).exec();

    return organization ? organization.toObject() as unknown as LeanOrganization : null;
  }

  async create(organizationData: LeanOrganization): Promise<LeanOrganization> {
    const organization = await new OrganizationMongoose(organizationData).save();
    return organization.toObject() as unknown as LeanOrganization;
  }

  async addApiKey(organizationId: string, apiKeyData: LeanApiKey): Promise<void> {
    await OrganizationMongoose.updateOne(
      { _id: organizationId },
      { $push: { apiKeys: apiKeyData } }
    ).exec();
  }

  async addMember(organizationId: string, username: string): Promise<void> {
    await OrganizationMongoose.updateOne(
      { _id: organizationId },
      { $addToSet: { members: username } }
    ).exec();
  }

  async changeOwner(organizationId: string, newOwner: string): Promise<void> {
    await OrganizationMongoose.updateOne(
      { _id: organizationId },
      { owner: newOwner }
    ).exec();
  }

  async removeApiKey(organizationId: string, apiKey: string): Promise<void> {
    await OrganizationMongoose.updateOne(
      { _id: organizationId },
      { $pull: { apiKeys: { key: apiKey } } }
    ).exec();
  }

  async removeMember(organizationId: string, username: string): Promise<void> {
    await OrganizationMongoose.updateOne(
      { _id: organizationId },
      { $pull: { members: username } }
    ).exec();
  }
}

export default OrganizationRepository;