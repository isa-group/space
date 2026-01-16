import { LeanApiKey, LeanOrganization } from '../../types/models/Organization';
import RepositoryBase from '../RepositoryBase';
import OrganizationMongoose from './models/OrganizationMongoose';

class OrganizationRepository extends RepositoryBase {
  async findById(organizationId: string, ownerId: string): Promise<LeanOrganization | null> {
    const organization = await OrganizationMongoose.findOne({ _id: organizationId, owner: ownerId }).populate('owner').exec();

    return organization ? organization.toObject() as unknown as LeanOrganization : null;
  }

  async findByNameAndOwnerId(name: string, ownerId: string): Promise<LeanOrganization | null> {
    const organization = await OrganizationMongoose.findOne({ name, owner: ownerId }).populate('owner').exec();

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

  async addMember(organizationId: string, userId: string): Promise<void> {
    await OrganizationMongoose.updateOne(
      { _id: organizationId },
      { $addToSet: { members: userId } }
    ).exec();
  }

  async changeOwner(organizationId: string, newOwnerId: string): Promise<void> {
    await OrganizationMongoose.updateOne(
      { _id: organizationId },
      { owner: newOwnerId }
    ).exec();
  }

  async removeApiKey(organizationId: string, apiKey: string): Promise<void> {
    await OrganizationMongoose.updateOne(
      { _id: organizationId },
      { $pull: { apiKeys: { key: apiKey } } }
    ).exec();
  }

  async removeMember(organizationId: string, userId: string): Promise<void> {
    await OrganizationMongoose.updateOne(
      { _id: organizationId },
      { $pull: { members: userId } }
    ).exec();
  }
}

export default OrganizationRepository;