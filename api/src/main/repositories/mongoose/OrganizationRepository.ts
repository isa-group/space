import { LeanApiKey, LeanOrganization, OrganizationFilter, OrganizationMember } from '../../types/models/Organization';
import RepositoryBase from '../RepositoryBase';
import OrganizationMongoose from './models/OrganizationMongoose';

class OrganizationRepository extends RepositoryBase {
  async find(filters: OrganizationFilter, limit?: number, offset?: number): Promise<LeanOrganization[]> {
    const query: any = {
      ...(filters.name ? { name: { $regex: filters.name, $options: 'i' } } : {}),
      ...(filters.owner ? { owner: filters.owner } : {}),
      ...(filters.default !== undefined ? { default: filters.default } : {}),
    };
    const organizations = await OrganizationMongoose.find(query).skip(offset || 0).limit(limit || 10).exec();

    return organizations.map(org => org.toObject() as unknown as LeanOrganization);
  }

  async count(filters: OrganizationFilter): Promise<number> {
    const query: any = {
      ...(filters.name ? { name: { $regex: filters.name, $options: 'i' } } : {}),
      ...(filters.owner ? { owner: filters.owner } : {}),
      ...(filters.default !== undefined ? { default: filters.default } : {}),
    };
    
    return await OrganizationMongoose.countDocuments(query).exec();
  }

  async findById(organizationId: string): Promise<LeanOrganization | null> {
    try {
      const organization = await OrganizationMongoose.findOne({ _id: organizationId })
        .populate({
          path: 'ownerDetails',
          select: '-password',
        })
        .exec();

      return organization ? (organization.toObject() as unknown as LeanOrganization) : null;
    } catch (error) {
      throw new Error("INVALID DATA: Invalid organization ID");
    }
  }

  async findByOwner(owner: string): Promise<LeanOrganization[]> {
    const organizations = await OrganizationMongoose.find({ owner }).exec();

    return organizations.map(org => {
      const obj = org.toObject() as any;
      return Object.assign({ id: org._id.toString() }, obj) as LeanOrganization;
    });
  }

  async findByUser(username: string): Promise<LeanOrganization[]> {
    const organizations = await OrganizationMongoose.find({
      $or: [
        { owner: username },
        { 'members.username': username }
      ]
    }).exec();

    return organizations.map(org => org.toObject() as unknown as LeanOrganization);
  }

  async findByApiKey(apiKey: string): Promise<LeanOrganization | null> {
    const organization = await OrganizationMongoose.findOne({
      'apiKeys.key': apiKey,
    })
      .populate({
        path: 'ownerDetails',
        select: '-password',
      })
      .exec();

    return organization ? (organization.toObject() as unknown as LeanOrganization) : null;
  }

  async create(organizationData: LeanOrganization): Promise<LeanOrganization> {
    const organization = await new OrganizationMongoose(organizationData).save();
    return organization.toObject() as unknown as LeanOrganization;
  }

  async addApiKey(organizationId: string, apiKeyData: LeanApiKey): Promise<number> {
    const result = await OrganizationMongoose.updateOne(
      { _id: organizationId },
      { $push: { apiKeys: apiKeyData } }
    ).exec();

    if (result.modifiedCount === 0) {
      throw new Error(
        `ApiKey with key ${apiKeyData.key} not found in organization ${organizationId}.`
      );
    }

    return result.modifiedCount;
  }

  async addMember(organizationId: string, organizationMember: OrganizationMember): Promise<number> {
    const result = await OrganizationMongoose.updateOne(
      { _id: organizationId },
      { $addToSet: { members: organizationMember } }
    ).exec();

    if (result.modifiedCount === 0) {
      throw new Error(
        `Member with username ${organizationMember.username} not found in organization ${organizationId}.`
      );
    }

    return result.modifiedCount;
  }

  async updateMemberRole(organizationId: string, username: string, role: string): Promise<number> {
    const result = await OrganizationMongoose.updateOne(
      { _id: organizationId, 'members.username': username },
      { $set: { 'members.$.role': role } }
    ).exec();

    if (result.modifiedCount === 0) {
      throw new Error(
        `INVALID DATA: Member with username ${username} not found in organization ${organizationId}.`
      );
    }

    return result.modifiedCount;
  }

  async changeOwner(organizationId: string, newOwner: string): Promise<number> {
    const result = await OrganizationMongoose.updateOne(
      { _id: organizationId },
      { owner: newOwner }
    ).exec();

    if (result.modifiedCount === 0) {
      throw new Error(`Organization with id ${organizationId} not found or no changes made.`);
    }

    return result.modifiedCount;
  }

  async update(organizationId: string, updateData: any): Promise<number> {
    const result = await OrganizationMongoose.updateOne(
      { _id: organizationId },
      { $set: updateData }
    ).exec();

    if (result.modifiedCount === 0) {
      throw new Error(`Organization with id ${organizationId} not found or no changes made.`);
    }

    return result.modifiedCount;
  }

  async removeApiKey(organizationId: string, apiKey: string): Promise<number> {
    const result = await OrganizationMongoose.updateOne(
      { _id: organizationId },
      { $pull: { apiKeys: { key: apiKey } } }
    ).exec();

    if (result.modifiedCount === 0) {
      throw new Error(`ApiKey with key ${apiKey} not found in organization ${organizationId}.`);
    }

    return result.modifiedCount;
  }

  async removeMember(organizationId: string, username: string): Promise<number> {
    const result = await OrganizationMongoose.updateOne(
      { _id: organizationId },
      { $pull: { members: {username: username} } }
    ).exec();

    if (result.modifiedCount === 0) {
      throw new Error(
        `Member with username ${username} not found in organization ${organizationId}.`
      );
    }

    return result.modifiedCount;
  }

  async delete(organizationId: string): Promise<number> {
    const result = await OrganizationMongoose.deleteOne({ _id: organizationId }).exec();

    if (result.deletedCount === 0) {
      throw new Error(`Organization with id ${organizationId} not found.`);
    }

    return result.deletedCount;
  }
}

export default OrganizationRepository;
